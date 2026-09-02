/**
 * Pure client-side SDK for THEORUM Gemini 3.1 Flash Live sessions over WebSocket relay.
 *
 * Handles:
 * - Bidirectional WebSocket connection to `/api/live/relay`.
 * - 16-bit 16kHz PCM microphone audio recording & streaming.
 * - Gapless 24kHz PCM / WAV model voice playback scheduling.
 * - Barge-in interruption cancellation (instant audio queue flush).
 * - UI tool execution and response routing.
 *
 * @module
 */

/* eslint-disable @typescript-eslint/no-deprecated -- ScriptProcessorNode until AudioWorklet migration */
import type { TurnEvent } from 'theorum';
import { parseLiveServerEnvelope } from '$lib/types/live-messages';
import { isPermissionDeniedError } from './live-errors';

export type LiveSessionStatus =
	| 'disconnected'
	| 'connecting'
	| 'ready'
	| 'listening'
	| 'speaking'
	| 'error';

export type LiveConnectPhase = 'socket' | 'microphone';

export interface LiveClientOptions {
	profile?: string;
	relayUrl?: string;
	onStatusChange?: (status: LiveSessionStatus) => void;
	onConnectPhase?: (phase: LiveConnectPhase | null) => void;
	onTranscript?: (text: string, isUser: boolean) => void;
	onTurnEvent?: (event: TurnEvent) => void;
	onError?: (error: string) => void;
	onToolCall?: (
		name: string,
		args: Record<string, unknown>,
	) => Promise<Record<string, unknown>> | Record<string, unknown>;
	onVolumeLevel?: (level: number, isUser: boolean) => void;
}

/** Decode base64 ASCII string to raw byte array. */
function base64ToBytes(data: string): Uint8Array {
	const bin = atob(data);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

/** Encode raw byte array to base64 ASCII string. */
function bytesToBase64(bytes: Uint8Array): string {
	let bin = '';
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin);
}

/** Resample Float32 audio buffer from inputRate to 16000Hz and convert to Int16 PCM. */
function downsampleAndConvertToInt16(
	inputData: Float32Array,
	inputRate: number,
	outputRate = 16000,
): Int16Array {
	if (inputRate === outputRate) {
		const result = new Int16Array(inputData.length);
		for (let i = 0; i < inputData.length; i++) {
			const val = inputData[i] ?? 0;
			const s = Math.max(-1, Math.min(1, val));
			result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
		}
		return result;
	}

	const ratio = inputRate / outputRate;
	const newLength = Math.round(inputData.length / ratio);
	const result = new Int16Array(newLength);
	let offsetResult = 0;
	let offsetInput = 0;

	while (offsetResult < result.length) {
		const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
		let accum = 0;
		let count = 0;
		for (let i = offsetInput; i < nextOffsetInput && i < inputData.length; i++) {
			accum += inputData[i] ?? 0;
			count++;
		}
		const sample = count > 0 ? accum / count : 0;
		const s = Math.max(-1, Math.min(1, sample));
		result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7fff;
		offsetResult++;
		offsetInput = nextOffsetInput;
	}
	return result;
}

export class LiveSessionClient {
	private ws: WebSocket | null = null;
	private audioContext: AudioContext | null = null;
	private micStream: MediaStream | null = null;
	private micSource: MediaStreamAudioSourceNode | null = null;
	private micProcessor: ScriptProcessorNode | null = null;
	private playbackNodes: AudioBufferSourceNode[] = [];
	private nextPlaybackTime = 0;
	private status: LiveSessionStatus = 'disconnected';
	private micActivating = false;
	private connectTimeout: ReturnType<typeof setTimeout> | null = null;
	private isMuted = false;
	private options: LiveClientOptions;

	constructor(options: LiveClientOptions = {}) {
		this.options = options;
	}

	private setStatus(newStatus: LiveSessionStatus): void {
		this.status = newStatus;
		if (newStatus === 'listening' || newStatus === 'disconnected' || newStatus === 'error') {
			this.clearConnectTimeout();
		}
		this.options.onStatusChange?.(newStatus);
	}

	private setConnectPhase(phase: LiveConnectPhase | null): void {
		this.options.onConnectPhase?.(phase);
	}

	private clearConnectTimeout(): void {
		if (this.connectTimeout) {
			clearTimeout(this.connectTimeout);
			this.connectTimeout = null;
		}
	}

	private detachWebSocket(): void {
		if (!this.ws) return;
		this.ws.onopen = null;
		this.ws.onmessage = null;
		this.ws.onclose = null;
		this.ws.onerror = null;
		try {
			this.ws.close();
		} catch {
			/* ignore */
		}
		this.ws = null;
	}

	private teardownConnection(): void {
		this.clearConnectTimeout();
		this.micActivating = false;
		this.setConnectPhase(null);
		this.detachWebSocket();
		this.cleanupAudio();
	}

