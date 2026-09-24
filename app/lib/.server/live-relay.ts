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
	errorKind,
	getProfile,
	type LexiconOverrides,
	type LiveSession,
	publicError,
	runSession,
	TheoremError,
} from '@theoremai/agents';
import { forClient, forClientEvents } from '@theoremai/agents/host';
import type { ToolCredential } from '@theoremai/agents/kernel';
import { parseLiveRelayClientMessage } from '../types/live-messages';
import { ensureKernelInitialized } from './kernel-init';
import {
	closePlaygroundSteerInbox,
	consumePlaygroundSteerWithRetry,
	openPlaygroundSteerInbox,
} from './playground-steer';
import { TH30_PROFILE_ID } from './th30';

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

function newLiveSessionId(): string {
	return globalThis.crypto.randomUUID();
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
	openWebSocket: (url: string) => Promise<WebSocket>,
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

async function relayLiveSession(
	serverWs: WebSocket,
	profileId: string,
	env: LiveRelayEnv,
): Promise<void> {
	const sessionId = newLiveSessionId();
	let lexicon: LexiconOverrides | undefined;
	let session: LiveSession;
	try {
		const profile = getProfile(profileId);
		lexicon = profile.lexicon;
		if (profile.type !== 'live') {
			// lexicon-exempt: internal diagnostic; the user reads error.config
			throw new TheoremError('config', `Profile '${profileId}' is not type 'live'`);
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
			profileId,
			env,
			apiKey,
			sessionId,
			openCloudflareUpstreamWebSocket,
		);
	} catch (err) {
		await closePlaygroundSteerInbox(sessionId);
		failRelay(serverWs, err, lexicon);
		return;
	}

	// The browser may have left while the session opened; its close event has already fired.
	if (serverWs.readyState !== WebSocket.OPEN) {
		await session.close('client disconnected');
		await closePlaygroundSteerInbox(sessionId);
		return;
	}
	pipeBrowserToSession(serverWs, session, lexicon);
	serverWs.addEventListener('close', () => {
		void session.close('client disconnected');
		void closePlaygroundSteerInbox(sessionId);
	});
	void pipeSessionToBrowser(serverWs, session, profileId, sessionId, lexicon);
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
	const profileId = new URL(request.url).searchParams.get('profile') || TH30_PROFILE_ID;
	void relayLiveSession(serverWs, profileId, env);

	return new Response(null, { status: 101, webSocket: clientWs });
}
