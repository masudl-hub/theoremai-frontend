/**
 * Cloudflare Worker stateless WebSocket relay for Gemini 3.1 Flash Live.
 *
 * Bridges the browser client WebSocket (PCM mic stream + UI tools)
 * to Google's upstream `BidiGenerateContent` WebSocket service.
 *
 * Outbound events pass through the kernel Live outbound gate (canary + egress).
 * Inbound client text is sanitized and fenced before upstream send.
 *
 * @module
 */

import { parseLiveRelayClientMessage } from '$lib/types/live-messages';
import { ensureKernelInitialized } from './kernel-init';
import { TH30_CLIENT_TOOLS, TH30_PROFILE_ID } from './th30';
import {
	abortLiveOutboundTurn,
	bindCanary,
	buildGeminiLiveRealtimeInput,
	buildGeminiLiveRealtimeText,
	buildGeminiLiveSetupMessage,
	buildGeminiLiveToolResponse,
	buildGeminiLiveWebSocketUrl,
	createLiveOutboundGateSession,
	finalizeLiveOutboundTurn,
	foldGeminiLiveServerMessage,
	getProfile,
	type LiveOutboundGateSession,
	mintCanary,
	type ProviderCompleteRequest,
	parseGeminiLiveMessage,
	prepareLiveInboundText,
	processLiveOutboundBatch,
	type TurnEvent,
	type WireFunctionTool,
} from './theorum';

export type LiveRelayEnv = {
	GEMINI_API_KEY?: string;
	GEMINI_API_KEY_FREE_A?: string;
	GEMINI_API_KEY_FREE_B?: string;
	GEMINI_API_KEY_FREE_C?: string;
};

/** Decode upstream WebSocket payloads (Workers uses `binaryType = 'arraybuffer'`). */
function decodeWebSocketText(data: unknown): string {
	if (typeof data === 'string') return data;
	if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
	if (data instanceof Uint8Array) return new TextDecoder().decode(data);
	throw new Error('Unsupported upstream WebSocket payload type');
}

/** Convert binary PCM chunks to base64 for Gemini Live realtime input framing. */
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

/** Build complete request object for setup framing and per-session outbound gate. */
function buildCompleteRequestForProfile(
	profileId: string,
	wireTools: WireFunctionTool[],
): { completeReq: ProviderCompleteRequest; outboundGate: LiveOutboundGateSession } {
	const profile = getProfile(profileId);
	const select = Object.keys(profile.model.select ?? {})[0] ?? 'gemini31FlashLive';
	const modelConfig = profile.model.config[select];
	let system = profile.identity.system ?? '';
	let canary: string | undefined;

	if (profile.guardrails.canary !== false) {
		canary = mintCanary();
		system = bindCanary(system, canary);
	}

	const outboundGate = createLiveOutboundGateSession(profile, canary);

	return {
		completeReq: {
			model: profile.model.allow[0],
			apiId: modelConfig.apiId,
			system,
			temperature: modelConfig.temperature,
			maxOutputTokens: modelConfig.maxOutputTokens,
			thinking: modelConfig.thinking.on,
			builtins: modelConfig.builtInTools,
			wireTools,
			input: [],
			structured: null,
			image: null,
			live: profile.outputs.live,
		},
		outboundGate,
	};
}

function sendGateError(serverWs: WebSocket, error: string): void {
	serverWs.send(JSON.stringify({ type: 'error', error }));
	try {
		serverWs.close(1011, 'guardrail withheld');
	} catch {
		/* ignore */
	}
}

function sendGateEvents(serverWs: WebSocket, events: TurnEvent[]): void {
	if (events.length === 0) return;
	serverWs.send(JSON.stringify({ type: 'events', events }));
}

async function applyOutboundGate(
	serverWs: WebSocket,
	session: LiveOutboundGateSession,
	events: TurnEvent[],
	turnPhase: 'streaming' | 'complete' | 'abort',
): Promise<boolean> {
	if (turnPhase === 'abort') {
		abortLiveOutboundTurn(session);
		return true;
	}

	const batch = processLiveOutboundBatch(session, events);
	if (batch.action === 'withhold') {
		sendGateError(serverWs, batch.error);
		return false;
	}
	if (batch.action === 'emit') {
		sendGateEvents(serverWs, batch.events);
	}

	if (turnPhase === 'complete') {
		const finalized = await finalizeLiveOutboundTurn(session);
		if (finalized.action === 'withhold') {
			sendGateError(serverWs, finalized.error);
			return false;
		}
		if (finalized.action === 'emit') {
			sendGateEvents(serverWs, finalized.events);
		}
	}

	return true;
}