	private failConnect(message: string, denied = false): void {
		if (this.status === 'error' || this.status === 'disconnected') return;
		this.teardownConnection();
		this.options.onError?.(denied ? 'Permission denied...' : message);
		this.setStatus('error');
	}

	public async connect(): Promise<void> {
		this.teardownConnection();
		this.setStatus('connecting');
		this.setConnectPhase('socket');

		try {
			const AudioContextClass = window.AudioContext;
			this.audioContext = new AudioContextClass();
			if (this.audioContext.state === 'suspended') {
				await this.audioContext.resume();
			}

			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const profileParam = this.options.profile
				? `?profile=${encodeURIComponent(this.options.profile)}`
				: '';
			const defaultUrl = `${protocol}//${window.location.host}/api/live/relay${profileParam}`;
			const url = this.options.relayUrl || defaultUrl;

			this.ws = new WebSocket(url);
			this.ws.binaryType = 'arraybuffer';

			this.connectTimeout = setTimeout(() => {
				if (this.status === 'connecting') {
					this.failConnect('Live connection timed out');
				}
			}, 20_000);

			this.ws.onmessage = (event: MessageEvent<string | ArrayBuffer | Blob>) => {
				void this.handleServerMessage(event.data);
			};

			this.ws.onclose = () => {
				if (this.status === 'connecting') {
					this.failConnect('Live connection closed before ready');
					return;
				}
				this.teardownConnection();
				this.setStatus('disconnected');
			};

			this.ws.onerror = () => {
				this.failConnect('WebSocket live connection error');
			};
		} catch (err) {
			const error = err as DOMException & Error;
			this.failConnect(
				error.message || 'Failed to start live session',
				isPermissionDeniedError(err),
			);
		}
	}

	private async activateMicrophone(): Promise<void> {
		if (this.micActivating || this.status !== 'connecting') return;
		this.micActivating = true;
		this.setConnectPhase('microphone');

		try {
			if (!this.audioContext || this.audioContext.state === 'closed') {
				const AudioContextClass = window.AudioContext;
				this.audioContext = new AudioContextClass();
				if (this.audioContext.state === 'suspended') {
					await this.audioContext.resume();
				}
			}

			this.micStream = await navigator.mediaDevices.getUserMedia({
				audio: {
					channelCount: 1,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});

			this.setupMicrophonePipeline();
			this.setConnectPhase(null);
			this.setStatus('listening');
		} catch (err) {
			const error = err as DOMException & Error;
			this.failConnect(
				error.message || 'Failed to access microphone',
				isPermissionDeniedError(err),
			);
		} finally {
			this.micActivating = false;
		}
	}

	private setupMicrophonePipeline(): void {
		if (!this.micStream || !this.audioContext) return;

		this.micSource = this.audioContext.createMediaStreamSource(this.micStream);
		this.micProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
		const silent = this.audioContext.createGain();
		silent.gain.value = 0;

		this.micProcessor.onaudioprocess = (e) => {
			if (this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

			const inputFloat32 = e.inputBuffer.getChannelData(0);
			const sampleRate = this.audioContext?.sampleRate ?? 48000;

			let sum = 0;
			for (let i = 0; i < inputFloat32.length; i++) {
				const val = inputFloat32[i] ?? 0;
				sum += val * val;
			}
			const rms = Math.sqrt(sum / inputFloat32.length);
			this.options.onVolumeLevel?.(Math.min(1, rms * 5), true);

			const pcm16 = downsampleAndConvertToInt16(inputFloat32, sampleRate, 16000);
			const base64 = bytesToBase64(new Uint8Array(pcm16.buffer));

			this.ws.send(JSON.stringify({ type: 'audio', data: base64 }));
		};

		this.micSource.connect(this.micProcessor);
		this.micProcessor.connect(silent);
		silent.connect(this.audioContext.destination);
	}

	private async handleServerMessage(data: string | ArrayBuffer | Blob): Promise<void> {
		if (typeof data !== 'string') return;

		try {
			const payload = parseLiveServerEnvelope(JSON.parse(data) as unknown);
			if (!payload) return;

			if (payload.type === 'ready') {
				await this.activateMicrophone();
				return;
			}

			if (payload.type === 'error') {
				this.options.onError?.(payload.error);
				this.setStatus('error');
				return;
			}

			if (payload.type === 'interrupted') {
				this.cancelPlayback();
				this.setStatus('listening');
				return;
			}

			const toolCalls: Array<{
				id: string;
				name: string;
				arguments: Record<string, unknown>;
			}> = [];

			for (const event of payload.events) {
				this.options.onTurnEvent?.(event);

				if (event.type === 'evidence' && event.evidence?.kind === 'input_transcription') {
					if (event.text) {
						this.options.onTranscript?.(event.text, true);
					}
				} else if (event.type === 'text' && event.text) {
					this.options.onTranscript?.(event.text, false);
				} else if (event.type === 'media' && event.media?.data) {
					// Model audio chunk
					this.setStatus('speaking');
					await this.enqueueAudioChunk(event.media.data, event.media.mimeType);
				} else if (event.type === 'tool' && event.tool?.name) {
					toolCalls.push({
						id: event.tool.id ?? '',
						name: event.tool.name,
						arguments: event.tool.arguments ?? {},
					});
				} else if (event.type === 'done') {
					if (event.interrupted) {
						this.cancelPlayback();
					}
					this.setStatus('listening');
				}
			}

			if (toolCalls.length > 0) {
				await this.handleToolExecutions(toolCalls);
			}
		} catch (err) {
			this.options.onError?.((err as Error).message || 'Failed to parse live server event');
		}
	}

	private async handleToolExecutions(
		calls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>,
	): Promise<void> {
		const responses: Array<{ id: string; name: string; output: unknown }> = [];

		for (const call of calls) {
			let output: Record<string, unknown> = { success: true };

			if (this.options.onToolCall) {
				try {
					output = await this.options.onToolCall(call.name, call.arguments);
				} catch (err) {
					output = { error: (err as Error).message || 'Tool execution failed' };
				}
			}

			responses.push({ id: call.id, name: call.name, output });
		}

		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({ type: 'toolResponses', responses }));
		}
	}

