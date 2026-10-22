---
title: Choosing a modality
updated: 2026-10-22
summary: Pick the profile type: text, image, speech, live, decision, embedding or host.
entry: src/kernel/registry/profiles.ts
covers: src/kernel/registry/profiles.ts, src/kernel/schema.ts
cover: /imagery/th30_dyevats.png
coverAlt: Round vats of blue dye, from above
coverPosition: 44% 82%
suggest: 2
---

Choose what kind of agent you build. The **type** of a profile is its modality: text, image, speech, live, decision, embedding or host.

## The idea

The type selects the runner and permitted profile fields. Each model's protocol must have an endpoint for the type ([Binding models](/docs/models)).

The type decides two things:

- which fields the profile can set, and which fields it must set
- which function runs the agent

`defineProfile` checks both. It throws if a profile sets a field that its type does not allow. It also throws if the profile leaves out a field that its type needs. You see the error when your application starts, not in the middle of a turn.

## Pick a type

Harbor, the freight company in this guide, uses all seven types. Each row is one job and the agent that does it.

The agent must | Type | Run it with | At Harbor
--- | --- | --- | ---
Chat in turns and call tools | `text` | `runTurn` | The front desk
Return a picture | `image` | `runTurn` | The label artist
Read a transcript aloud | `speech` | `runTurn` | The dock announcer
Hold a realtime voice or video call | `live` | `runSession` | The phone line
Answer typed questions about JSON state | `decision` | `runDecision` | The router
Create vectors for text or media | `embedding` | `runEmbedding` | The search index
Run your tools with no model | `host` | `invokeTool` | The toolbox

Start with `text` for turn-based conversation.
Registration checks that each model's protocol has an endpoint for the profile type.

```note
Every example on this page sets `protocol` and `keySlot` on its model. `protocol` names the API shape that the model uses. That field names the vault slot that holds the provider key. The examples assume that the provider is registered ([Binding models](/docs/models)).
```

## Text

The Harbor front desk answers questions and looks up shipments. Use `text` for an agent that chats in turns and can call tools. Run it with `runTurn`.

- Must set: `identity`, `models`, `tools` and `inputs`.
- Can set: `outputs` and `turnBehaviour`.
- First-party protocols: `openRouterOpenAi`, `geminiInteractions` or `openAi`.

```ts frame=statements
const desk = defineProfile({
	type: 'text',
	id: 'harbor.desk',
	identity: { handle: 'desk', system: 'You are the Harbor front desk.' },
	models: {
		main: {
			protocol: 'openRouterOpenAi',
			provider: 'openrouter',
			apiId: 'openrouter/free',
			keySlot: 'openrouter',
		},
	},
	tools: { allow: [] },
	inputs: {},
})
```

## Image

The label artist draws the art for a shipping label. Use `image` for an agent that returns a picture. Run it with `runTurn`.

- Must set: the same fields as `text`, plus `image`.
- Cannot set: `inputs.voice`, `outputs.structured` or `turnBehaviour.allowSteering`.
- First-party protocols: `openRouterImages` or `geminiInteractions`.

```ts frame=statements
const illustrator = defineProfile({
	type: 'image',
	id: 'harbor.label',
	identity: { handle: 'label', system: 'Draw clear shipping-label art.' },
	models: {
		main: {
			protocol: 'geminiInteractions',
			provider: 'gemini',
			apiId: 'gemini-2.5-flash-image',
			keySlot: 'gemini',
		},
	},
	tools: { allow: [] },
	inputs: {},
	image: { aspectRatio: '1:1', mimeType: 'image/png' },
})
```

## Speech

The dock announcer reads a notice to the dock. Use `speech` to read a transcript aloud. Run it with `runTurn`. The input text is the transcript.

- Must set: `identity` with a `handle` only, `models` and `speech`.
- Cannot set: `identity.system`, `tools` or `inputs`.
- First-party protocols: `openRouterOpenAi`, `geminiInteractions` or `openAi`.
- Canary: Theorem adds no canary to a speech profile, because it has no system prompt.

`speech.format` is `pcm` or `mp3`. `pcm` is delivered as WAV. `mp3` needs a model that can make it, such as an OpenRouter model.

```ts frame=statements
const announcer = defineProfile({
	type: 'speech',
	id: 'harbor.announce',
	identity: { handle: 'announce' },
	models: {
		main: {
			protocol: 'geminiInteractions',
			provider: 'gemini',
			apiId: 'gemini-3.1-flash-tts-preview',
			keySlot: 'gemini',
		},
	},
	speech: { voice: 'Kore' },
})
```

