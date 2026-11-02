---
title: Realtime Voice & Video
updated: 2026-11-02
summary: Real-time bidirectional WebSockets, audio worklets, and live camera video frames in React.
entry: react/src/index.ts
covers: react, src/surface, web
cover: /imagery/th30_drysavannah.png
coverAlt: Vast dry golden savannah grasslands beneath acacia trees
coverPosition: 50% 50%
---

Building responsive, bidirectional voice and video agents in the browser requires low-latency audio capture, streaming playback, barge-in interruption handling, and acoustic echo suppression.

Theorem implements a dedicated native browser media pipeline in `@theoremjs/web/client` and `@theoremjs/react/live`. An `AudioWorklet` reads the microphone off the main thread, and the Web Audio API schedules the model's voice without gaps.

## The Realtime Media Architecture

Duplex streaming connects the browser to a live provider through a WebSocket relay that you run on your server. There is no WebRTC negotiation and no ICE, STUN or TURN infrastructure: PCM audio chunks and JPEG video frames travel over one WebSocket. The client connects to `/api/live/relay` unless you give it another address.

```figure
{
  "kind": "lanes",
  "still": {
    "src": "/imagery/th30_cobaltwaves.png",
    "position": "40% 50%"
  },
  "caption": "Sound in and sound out. The relay is your server code, built on the boundary that @theoremjs/web/server provides.",
  "lanes": [
    "Browser",
    "Your relay",
    "Gemini"
  ],
  "steps": [
    {
      "lane": "Browser",
      "label": "The browser captures the microphone",
      "text": "An AudioWorklet posts mono float frames. While the model plays, a quiet frame is dropped so the speaker does not feed back. The rest are downsampled to 16 kHz PCM.",
      "kind": "ingress"
    },
    {
      "lane": "Your relay",
      "label": "Your relay opens the session",
      "text": "The first message is an open. prepareLiveOpen reads it, and runSession starts the live session.",
      "kind": "ingress"
    },
    {
      "lane": "Your relay",
      "label": "Your relay forwards each frame",
      "text": "parseLiveClientMessage reads later messages, and your relay passes them to the session's sendAudio, sendVideo, sendText and sendContext. Camera frames arrive from client.sendVideo.",
      "kind": "stream"
    },
    {
      "lane": "Gemini",
      "label": "Gemini answers",
      "text": "Its audio and events go back to the session.",
      "kind": "model"
    },
    {
      "lane": "Your relay",
      "label": "Your relay sends the events",
      "text": "The session's events go to the browser in an events message.",
      "kind": "stream"
    },
    {
      "lane": "Browser",
      "label": "The browser plays the reply",
      "text": "A media event goes to gapless playback. A done event with interrupted calls cancelPlayback.",
      "kind": "stream"
    }
  ]
}
```

## 1. Background Audio Ingestion (`AudioWorklet`)

Microphone input is captured at the `AudioContext`'s sample rate. The worklet hands each frame to the page's main thread, where the client downsamples it to 16-bit 16kHz linear PCM, matching upstream provider specifications.

### Automatic Worklet Ingestion

When instantiating `LiveSessionClient`, audio processing is completely automated:

1. Once the relay is ready, the client asks for the microphone with `navigator.mediaDevices.getUserMedia`: one channel, with echo cancellation, noise suppression, and gain control. Set `voiceIngress: false` to skip the microphone; the call still receives the model's audio.
2. The client loads the internal `mic-capture.js` worklet module into its `AudioContext`.
3. The worklet copies each frame of the first channel, as floats, and posts it to the main thread.
4. The client converts the frame to 16kHz 16-bit signed integer PCM and sends it over the WebSocket.

The metering callback `onVolumeLevel(level, isUser)` reports a level in the range $[0, 1]$: the microphone's when `isUser` is true, the model's playback when it is false. It can drive waveform bars such as `InkWaveform`.

## 2. Gapless 24kHz Playback Scheduling

Upstream providers return streaming model audio in variable-length 24kHz PCM chunks. Naively playing each chunk with `HTMLAudioElement.play()` results in audible clicks and gaps between network packets.

`LiveSessionClient` manages a buffer queue on the Web Audio API clock:

```text
// Schedule incoming PCM chunks along the Web Audio clock
let nextPlaybackTime = audioContext.currentTime;

function enqueueAudioChunk(pcmData: Float32Array, sampleRate = 24000) {
	const buffer = audioContext.createBuffer(1, pcmData.length, sampleRate);
	buffer.copyToChannel(pcmData, 0);

	const sourceNode = audioContext.createBufferSource();
	sourceNode.buffer = buffer;
	sourceNode.connect(playbackBus);

	// Guarantee gapless continuity: schedule immediately after prior chunk
	const startTime = Math.max(audioContext.currentTime, nextPlaybackTime);
	sourceNode.start(startTime);
	nextPlaybackTime = startTime + buffer.duration;
}
```

Each chunk starts where the one before it ends, so chunks that arrive in uneven batches play without a gap. A chunk that arrives after the one before it has finished starts at once.

## 3. Barge-In Interruption & Acoustic Gating

Conversational realism requires that a user can interrupt the model mid-sentence. However, device speakers often bleed audio back into the microphone, which naive detection engines mistake for user speech, causing the agent to interrupt itself.

Theorem employs a two-tier acoustic defense:

### Instant Buffer Flushing (Barge-In)
When a `done` event arrives marked `interrupted`, `LiveSessionClient.cancelPlayback()` stops and disconnects all scheduled `AudioBufferSourceNode` instances, skips audio still waiting to be scheduled, and resets `nextPlaybackTime` to `audioContext.currentTime`. The model stops speaking at once.

### The Quiet-Mic Echo Gate
While model audio is actively playing through the speaker, Theorem's client-side microphone gate drops quiet frames below an RMS of 0.05:
1. Low-amplitude acoustic bleed from the speakers (alongside keyboard clicks and ambient room noise) sits below 0.05 RMS and is dropped locally before transmission.
2. High-amplitude intentional user speech immediately crosses 0.05 RMS, streaming to the relay and triggering server-side interruption.

## 4. Video & Multimodal Camera Streaming

Realtime sessions ingest live video frames from device cameras over the same WebSocket connection.

### Headless Video Dispatch

Custom applications can capture frames from any HTML5 video stream and transmit them using `client.sendVideo(data, mimeType)`. `mimeType` defaults to `'image/jpeg'`. A frame sent while the socket is not open is dropped.