	private async enqueueAudioChunk(base64Data: string, mimeType?: string): Promise<void> {
		if (!this.audioContext) return;

		try {
			const bytes = base64ToBytes(base64Data);
			let audioBuffer: AudioBuffer;

			if (mimeType?.includes('wav')) {
				const wavBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
				audioBuffer = await this.audioContext.decodeAudioData(wavBuffer as ArrayBuffer);
			} else {
				// Raw PCM 24kHz 1-channel 16-bit LE
				const int16 = new Int16Array(bytes.buffer);
				const float32 = new Float32Array(int16.length);
				for (let i = 0; i < int16.length; i++) {
					const sample = int16[i] ?? 0;
					float32[i] = sample / (sample < 0 ? 0x8000 : 0x7fff);
				}
				audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
				audioBuffer.getChannelData(0).set(float32);
			}

			const channel = audioBuffer.getChannelData(0);
			let sum = 0;
			for (let i = 0; i < channel.length; i++) {
				const val = channel[i] ?? 0;
				sum += val * val;
			}
			const rms = Math.sqrt(sum / Math.max(1, channel.length));
			this.options.onVolumeLevel?.(Math.min(1, rms * 4), false);

			const source = this.audioContext.createBufferSource();
			source.buffer = audioBuffer;
			source.connect(this.audioContext.destination);

			const now = this.audioContext.currentTime;
			const startTime = Math.max(now, this.nextPlaybackTime);
			source.start(startTime);

			this.nextPlaybackTime = startTime + audioBuffer.duration;
			this.playbackNodes.push(source);

			source.onended = () => {
				const idx = this.playbackNodes.indexOf(source);
				if (idx !== -1) this.playbackNodes.splice(idx, 1);
				if (this.playbackNodes.length === 0 && this.status === 'speaking') {
					this.setStatus('listening');
				}
			};
		} catch (err) {
			this.options.onError?.((err as Error).message || 'Failed to play audio chunk');
		}
	}

	public cancelPlayback(): void {
		for (const node of this.playbackNodes) {
			try {
				node.stop();
				node.disconnect();
			} catch {
				/* ignore */
			}
		}
		this.playbackNodes = [];
		if (this.audioContext) {
			this.nextPlaybackTime = this.audioContext.currentTime;
		}
	}

	public toggleMute(): boolean {
		this.isMuted = !this.isMuted;
		return this.isMuted;
	}

	public sendText(text: string): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({ type: 'text', text }));
		}
	}

	public disconnect(): void {
		this.teardownConnection();
		this.setStatus('disconnected');
	}

	private cleanupAudio(): void {
		this.cancelPlayback();

		if (this.micProcessor) {
			try {
				this.micProcessor.disconnect();
			} catch {
				/* ignore */
			}
			this.micProcessor = null;
		}

		if (this.micSource) {
			try {
				this.micSource.disconnect();
			} catch {
				/* ignore */
			}
			this.micSource = null;
		}

		if (this.micStream) {
			for (const track of this.micStream.getTracks()) {
				track.stop();
			}
			this.micStream = null;
		}

		if (this.audioContext && this.audioContext.state !== 'closed') {
			try {
				void this.audioContext.close();
			} catch {
				/* ignore */
			}
			this.audioContext = null;
		}
	}
}
