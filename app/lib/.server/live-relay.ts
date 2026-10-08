/**
 * Cloudflare Worker WebSocket relay for Gemini Live via THEOREM `runSession`.
 *
 * Bridges the browser client WebSocket (PCM mic stream + UI tools)
 * to a gated live session. The browser names a call the model made; the
 * session holds its input and gate, so the relay only forwards.
 *
 * @module
 */

import {
	defaultKernelScope,
	errorKind,
	type KernelScope,
	type LexiconOverrides,
	type LiveSession,
	type Profile,
	publicError,
	TheoremError,
} from '@theoremjs/agents';
import {
	type LiveOpenMessage,
	liveSessionOpen,
	parseLiveOpenMessage,
} from '@theoremjs/react/server';
import type { StudioLiveDraftMessage, StudioTraceLine } from '@theoremjs/studio';
import { attachStudioLiveSession } from '@theoremjs/studio/browser';
import { ensureKernelInitialized } from './kernel-init';
import { studioScope } from './studio-register';
import { studioProviders, studioTraces } from './studio-turn';

export type LiveRelayEnv = {
	GEMINI_API_KEY_FREE_A?: string;
	GEMINI_API_KEY_FREE_B?: string;
	GEMINI_API_KEY_FREE_C?: string;
};

/**
 * Cloudflare Workers outbound WebSocket via fetch upgrade
 * (preferred over `new WebSocket` on the Workers runtime).
 */
