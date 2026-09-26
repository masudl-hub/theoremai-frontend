/**
 * Cloudflare Worker WebSocket relay for Gemini Live via THEOREM `runSession`.
 *
 * Bridges the browser client WebSocket (PCM mic stream + UI tools)
 * to a gated live session. Prefers `LiveSession.executeTool` for registry
 * tools; `sendToolResponse(s)` remain an escape hatch for non-registry relays.
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
} from '@theoremai/agents';
import { forClient, forClientEvents } from '@theoremai/agents/host';
import type { ToolCredential } from '@theoremai/agents/kernel';
import type {
	PlaygroundLiveDraftMessage,
	PlaygroundTraceLine,
	PlaygroundTraceRoute,
} from '@theoremai/playground';
import { parseLiveRelayClientMessage } from '../types/live-messages';
import { ensureKernelInitialized } from './kernel-init';
import { playgroundScope } from './playground-register';
import {
	closePlaygroundSteerInbox,
	consumePlaygroundSteerWithRetry,
	newPlaygroundSteerInboxId,
	openPlaygroundSteerInbox,
} from './playground-steer';
import { playgroundTraces } from './playground-turn';

export type LiveRelayEnv = {
	GEMINI_API_KEY_FREE_A?: string;
	GEMINI_API_KEY_FREE_B?: string;
	GEMINI_API_KEY_FREE_C?: string;
};

/** Convert binary PCM chunks to base64 for Gemini Live realtime input framing. */
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

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
function errorEnvelope(err: unknown, lexicon?: LexiconOverrides): string {
	return JSON.stringify({
		type: 'error',
		error: publicError(err, lexicon),
		errorKind: errorKind(err),
	});
}

function pipeBrowserToSession(
	serverWs: WebSocket,
	session: LiveSession,
	lexicon?: LexiconOverrides,
): void {
	serverWs.addEventListener('message', (event: MessageEvent) => {
		try {
			if (typeof event.data === 'string') {
				const msg = parseLiveRelayClientMessage(JSON.parse(event.data) as unknown);
				if (msg?.type === 'audio') {
					void session.sendAudio({ data: msg.data, mimeType: 'audio/pcm;rate=16000' });
					return;
				}
				if (msg?.type === 'video') {
					void session.sendVideo({
						data: msg.data,
						mimeType: msg.mimeType ?? 'image/jpeg',
					});
					return;
				}
				if (msg?.type === 'text') {
					void session.sendText(msg.text);
					return;
				}
				if (msg?.type === 'executeTool') {
					void (async () => {
						try {
							const result = await session.executeTool({
								name: msg.name,
								callId: msg.callId,
								input: msg.input,
								resume: msg.resume,
								credentials: msg.credentials as Record<string, ToolCredential> | undefined,
							});
							serverWs.send(
								JSON.stringify({
									type: 'executeToolResult',
									callId: msg.callId,
									name: msg.name,
									...(result.gated
										? { status: 'gated', gate: result.gated }
										: {
												status: 'complete',
												output:
													result.outputRaw ??
													result.outputModel?.data ??
													result.outputModel ??
													(result.failure
														? { error: result.failure.message, code: result.failure.code }
														: { success: true }),
												awaiting: result.awaiting,
												failure: result.failure,
											}),
								}),
							);
						} catch (err) {
							serverWs.send(
								JSON.stringify({
									type: 'executeToolResult',
									callId: msg.callId,
									name: msg.name,
									status: 'complete',
									output: { error: publicError(err, lexicon) },
								}),
							);
						}
					})();
					return;
				}
				if (msg?.type === 'toolResponse') {
					// Escape hatch — skips session stages; prefer executeTool.
					session.sendToolResponse(msg.id, msg.name, msg.output);
					return;
				}
				if (msg?.type === 'toolResponses') {
					session.sendToolResponses(msg.responses);
				}
				return;
			}
			if (event.data instanceof ArrayBuffer || event.data instanceof Uint8Array) {
				void session.sendAudio({
					data: bufferToBase64(event.data),
					mimeType: 'audio/pcm;rate=16000',
				});
			}
		} catch (err) {
			serverWs.send(errorEnvelope(err, lexicon));
		}
	});
}

