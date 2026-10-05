---
title: Choosing a modality
updated: 2026-10-05
summary: Pick the profile type that fits your agent: text, image, speech, live, decision or host. Each type has its own fields and its own door.
entry: src/kernel/registry/profiles.ts
covers: src/kernel/registry/profiles.ts, src/kernel/schema.ts
cover: /imagery/th30_dyevats.png
coverAlt: Round vats of blue dye, from above
coverPosition: 44% 82%
suggest: 2
---

Set `type` on the profile to say what the agent does. The type is the modality. It is the first choice you make, because it decides which fields you may set and which function runs the agent.

`defineProfile` throws when a profile sets a field its type does not allow or leaves out a field its type needs. The error appears when your application starts, not in the middle of a turn.

## Pick a type

The agent should | Type | Run it with
--- | --- | ---
Chat in turns and call tools | `text` | `runTurn`
Return a picture | `image` | `runTurn`
Read a transcript aloud | `speech` | `runTurn`
Hold a realtime voice or video call | `live` | `runSession`
Answer typed questions about JSON state | `decision` | `runDecision`
Run your tools with no model | `host` | `invokeTool`

```note
Every example on this page sets `key`. That field names the vault slot that holds the provider key ([Binding models](/docs/models)). If you are not sure, start with `text`.
```

## Text

Use `text` for an agent that chats in turns and may call tools. Run it with `runTurn`.

- Must set: `identity`, `models`, `tools` and `inputs`.
- May set: `outputs` and `turnBehaviour`.
- Protocol: `openAi` or `geminiInteractions`.

```ts frame=statements
const desk = defineProfile({
	type: 'text',
	id: 'harbor.desk',
	key: 'openrouter',
	identity: { handle: 'desk', system: 'You are the Harbor front desk.' },
	models: {
		main: { protocol: 'openAi', provider: 'openrouter', apiId: 'openrouter/free' },
	},
	tools: { allow: [] },
	inputs: {},
})
```

## Image

Use `image` for an agent that returns a picture. Run it with `runTurn`.

- Must set: the same fields as `text`, plus `image`.
- Cannot set: `inputs.voice`, `outputs.structured` or `turnBehaviour.allowSteering`.
- Protocol: `openAi` or `geminiInteractions`.

```ts frame=statements
const illustrator = defineProfile({
	type: 'image',
	id: 'harbor.label',
	key: 'google',
	identity: { handle: 'label', system: 'Draw clear shipping-label art.' },
	models: {
		main: {
			protocol: 'geminiInteractions',
			provider: 'google',
			persistViaInteractionId: false,
			apiId: 'gemini-2.5-flash-image',
		},
	},
	tools: { allow: [] },
	inputs: {},
	image: { aspectRatio: '1:1', mimeType: 'image/png' },
})
```

## Speech

Use `speech` to read a transcript aloud. Run it with `runTurn`. The input text is the transcript.

- Must set: `identity` with a `handle` only, `models` and `speech`.
- Cannot set: `identity.system`, `tools` or `inputs`.
- Canary: a speech profile always stores `guardrails.canary: false`, because the reply is audio and not text.

`speech.format` is `pcm` or `mp3`. `pcm` is delivered as WAV. `mp3` needs protocol `openAi`.

```ts frame=statements
const announcer = defineProfile({
	type: 'speech',
	id: 'harbor.announce',
	key: 'google',
	identity: { handle: 'announce' },
	models: {
		main: {
			protocol: 'geminiInteractions',
			provider: 'google',
			persistViaInteractionId: false,
			apiId: 'gemini-3.1-flash-tts-preview',
		},
	},
	speech: { voice: 'Kore' },
})
```

## Live

Use `live` for a realtime voice or video call. Run it with `runSession`.

- Must set: `identity`, `models`, `tools` and `live`.
- Cannot set: `inputs` or `outputs`. `live.ingress` replaces `inputs`.
- Protocol: `geminiLive` only.

If you leave out an ingress channel, audio and video default to on and text to off. At least one channel must be on.

Use `live.sessionResumption` in place of `turnBehaviour.resumption`. Use `live.contextCompression` in place of model `compaction`.

```ts frame=statements
const line = defineProfile({
	type: 'live',
	id: 'harbor.line',
	key: 'google',
	identity: { handle: 'line', system: 'You are on a live call with a Harbor shipper.' },
	models: {
		main: { protocol: 'geminiLive', provider: 'google', apiId: 'gemini-3.1-flash-live-preview' },
	},
	tools: { allow: [] },
	live: {
		ingress: { audio: true, video: false, text: true },
		sessionResumption: true,
	},
})
```

## Decision

Use `decision` to get typed answers about JSON state. Run it with `runDecision`.

- Must set: `identity` with a `handle` only, one model with protocol `decision`, `inputs.state: "json"` and `decision.contract`.
- Cannot set: `identity.system`, `tools`, `outputs` or `turnBehaviour`.
- Provider: `typesafe` or `openrouter`.

The contract is your own id for the decision. Theorem records it on the trace and does not send it to the model. The questions and the state travel on the `runDecision` request ([Running a turn](/docs/runner)).

```ts frame=statements
const router = defineProfile({
	type: 'decision',
	id: 'harbor.route',
	key: 'typesafe',
	identity: { handle: 'route' },
	models: {
		jev: { protocol: 'decision', provider: 'typesafe', apiId: 'jev-latest' },
	},
	inputs: { state: 'json' },
	decision: { contract: 'harbor.route.v1' },
})
```

## Host

Use `host` to run registered tools with no model, for example from your own API route. Run it with `invokeTool` ([Running a turn](/docs/runner)).

- Must set: `tools`.
- Cannot set: `identity`, `models`, `inputs` or `outputs`.
- Guardrails: only `sanitizeInput`, `redactSensitive` and `network`.

```ts frame=statements
const toolbox = defineProfile({
	type: 'host',
	id: 'harbor.tools',
	tools: { allow: ['haversine_distance'] },
	guardrails: { sanitizeInput: true, redactSensitive: true },
})
```