/** Handle incoming WebSocket upgrade request and spawn duplex relay pipe. */
export async function handleLiveRelay(request: Request, env: LiveRelayEnv): Promise<Response> {
	if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
		return new Response('Expected WebSocket upgrade', { status: 426 });
	}

	ensureKernelInitialized();

	const apiKey =
		env.GEMINI_API_KEY_FREE_A?.trim() ||
		env.GEMINI_API_KEY?.trim() ||
		env.GEMINI_API_KEY_FREE_B?.trim() ||
		env.GEMINI_API_KEY_FREE_C?.trim();

	if (!apiKey) {
		return new Response('GEMINI_API_KEY is not configured on server', { status: 500 });
	}

	const url = new URL(request.url);
	const profileId = url.searchParams.get('profile') || TH30_PROFILE_ID;
	const wireTools = profileId === TH30_PROFILE_ID ? TH30_CLIENT_TOOLS : [];
	const profile = getProfile(profileId);
	const { completeReq, outboundGate } = buildCompleteRequestForProfile(profileId, wireTools);

	// Cloudflare Workers duplex pair for browser ↔ worker relay
	// @ts-expect-error WebSocketPair is a Cloudflare Workers global
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- WebSocketPair is a Workers runtime global
	const [clientWs, serverWs] = new WebSocketPair() as unknown as [WebSocket, WebSocket];

	// Connect upstream to Google Gemini Live WebSocket via Cloudflare fetch upgrade
	const upstreamUrl = buildGeminiLiveWebSocketUrl(apiKey);
	const httpsUpstreamUrl = upstreamUrl.replace(/^wss:\/\//i, 'https://');

	let upstreamWs: WebSocket;
	try {
		const upstreamResp = await fetch(httpsUpstreamUrl, {
			headers: { Upgrade: 'websocket' },
		});

		const ws = (upstreamResp as unknown as { webSocket?: WebSocket & { accept(): void } })
			.webSocket;
		if (!ws) {
			return new Response(
				`Upstream WebSocket upgrade failed with status ${String(upstreamResp.status)}`,
				{ status: 502 },
			);
		}
		ws.binaryType = 'arraybuffer';
		ws.accept();
		upstreamWs = ws;
	} catch (err) {
		return new Response(`Failed to connect upstream: ${(err as Error).message}`, { status: 502 });
	}

	const sendToUpstream = (payload: string) => {
		try {
			upstreamWs.send(payload);
		} catch {
			/* ignore */
		}
	};

	// Send setup frame immediately to upstream
	const setupMsg = buildGeminiLiveSetupMessage(completeReq);
	upstreamWs.send(JSON.stringify(setupMsg));

	upstreamWs.addEventListener('message', (event) => {
		void (async () => {
			try {
				const rawText = decodeWebSocketText(event.data);
				const parsed = parseGeminiLiveMessage(rawText);
				if (!parsed) return;

				if (parsed.setupComplete) {
					serverWs.send(JSON.stringify({ type: 'ready', profile: profileId }));
					return;
				}

				const events = foldGeminiLiveServerMessage(parsed);
				const serverContent = parsed.serverContent as { turnComplete?: boolean } | undefined;
				const interrupted = events.some((ev) => ev.type === 'done' && ev.interrupted === true);
				const turnComplete = Boolean(serverContent?.turnComplete);

				let turnPhase: 'streaming' | 'complete' | 'abort' = 'streaming';
				if (interrupted) {
					turnPhase = 'abort';
				} else if (turnComplete) {
					turnPhase = 'complete';
				}

				const ok = await applyOutboundGate(serverWs, outboundGate, events, turnPhase);
				if (!ok) {
					try {
						upstreamWs.close(1011, 'guardrail withheld');
					} catch {
						/* ignore */
					}
				}
			} catch (err) {
				serverWs.send(
					JSON.stringify({
						type: 'error',
						error: (err as Error).message || 'Failed to process upstream message',
					}),
				);
			}
		})();
	});

	upstreamWs.addEventListener('close', (event) => {
		try {
			serverWs.close(event.code || 1000, event.reason || 'Upstream closed');
		} catch {
			/* ignore */
		}
	});

	upstreamWs.addEventListener('error', () => {
		try {
			serverWs.send(
				JSON.stringify({
					type: 'error',
					error: 'Upstream Gemini Live connection error',
				}),
			);
			serverWs.close(1011, 'Upstream error');
		} catch {
			/* ignore */
		}
	});

	// Client serverWs events
	(serverWs as unknown as { accept: () => void }).accept();

	serverWs.addEventListener('message', (event: MessageEvent) => {
		try {
			if (typeof event.data === 'string') {
				const msg = parseLiveRelayClientMessage(JSON.parse(event.data) as unknown);
				if (msg?.type === 'audio') {
					const frame = buildGeminiLiveRealtimeInput({
						type: 'audio',
						mimeType: 'audio/pcm;rate=16000',
						data: msg.data,
					});
					sendToUpstream(JSON.stringify(frame));
					return;
				}

				if (msg?.type === 'video') {
					const frame = buildGeminiLiveRealtimeInput({
						type: 'video',
						mimeType: msg.mimeType ?? 'image/jpeg',
						data: msg.data,
					});
					sendToUpstream(JSON.stringify(frame));
					return;
				}

				if (msg?.type === 'text') {
					const safeText = prepareLiveInboundText(profile, msg.text);
					const frame = buildGeminiLiveRealtimeText(safeText);
					sendToUpstream(JSON.stringify(frame));
					return;
				}

				if (msg?.type === 'toolResponse') {
					const frame = buildGeminiLiveToolResponse(msg.id, msg.name, msg.output);
					sendToUpstream(JSON.stringify(frame));
				}
			} else if (event.data instanceof ArrayBuffer || event.data instanceof Uint8Array) {
				// Raw binary PCM 16kHz audio stream from AudioWorklet
				const base64 = bufferToBase64(event.data);
				const frame = buildGeminiLiveRealtimeInput({
					type: 'audio',
					mimeType: 'audio/pcm;rate=16000',
					data: base64,
				});
				sendToUpstream(JSON.stringify(frame));
			}
		} catch (err) {
			serverWs.send(
				JSON.stringify({
					type: 'error',
					error: (err as Error).message || 'Invalid client message format',
				}),
			);
		}
	});

	serverWs.addEventListener('close', (event: CloseEvent) => {
		try {
			if (upstreamWs.readyState === WebSocket.OPEN) {
				upstreamWs.close(event.code || 1000, event.reason || 'Client disconnected');
			}
		} catch {
			/* ignore */
		}
	});

	return new Response(null, {
		status: 101,
		// @ts-expect-error webSocket property is standard on Cloudflare Response
		webSocket: clientWs,
	});
}