async function openCloudflareUpstreamWebSocket(url: string): Promise<WebSocket> {
	const httpsUpstreamUrl = url.replace(/^wss:\/\//i, 'https://');
	const upstreamResp = await fetch(httpsUpstreamUrl, {
		headers: { Upgrade: 'websocket' },
	});
	const ws = upstreamResp.webSocket;
	if (!ws) {
		throw new Error(`Upstream WebSocket upgrade failed with status ${String(upstreamResp.status)}`);
	}
	ws.binaryType = 'arraybuffer';
	ws.accept();
	return ws;
}

function resolveGeminiApiKey(env: LiveRelayEnv): string | undefined {
	return (
		env.GEMINI_API_KEY_FREE_A?.trim() ||
		env.GEMINI_API_KEY_FREE_B?.trim() ||
		env.GEMINI_API_KEY_FREE_C?.trim()
	);
}

/** A relay failure as the browser reads it: the profile's wording and the kind, never the detail. */
function errorBody(err: unknown, lexicon?: LexiconOverrides): { error: string; errorKind: string } {
	return { error: publicError(err, lexicon), errorKind: errorKind(err) };
}

function errorEnvelope(err: unknown, lexicon?: LexiconOverrides): string {
	return JSON.stringify({ type: 'error', ...errorBody(err, lexicon) });
}

async function openLiveSession(
	scope: KernelScope,
	profileId: string,
	env: LiveRelayEnv,
	metadata: Record<string, string>,
	open: LiveOpenMessage,
	openWebSocket: (url: string) => Promise<WebSocket>,
): Promise<LiveSession> {
	const { vault } = studioProviders(env, scope.profiles.get(profileId), scope.providers);
	if (!vault || !Object.values(vault).some(Boolean))
		throw new TheoremError('auth', 'No demo Gemini credentials configured.'); // lexicon-exempt: internal diagnostic
	return scope.runSession(
		{ ...liveSessionOpen(open), profile: profileId, metadata },
		{ vault, openWebSocket },
	);
}

/** Setup failures reach the browser like session failures: over the socket, worded, with their kind. */
function failRelay(serverWs: WebSocket, err: unknown, lexicon?: LexiconOverrides): void {
	serverWs.send(errorEnvelope(err, lexicon));
	try {
		serverWs.close(1011, 'session error');
	} catch {
		/* ignore */
	}
}

/** The call's open message, the browser's first; a failure if it is malformed or the socket closes first. */
function openMessage(serverWs: WebSocket): Promise<LiveOpenMessage> {
	return new Promise((resolve, reject) => {
		const onMessage = (event: MessageEvent) => {
			serverWs.removeEventListener('close', onClose);
			try {
				resolve(parseLiveOpenMessage(typeof event.data === 'string' ? event.data : ''));
			} catch (err) {
				reject(err instanceof Error ? err : new Error(String(err)));
			}
		};
		const onClose = () => {
			serverWs.removeEventListener('message', onMessage);
			// lexicon-exempt: internal diagnostic; the user reads error.network
			reject(new TheoremError('network', 'Live socket closed before its first message'));
		};
		serverWs.addEventListener('message', onMessage, { once: true });
		serverWs.addEventListener('close', onClose, { once: true });
	});
}

function isDraftMessage(raw: unknown): raw is StudioLiveDraftMessage {
	if (!raw || typeof raw !== 'object') return false;
	const record = raw as Record<string, unknown>;
	return (
		record.type === 'draft' &&
		Boolean(record.profile) &&
		typeof record.profile === 'object' &&
		Array.isArray(record.customTools)
	);
}

/**
 * The scope and profile a call runs on. `?profile=` names a profile the site
 * registered; without it, the call's open message carries a studio draft,
 * which runs on a scope of its own that no other call can reach.
 */
async function resolveLiveProfile(
	open: LiveOpenMessage,
	profileParam: string | null,
): Promise<{ scope: KernelScope; profile: Profile }> {
	if (profileParam) {
		return { scope: defaultKernelScope, profile: defaultKernelScope.profiles.get(profileParam) };
	}
	const message = open.host;
	if (!isDraftMessage(message)) {
		throw new TheoremError(
			'request',
			// lexicon-exempt: internal diagnostic; the user reads error.request
			'A live call without ?profile= must open with a draft message',
		);
	}
	return studioScope(message.profile, message.customTools, undefined);
}

async function relayLiveSession(
	serverWs: WebSocket,
	profileParam: string | null,
	env: LiveRelayEnv,
): Promise<void> {
	// The call's id, picked here and sent to the browser on `ready`.
	const sessionId = globalThis.crypto.randomUUID();
	// Each record goes to the browser as the session writes it.
	const traces = studioTraces.route((record) => {
		if (serverWs.readyState !== WebSocket.OPEN) return;
		const line: StudioTraceLine = { type: 'trace', record };
		serverWs.send(JSON.stringify(line));
	});
	let lexicon: LexiconOverrides | undefined;
	let profileId: string;
	let session: LiveSession;
	try {
		// Listen for the open message before anything waits: the browser sends it as the socket opens.
		const open = await openMessage(serverWs);
		const { scope, profile } = await resolveLiveProfile(open, profileParam);
		profileId = profile.id;
		lexicon = profile.lexicon;
		if (profile.type !== 'live') {
			// lexicon-exempt: internal diagnostic; the user reads error.config
			throw new TheoremError('config', `Profile '${profile.id}' is not type 'live'`);
		}
		const apiKey = resolveGeminiApiKey(env);
		if (!apiKey) {
			throw new TheoremError(
				'config',
				// lexicon-exempt: internal diagnostic; the user reads error.config
				'No Gemini API key configured (GEMINI_API_KEY_FREE_A/B/C)',
			);
		}
		session = await openLiveSession(
			scope,
			profileId,
			env,
			traces.metadata,
			open,
			openCloudflareUpstreamWebSocket,
		);
	} catch (err) {
		traces.close();
		failRelay(serverWs, err, lexicon);
		return;
	}

	// The browser may have left while the session opened; its close event has already fired.
	if (serverWs.readyState !== WebSocket.OPEN) {
		await session.close('client disconnected');
		traces.close();
		return;
	}
	// A queued client call waits behind tryAgent (up to 60s), so the default 20s watchdog is too short.
	void attachStudioLiveSession(serverWs, session, profileId, sessionId, traces, lexicon, {
		clientCallTimeoutMs: 90_000,
	});
}

/** Handle incoming WebSocket upgrade request and spawn duplex relay pipe. */
export function handleLiveRelay(request: Request, env: LiveRelayEnv): Response {
	if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
		return new Response('WebSocket upgrade endpoint for THEOREM Gemini Live relay.', {
			status: 426,
			headers: { 'content-type': 'text/plain', Upgrade: 'websocket' },
		});
	}

	ensureKernelInitialized();

	// Cloudflare Workers duplex pair for browser ↔ worker relay. Upgrade first: a browser
	// WebSocket never reads an HTTP error body, so every failure travels as an error envelope.
	const [clientWs, serverWs] = Object.values(new WebSocketPair());
	serverWs.accept();
	void relayLiveSession(serverWs, new URL(request.url).searchParams.get('profile'), env);

	return new Response(null, { status: 101, webSocket: clientWs });
}
