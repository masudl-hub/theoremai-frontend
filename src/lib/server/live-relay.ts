/**
 * Cloudflare Worker WebSocket relay for Gemini Live via THEORUM `runSession`.
 *
 * Bridges the browser client WebSocket (PCM mic stream + UI tools)
 * to a gated live session. Outbound canary/egress and inbound text prep
 * are owned by `runSession` — this host only pipes sockets and tool replies.
 *
 * @module
 */

import { getProfile, type LiveSession, publicError, runSession } from 'theorum';
import { forClientEvents } from 'theorum/host';
import { parseLiveRelayClientMessage } from '$lib/types/live-messages';
import { ensureKernelInitialized } from './kernel-init';
import { TH30_PROFILE_ID } from './th30';

export type LiveRelayEnv = {
	GEMINI_API_KEY?: string;
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
	const ws = (upstreamResp as unknown as { webSocket?: WebSocket & { accept(): void } }).webSocket;
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
		env.GEMINI_API_KEY?.trim() ||
		env.GEMINI_API_KEY_FREE_B?.trim() ||
		env.GEMINI_API_KEY_FREE_C?.trim()
	);
}

function pipeBrowserToSession(serverWs: WebSocket, session: LiveSession): void {
	serverWs.addEventListener('message', (event: MessageEvent) => {
		try {
			if (typeof event.data === 'string') {
				const msg = parseLiveRelayClientMessage(JSON.parse(event.data) as unknown);
				if (msg?.type === 'audio') {
					session.sendAudio({ data: msg.data, mimeType: 'audio/pcm;rate=16000' });
					return;
				}
				if (msg?.type === 'video') {
					session.sendVideo({
						data: msg.data,
						mimeType: msg.mimeType ?? 'image/jpeg',
					});
					return;
				}
				if (msg?.type === 'text') {
					session.sendText(msg.text);
					return;
				}
				if (msg?.type === 'toolResponse') {
					session.sendToolResponse(msg.id, msg.name, msg.output);
					return;
				}
				if (msg?.type === 'toolResponses') {
					session.sendToolResponses(msg.responses);
				}
				return;
			}
			if (event.data instanceof ArrayBuffer || event.data instanceof Uint8Array) {
				session.sendAudio({
					data: bufferToBase64(event.data),
					mimeType: 'audio/pcm;rate=16000',
				});
			}
		} catch (err) {
			serverWs.send(
				JSON.stringify({
					type: 'error',
					error: publicError(err),
				}),
			);
		}
	});
}

async function pipeSessionToBrowser(
	serverWs: WebSocket,
	session: LiveSession,
	profileId: string,
): Promise<void> {
	serverWs.send(JSON.stringify({ type: 'ready', profile: profileId }));
	try {
		for await (const event of session.events()) {
			if (event.type === 'error') {
				serverWs.send(
					JSON.stringify({
						type: 'error',
						error: event.error ?? 'Live session error',
					}),
				);
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
		serverWs.send(
			JSON.stringify({
				type: 'error',
				error: publicError(err),
			}),
		);
	} finally {
		try {
			serverWs.close(1000, 'session ended');
		} catch {
			/* ignore */
		}
	}
}

function openLiveSession(
	profileId: string,
	env: LiveRelayEnv,
	apiKey: string,
	openWebSocket?: (url: string) => Promise<WebSocket>,
): Promise<LiveSession> {
	return runSession(
		{ profile: profileId },
		{
			gemini: {
				vault: {
					slotA: apiKey,
					slotB: env.GEMINI_API_KEY_FREE_B?.trim(),
					slotC: env.GEMINI_API_KEY_FREE_C?.trim(),
					paid: env.GEMINI_API_KEY?.trim(),
				},
			},
			...(openWebSocket ? { openWebSocket } : {}),
		},
	);
}

/**
 * Local Vite / Node entry: browser socket already accepted by the Vite plugin.
 * Uses `runSession` with the standard WebSocket constructor for upstream Gemini.
 */
export async function handleNodeLiveRelay(
	clientWs: WebSocket,
	requestUrl: string | URL,
	env: LiveRelayEnv,
): Promise<void> {
	const apiKey = resolveGeminiApiKey(env);
	if (!apiKey) {
		clientWs.send(
			JSON.stringify({
				type: 'error',
				error: 'No Gemini API key configured (GEMINI_API_KEY or GEMINI_API_KEY_FREE_A/B/C)',
			}),
		);
		clientWs.close(1011, 'missing api key');
		return;
	}

	ensureKernelInitialized();

	const url = typeof requestUrl === 'string' ? new URL(requestUrl, 'http://localhost') : requestUrl;
	const profileId = url.searchParams.get('profile') || TH30_PROFILE_ID;
	const profile = getProfile(profileId);
	if (profile.type !== 'live') {
		clientWs.send(
			JSON.stringify({
				type: 'error',
				error: `Profile '${profileId}' is not type 'live'`,
			}),
		);
		clientWs.close(1011, 'bad profile');
		return;
	}

	let session: LiveSession;
	try {
		session = await openLiveSession(profileId, env, apiKey);
	} catch (err) {
		try {
			clientWs.send(JSON.stringify({ type: 'error', error: publicError(err) }));
			clientWs.close(1011, 'relay failed');
		} catch {
			/* ignore */
		}
		return;
	}

	pipeBrowserToSession(clientWs, session);
	clientWs.addEventListener('close', () => {
		void session.close('client disconnected');
	});
	await pipeSessionToBrowser(clientWs, session, profileId);
}

/** Handle incoming WebSocket upgrade request and spawn duplex relay pipe. */
export async function handleLiveRelay(request: Request, env: LiveRelayEnv): Promise<Response> {
	if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
		return new Response('Expected WebSocket upgrade', { status: 426 });
	}

	ensureKernelInitialized();

	const apiKey = resolveGeminiApiKey(env);
	if (!apiKey) {
		return new Response(
			'No Gemini API key configured (GEMINI_API_KEY or GEMINI_API_KEY_FREE_A/B/C)',
			{ status: 500 },
		);
	}

	const url = new URL(request.url);
	const profileId = url.searchParams.get('profile') || TH30_PROFILE_ID;
	const profile = getProfile(profileId);
	if (profile.type !== 'live') {
		return new Response(`Profile '${profileId}' is not type 'live'`, { status: 400 });
	}

	// Cloudflare Workers duplex pair for browser ↔ worker relay
	// @ts-expect-error WebSocketPair is a Cloudflare Workers global
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- WebSocketPair is a Workers runtime global
	const [clientWs, serverWs] = new WebSocketPair() as unknown as [WebSocket, WebSocket];
	(serverWs as unknown as { accept: () => void }).accept();

	let session: LiveSession;
	try {
		session = await openLiveSession(profileId, env, apiKey, openCloudflareUpstreamWebSocket);
	} catch (err) {
		return new Response(`Failed to open live session: ${publicError(err)}`, { status: 502 });
	}

	pipeBrowserToSession(serverWs, session);
	serverWs.addEventListener('close', () => {
		void session.close('client disconnected');
	});
	void pipeSessionToBrowser(serverWs, session, profileId);

	return new Response(null, {
		status: 101,
		// @ts-expect-error webSocket property is standard on Cloudflare Response
		webSocket: clientWs,
	});
}
