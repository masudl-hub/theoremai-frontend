/**
 * Cloudflare Worker WebSocket relay for Gemini Live via THEOREM `runSession`.
 *
 * Bridges the browser client WebSocket (PCM mic stream + UI tools)
 * to a gated live session. Prefers `LiveSession.executeTool` for registry
 * tools; `sendToolResponse(s)` remain an escape hatch for non-registry relays.
 *
 * @module
 */

import { getProfile, type LiveSession, publicError, runSession } from '@theoremai/agents';
import { forClientEvents } from '@theoremai/agents/host';
import type { ToolCredential } from '@theoremai/agents/kernel';
import { parseLiveRelayClientMessage } from '$lib/types/live-messages';
import { ensureKernelInitialized } from './kernel-init';
import {
	closePlaygroundSteerInbox,
	consumePlaygroundSteerWithRetry,
	openPlaygroundSteerInbox,
} from './playground-steer';
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

function newLiveSessionId(): string {
	return globalThis.crypto.randomUUID();
}

function pipeBrowserToSession(serverWs: WebSocket, session: LiveSession): void {
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
									output: { error: publicError(err) },
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
	sessionId: string,
): Promise<void> {
	serverWs.send(JSON.stringify({ type: 'ready', profile: profileId, sessionId }));
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
		await closePlaygroundSteerInbox(sessionId);
		try {
			serverWs.close(1000, 'session ended');
		} catch {
			/* ignore */
		}
	}
}

async function openLiveSession(
	profileId: string,
	env: LiveRelayEnv,
	apiKey: string,
	sessionId: string,
	openWebSocket?: (url: string) => Promise<WebSocket>,
): Promise<LiveSession> {
	await openPlaygroundSteerInbox(sessionId);
	return runSession(
		{
			profile: profileId,
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

	const sessionId = newLiveSessionId();
	let session: LiveSession;
	try {
		session = await openLiveSession(profileId, env, apiKey, sessionId);
	} catch (err) {
		await closePlaygroundSteerInbox(sessionId);
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
		void closePlaygroundSteerInbox(sessionId);
	});
	await pipeSessionToBrowser(clientWs, session, profileId, sessionId);
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

	const sessionId = newLiveSessionId();
	let session: LiveSession;
	try {
		session = await openLiveSession(
			profileId,
			env,
			apiKey,
			sessionId,
			openCloudflareUpstreamWebSocket,
		);
	} catch (err) {
		await closePlaygroundSteerInbox(sessionId);
		return new Response(`Failed to open live session: ${publicError(err)}`, { status: 502 });
	}

	pipeBrowserToSession(serverWs, session);
	serverWs.addEventListener('close', () => {
		void session.close('client disconnected');
		void closePlaygroundSteerInbox(sessionId);
	});
	void pipeSessionToBrowser(serverWs, session, profileId, sessionId);

	return new Response(null, {
		status: 101,
		// @ts-expect-error webSocket property is standard on Cloudflare Response
		webSocket: clientWs,
	});
}
