---
title: Speech Profiles
updated: 2026-11-02
summary: Text-to-speech audio synthesis with custom voice models, speed, and format options.
entry: src/kernel/engine/runner/mod.ts
covers: src/kernel/engine/runner, src/kernel/registry/profiles.ts
cover: /imagery/th30_floodedpaddy.png
coverAlt: Mirror-like flooded rice terraces reflecting morning light
coverPosition: 50% 50%
---

Speech profiles (`type: 'speech'`) configure text-to-speech (TTS) agents that synthesize spoken audio files from written transcripts. They execute through `runTurn()`, transforming input text into binary audio streams. The research cookbook's `research.podcast` reads the scout's findings aloud, and the scout reaches it through its `record_podcast` tool.

```figure
{
  "kind": "lanes",
  "still": {
    "src": "/imagery/th30_violetheather.png",
    "position": "50% 50%"
  },
  "caption": "The text goes in with a voice and a style. The audio comes back as media events.",
  "lanes": [
    "You send",
    "The provider",
    "You get back"
  ],
  "steps": [
    {
      "lane": "You send",
      "label": "input.text",
      "text": "The words to speak.",
      "kind": "ingress"
    },
    {
      "lane": "You send",
      "label": "speech",
      "text": "The profile's settings. Each setting on the turn replaces the profile's.",
      "kind": "profile",
      "parts": [
        {
          "label": "voice",
          "text": "The voice that speaks."
        },
        {
          "label": "style",
          "text": "How to speak. It is never spoken aloud."
        },
        {
          "label": "format",
          "text": "The audio format."
        }
      ]
    },
    {
      "lane": "The provider",
      "label": "The provider speaks the text",
      "text": "It returns audio in the format you set.",
      "kind": "model"
    },
    {
      "lane": "You get back",
      "label": "The turn's events",
      "text": "The audio, then the end of the turn.",
      "kind": "egress",
      "parts": [
        {
          "label": "media",
          "text": "The audio."
        },
        {
          "label": "done",
          "text": "The turn is over."
        }
      ]
    }
  ]
}
```

## Speech Profile Configuration

Base profile fields (`identity`, `models`, `guardrails`, `observability`, `labels`) apply across all modalities as documented in [Profiles](/docs/profiles). Speech profiles declare a `speech` block for the voice, delivery style, speaking rate, and audio format. This slice is the podcast agent's block. It runs on a Gemini speech model, which needs a `voice` and has no `speed` field, so the pace goes in `style`. Gemini speech makes PCM only, so the block sets no `format`:

```ts frame=profile:speech
speech: {
	voice: 'Kore', // Gemini speech has no default voice
	style: 'Warm and unhurried, like a podcast host talking to one listener.',
},
```

## Audio Synthesis Settings & Overrides

The `speech` block specifies default audio synthesis properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| **`voice`** | `string` | The upstream TTS voice ID or voice alias recognized by the bound provider. |
| **`style`** | `string` | Plain-text guidance describing pace, accent, or delivery emotion (e.g. `'Warm and unhurried'`). This instruction is interpreted by the provider and never spoken aloud. |
| **`speed`** | `number` | The speaking rate. `1` is the voice's own pace. A Gemini speech model refuses it. |
| **`format`** | `'pcm' \| 'mp3'` | The audio encoding. A provider that cannot make the format refuses the turn. Gemini speech makes `'pcm'` only. |

### Per-Turn Overrides

Callers can override `voice`, `style`, and `speed` dynamically for an individual turn without changing the profile definition:

```ts frame=statements
const events = runTurn({
	profile: 'research.podcast',
	// ...
	speech: {
		style: 'Brisk and bright, like a morning news summary.',
	},
});
```

Any field declared in `TurnRequest.speech` supersedes the corresponding profile default for that turn alone.

## Invoking Speech Profiles: `runTurn()`

Speech profiles are invoked through `runTurn()`, following the request dispatch flow documented in [Text Profiles](/docs/profiles/text). Instead of streaming text tokens, speech turns yield binary audio payloads.

### Basic Invocation

```ts frame=statements
const events = runTurn({
	profile: 'research.podcast',
	input: {
		text: 'This week, three ways to keep memory outside the prompt window.',
	},
});

for await (const event of events) {
	if (event.type === 'media') {
		// event.media contains { mimeType: 'audio/wav', data: string } (base64-encoded)
		// Gemini PCM arrives wrapped as WAV
		playAudio(event.media.mimeType, event.media.data);
	}
}
```

### Key Speech Events

| Event Type | Payload | Description |
| :--- | :--- | :--- |
| **`media`** | `event.media: { mimeType: string, data: string }` | Emitted when audio synthesis completes, containing the base64-encoded audio bytes and MIME type. |
| **`done`** | `event.stop: TurnStop`, `event.tokens?: TurnTokens` | Terminal event reporting completion status and token usage. |
| **`error`** | `event.errorKind: ErrorKind`, `event.error?: string` | Emitted if synthesis fails, the voice is unavailable, or the audio format is unsupported. |

## Related Guides

* **[Profiles](/docs/profiles)**: Universal profile identity, model bindings, inputs, and registry lifecycle.
* **[Text Profiles](/docs/profiles/text)**: Conversational agents and complete `runTurn()` mechanics.
* **[Live Profiles](/docs/profiles/live)**: Realtime bidirectional audio and voice activity detection over WebSockets.