## Live

The phone line talks with a shipper in real time. Use `live` for a realtime voice or video call. Run it with `runSession`.

- Must set: `identity`, `models`, `tools` and `live`.
- Cannot set: `inputs` or `outputs`. `live.ingress` replaces `inputs`.
- First-party protocol: `geminiLive`.

If you omit an ingress channel, audio and video default to on. Text defaults to off.
At least one channel must be on.

Use `live.sessionResumption` in place of `turnBehaviour.resumption`. Use `live.contextCompression` in place of model `compaction`.

```ts frame=statements
const line = defineProfile({
	type: 'live',
	id: 'harbor.line',
	identity: { handle: 'line', system: 'You are on a live call with a Harbor shipper.' },
	models: {
		main: {
			protocol: 'geminiLive',
			provider: 'gemini',
			apiId: 'gemini-3.1-flash-live-preview',
			keySlot: 'gemini',
		},
	},
	tools: { allow: [] },
	live: {
		ingress: { audio: true, video: false, text: true },
		sessionResumption: true,
	},
})
```

## Decision

The router decides which dock takes a shipment. Use `decision` to get typed answers about JSON state. Run it with `runDecision`.

- Must set: `identity` with a `handle` only, one model, `inputs.state: "json"` and `decision.contract`.
- Cannot set: `identity.system`, `tools`, `outputs` or `turnBehaviour`.
- First-party protocols: `systemOne` on TypeSafe, or `openRouterDecisions` on OpenRouter.

The contract is your own id for the decision. Theorem records it on the trace and does not send it to the model. The questions and the state travel on the `runDecision` request ([Running a turn](/docs/runner)).

```ts frame=statements
const router = defineProfile({
	type: 'decision',
	id: 'harbor.route',
	identity: { handle: 'route' },
	models: {
		jev: { protocol: 'systemOne', provider: 'typesafe', apiId: 'jev-latest', keySlot: 'typesafe' },
	},
	inputs: { state: 'json' },
	decision: { contract: 'harbor.route.v1' },
})
```

## Embedding

Use `embedding` when your application needs vectors for text or media. Run it with `runEmbedding`.

- Must set: `identity`, `models` and `inputs`.
- Cannot set: `identity.system`, `tools`, `outputs` or `turnBehaviour`.
- First-party protocols: `geminiEmbedding`, `openRouterEmbedding` or `ollamaEmbedding`.

Vector size and other model settings go in the binding's `options`, and the protocol checks them. The kernel checks every reply: one vector per input, in input order, with finite values.

For search, set `task` on the request: `document` when you index, `query` when you search. The protocol tells the model which it is. A model that embeds both the same way ignores it.

```ts frame=statements
const searchIndex = defineProfile({
	type: 'embedding',
	id: 'harbor.search',
	identity: { handle: 'search' },
	models: {
		main: {
			protocol: 'geminiEmbedding',
			provider: 'gemini',
			apiId: 'gemini-embedding-2-preview',
			keySlot: 'gemini',
		},
	},
	inputs: {
		text: true,
		attachments: { accept: ['image', 'audio', 'video', 'document'] },
		maxFiles: 6,
		maxBytes: 20_000_000,
		maxTurnBytes: 20_000_000,
	},
})
```

A profile that takes files must set `maxFiles`, `maxBytes` and `maxTurnBytes`. For embedding, `maxFiles` counts the files in one input. `maxBytes` holds each file and `maxTurnBytes` the whole request.

The model has limits of its own, and the kernel holds every request to both before it sends anything. A file type is taken only when the profile and the model both take it:

Model | Takes
--- | ---
Gemini Embedding 2 | PNG and JPEG images, up to 6 in an input; one PDF in an input; MP3 and WAV audio; MP4 and MOV video; up to 100 inputs in a request
`gemini-embedding-001` | Text only, up to 100 inputs in a request
`openRouterEmbedding` | Images
`ollamaEmbedding` | Text only

## Host

The toolbox measures a road leg for a page that has no chat. Use `host` to run registered tools with no model, for example from your own API route. Run it with `invokeTool`, or with `runTool` when you need only how the call ended ([Running a turn](/docs/runner)).

- Must set: `tools`.
- Cannot set: `identity`, `models`, `inputs` or `outputs`.
- Guardrails: only `detect` and `network`.

```ts frame=statements
const toolbox = defineProfile({
	type: 'host',
	id: 'harbor.tools',
	tools: { allow: ['haversine_distance'] },
	guardrails: { detect: { credentials: 'block' } },
})
```