async function pipeSessionToBrowser(
	serverWs: WebSocket,
	session: LiveSession,
	profileId: string,
	sessionId: string,
	traces: PlaygroundTraceRoute,
	lexicon?: LexiconOverrides,
): Promise<void> {
	serverWs.send(JSON.stringify({ type: 'ready', profile: profileId, sessionId }));
	try {
		for await (const event of session.events()) {
			if (event.type === 'error') {
				// The session worded it with the profile's lexicon; forClient drops the builder detail.
				serverWs.send(JSON.stringify(forClient(event)));
				try {
					serverWs.close(1011, 'session error');
				} catch {
					/* ignore */
				}
				return;
			}
			serverWs.send(JSON.stringify({ type: 'events', events: forClientEvents([event]) }));
		}
	} catch (err) {
		serverWs.send(errorEnvelope(err, lexicon));
	} finally {
		// The events loop ends after the session's root record is written.
		traces.close();
		await closePlaygroundSteerInbox(sessionId);
		try {
			serverWs.close(1000, 'session ended');
		} catch {
			/* ignore */
		}
	}
}

async function openLiveSession(
	scope: KernelScope,
	profileId: string,
	env: LiveRelayEnv,
	apiKey: string,
	sessionId: string,
	metadata: Record<string, string>,
	openWebSocket: (url: string) => Promise<WebSocket>,
): Promise<LiveSession> {
	await openPlaygroundSteerInbox(sessionId);
	return scope.runSession(
		{
			profile: profileId,
			metadata,
			onStage: async ({ stage }) => {
				if (stage !== 'pre_turn' && stage !== 'post_tool' && stage !== 'before_end') {
					return;
				}
				const inject = await consumePlaygroundSteerWithRetry(sessionId);
				return inject?.length ? { inject } : undefined;
			},
		},
		{
			gemini: {
				vault: {
					slotA: apiKey,
					slotB: env.GEMINI_API_KEY_FREE_B?.trim(),
					slotC: env.GEMINI_API_KEY_FREE_C?.trim(),
					// The playground never spends on a paid key, so a quota refusal has nowhere to overflow.
					paid: undefined,
				},
			},
			openWebSocket,
		},
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

/** The browser's first message, or a failure if the socket closes before sending one. */
function firstMessage(serverWs: WebSocket): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const onMessage = (event: MessageEvent) => {
			serverWs.removeEventListener('close', onClose);
			try {
				resolve(typeof event.data === 'string' ? (JSON.parse(event.data) as unknown) : undefined);
			} catch (err) {
				// lexicon-exempt: internal diagnostic; the user reads error.request
				reject(new TheoremError('request', 'Live first message is not JSON', { cause: err }));
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

function isDraftMessage(raw: unknown): raw is PlaygroundLiveDraftMessage {
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
 * registered; without it, the call's first message carries a playground draft,
 * which runs on a scope of its own that no other call can reach.
 */
async function resolveLiveProfile(
	serverWs: WebSocket,
	profileParam: string | null,
): Promise<{ scope: KernelScope; profile: Profile }> {
	if (profileParam) {
		return { scope: defaultKernelScope, profile: defaultKernelScope.profiles.get(profileParam) };
	}
	const message = await firstMessage(serverWs);
	if (!isDraftMessage(message)) {
		throw new TheoremError(
			'request',
			// lexicon-exempt: internal diagnostic; the user reads error.request
			'A live call without ?profile= must open with a draft message',
		);
	}
	return playgroundScope(message.profile, message.customTools, undefined);
}

async function relayLiveSession(
	serverWs: WebSocket,
	profileParam: string | null,
	env: LiveRelayEnv,
): Promise<void> {
	const sessionId = newPlaygroundSteerInboxId();
	// Each record goes to the browser as the session writes it.
	const traces = playgroundTraces.route((record) => {
		if (serverWs.readyState !== WebSocket.OPEN) return;
		const line: PlaygroundTraceLine = { type: 'trace', record };
		serverWs.send(JSON.stringify(line));
	});
	let lexicon: LexiconOverrides | undefined;
	let profileId: string;
	let session: LiveSession;
	try {
		const { scope, profile } = await resolveLiveProfile(serverWs, profileParam);
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
			apiKey,
			sessionId,
			traces.metadata,
			openCloudflareUpstreamWebSocket,
		);
	} catch (err) {
		traces.close();
		await closePlaygroundSteerInbox(sessionId);
		failRelay(serverWs, err, lexicon);
		return;
	}

	// The browser may have left while the session opened; its close event has already fired.
	if (serverWs.readyState !== WebSocket.OPEN) {
		await session.close('client disconnected');
		traces.close();
		await closePlaygroundSteerInbox(sessionId);
		return;
	}
	pipeBrowserToSession(serverWs, session, lexicon);
	serverWs.addEventListener('close', () => {
		void session.close('client disconnected');
		void closePlaygroundSteerInbox(sessionId);
	});
	void pipeSessionToBrowser(serverWs, session, profileId, sessionId, traces, lexicon);
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
