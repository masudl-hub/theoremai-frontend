---
title: Transcription Profiles
updated: 2026-10-30
summary: Speech to text. One voice clip goes in, and the words come back as text.
entry: src/kernel/engine/runner/mod.ts
covers: src/kernel/engine/runner, src/kernel/registry/profiles.ts, src/kernel/registry/ingress.ts, src/providers/openrouter/transcriptions-protocol.ts
cover: /imagery/th30_amberresin.png
coverAlt: Aerial view of an amber stream winding through dark forest under small white clouds
coverPosition: 50% 50%
---

Transcription profiles (`type: 'transcription'`) turn one voice clip into text. They run through `runTurn()`, so a turn gives back `text`, `tokens` and `done` events, and a trace records the call. The research cookbook has no transcription agent. `research.transcriber` on this page is one you write, to put a recorded talk into words the scout can read.

## Transcription Profile Configuration

Base profile fields (`identity`, `models`, `guardrails`, `observability`, `labels`) apply as documented in [Profiles](/docs/profiles). `identity` takes only `handle`. `inputs` must set `voice`, `maxFiles`, `maxBytes` and `maxTurnBytes`, and it also takes `limitsByMime`. `inputs.text` can only be `false`:

```ts frame=profile:transcription
id: 'research.transcriber',
// ...
models: {
	scribe: {
		protocol: 'openRouterTranscriptions',
		provider: 'openrouter',
		apiId: 'mistralai/voxtral-mini-transcribe-3-0',
		keySlot: 'openrouter',
		options: { provider: { zdr: true } },
	},
},
inputs: {
	voice: { accept: ['audio/*'] },
	maxFiles: 1,
	maxBytes: 20971520,
	maxTurnBytes: 20971520,
},
```

## Running a Transcription

Send the clip in `input.voice`. A turn takes exactly one clip and no text. A turn with no clip fails with a `request` error:

```ts frame=statements
let words = '';
for await (const event of runTurn({
	profile: 'research.transcriber',
	input: { voice: [{ mimeType: 'audio/mp4', data: clipBase64 }] },
})) {
	if (event.type === 'text') words += event.text;
}
```

A clip with no speech gives no `text` event, and the turn still ends with `done`.

## Architectural Invariants

* **No System Prompt**: The model follows no instruction, so a transcription profile has no `identity.system`. A `system` on the request fails with a `config` error. There is no canary to plant.
* **No Tools**: A transcription profile calls no tools and has no `outputs`.
* **One Clip, Stateless**: Each turn holds one clip. It keeps no history and no provider continuation.
* **Not an Agent Tool**: Agent tools take text, so another agent cannot call a transcription profile as a tool. Your host runs the turn.

## Supported Formats and Routing

`openRouterTranscriptions` reads WAV, MP3, M4A, AAC, OGG, Opus, FLAC and WebM. It refuses any other type with a `request` error, including raw PCM.

`options.provider` takes `zdr` and `data_collection`. OpenRouter's transcription endpoint ignores `only`, `order` and `ignore`, so the binding refuses them.

## Related Guides

* **[Profiles](/docs/profiles)**: Universal profile identity, model bindings, inputs and registry lifecycle.
* **[Speech Profiles](/docs/profiles/speech)**: The reverse: text in, audio out.
* **[Supported Protocols](/docs/providers/protocols)**: Endpoints and options for each protocol.