The client runs the tools the model calls on the relay. [Headless Client Management](#headless-client-management) adds the page's tools and an answer to a gate:

```ts frame=statements
import { LiveSessionClient } from '@theoremjs/web/client';

const client = new LiveSessionClient({ profile: 'research.scout.live' });
await client.connect();

const canvas = document.createElement('canvas');
// ...
const base64Jpeg = canvas.toDataURL('image/jpeg', 0.62).split(',')[1];
if (base64Jpeg) client.sendVideo(base64Jpeg);
```

### Declarative React Video

For high-level applications, `LiveRunner` from `@theoremjs/react/live` automates camera acquisition, device toggling (`facingMode: 'user' | 'environment'`), frame capture (it asks the camera for 640x480, and sends a JPEG frame every 400ms), and video preview rendering:

```tsx
import { LiveRunner } from '@theoremjs/react/live';

<LiveRunner
	iface={iface}
	connection={() => ({ profile: 'research.scout.live' })}
/>
```

## 5. Live Tool Execution & Mid-Call Gates

Models can execute tools during an active voice stream without closing the WebSocket connection:

```figure
{
  "kind": "lanes",
  "still": {
    "src": "/imagery/th30_midnightblueberries.png",
    "position": "50% 50%"
  },
  "caption": "A tool call held for approval during a voice call. The socket stays open all the way through.",
  "lanes": [
    "The model",
    "Your relay",
    "The browser"
  ],
  "steps": [
    {
      "lane": "The model",
      "label": "The model calls a tool",
      "text": "read_pages, with its urls and question.",
      "kind": "model"
    },
    {
      "lane": "Your relay",
      "label": "Your relay sends the call",
      "text": "It reaches the browser in an events message.",
      "kind": "ingress"
    },
    {
      "lane": "The browser",
      "label": "The browser asks to run it",
      "text": "It sends executeTool with the callId and operationId.",
      "kind": "ingress"
    },
    {
      "lane": "Your relay",
      "label": "The session finds a gate",
      "text": "Your relay answers executeToolResult with status gated and the gate.",
      "kind": "guardrail"
    },
    {
      "lane": "The browser",
      "label": "The person decides",
      "text": "LiveRunner shows an ApprovalCard in a dialog through onGate. With no onGate, every gate is refused.",
      "kind": "ingress"
    },
    {
      "lane": "The browser",
      "label": "The browser sends the answer",
      "text": "It sends executeTool again, with decision: 'approve'.",
      "kind": "ingress"
    },
    {
      "lane": "Your relay",
      "label": "The tool runs",
      "text": "The session sends the result to the model, and your relay answers with status settled.",
      "kind": "tool"
    },
    {
      "lane": "The model",
      "label": "The model goes on speaking",
      "text": "Its audio reaches the browser as media events, through your relay.",
      "kind": "model"
    }
  ]
}
```

Every tool of `research.scout.live` runs without asking, so this figure needs `permission: 'always_confirm'` added to `read_pages`. If a tool requires user approval, the call does not drop. The audio connection stays open while the UI shows an approval card in a dialog. Once approved, the tool result is returned over the WebSocket, and the agent goes on speaking.

A tool with a `background` setting can answer the model now and finish later, as on the [web handler](/docs/web#tools-that-finish-after-their-turn). Your relay passes its `background` service and its `execution` coordinator to `runSession`.

## Headless Client Management

Instantiate and manage realtime sessions using `LiveSessionClient`. With no `relayUrl`, it connects to `/api/live/relay` on the page's own host, with the profile in the query:

```ts frame=statements
import { LiveSessionClient, type LiveSessionStatus } from '@theoremjs/web/client';

const client = new LiveSessionClient({
	profile: 'research.scout.live',
	onStatusChange: (status: LiveSessionStatus) => {
		console.log('Call status:', status); // 'disconnected' | 'connecting' | 'reconnecting' | 'ready' | 'listening' | 'speaking' | 'working' | 'error'
	},
	onTranscript: (text: string, isUser: boolean, meta?: { interim?: boolean }) => {
		// ...
	},
	onVolumeLevel: (level: number, isUser: boolean) => {
		// ...
	},
	// A tool the profile declares with answeredBy: 'page'
	pageTools: {
		check_device: () => ({
			output: {
				webgpu: 'gpu' in navigator,
				// ...
			},
		}),
	},
	// Ask the person, then send their answer to the gate
	onGate: async ({ toolName }) =>
		window.confirm(`Run ${toolName}?`) ? { decision: 'approve' } : { decision: 'deny' },
	onError: (error: Error) => {
		// ...
	},
});

await client.connect();

// Mute/unmute microphone; returns true when muted
client.toggleMute();

// Send text utterance mid-call
client.sendText('Look for datasets that test long context memory.');

// Clean disconnect
client.disconnect();
```

`model` and `effort` pick the call's model and that model's effort. The profile must allow the pick (`allowModelSelect`), and the binding must allow the effort.

The client runs each call the model makes on the relay, one at a time, and answers every step itself:

- **A page tool**: The relay sends the call to the page. The client answers with the `pageTools` function of that name. A tool with no function, or a function that throws, is answered with no answer, and the console says once that the tool has no function. The turn does not wait for it.
- **A gate**: The client asks `onGate`. A sign-in gate's approval carries the key the person typed as `secret`. `continueGatedToolInvocation` turns the person's answer into the reply. Without `onGate`, every gate is refused.

The session answers the model however the call ends. Calls run in order, so a page function that never returns holds every call after it.

If a network interruption drops the WebSocket after the provider gave a continuation checkpoint, `LiveSessionClient` tries to reconnect with exponential backoff (`[500, 1000, 2000, 4000, 8000]` ms) and resumes the session from that checkpoint. After the last try, the call fails. With no checkpoint, the call ends.

## Related Guides

* **[Live Profiles](/docs/profiles/live)**: Declaring duplex audio, voice parameters, and context compression on the profile.
* **[Headless Web & Transport](/docs/web)**: Web-standard server route dispatchers and conversation stores.
* **[Headless React Hooks](/docs/web/react-hooks)**: Consuming chat, decision, and embedding transports in React.
* **[Astryx UI Components](/docs/web/astryx)**: Pre-assembled `<LiveRunner />` console with visual waveforms and captions.
