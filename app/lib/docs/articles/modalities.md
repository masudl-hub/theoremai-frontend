---
title: Choosing a modality
updated: 2026-10-08
summary: Pick the profile type: text, image, speech, live, decision or host.
entry: src/kernel/registry/profiles.ts
covers: src/kernel/registry/profiles.ts, src/kernel/schema.ts
cover: /imagery/th30_dyevats.png
coverAlt: Round vats of blue dye, from above
coverPosition: 44% 82%
suggest: 2
---

Choose what kind of agent you build. The **type** of a profile is its modality: text, image, speech, live, decision or host.

## The idea

The type decides two things:

- which fields the profile can set, and which fields it must set
- which function runs the agent

`defineProfile` checks both. It throws if a profile sets a field that its type does not allow. It also throws if the profile leaves out a field that its type needs. You see the error when your application starts, not in the middle of a turn.

## Pick a type

Harbor, the freight company in this guide, uses all six types. Each row is one job and the agent that does it.

The agent must | Type | Run it with | At Harbor
--- | --- | --- | ---
Chat in turns and call tools | `text` | `runTurn` | The front desk
Return a picture | `image` | `runTurn` | The label artist
Read a transcript aloud | `speech` | `runTurn` | The dock announcer
Hold a realtime voice or video call | `live` | `runSession` | The phone line
Answer typed questions about JSON state | `decision` | `runDecision` | The router
Run your tools with no model | `host` | `invokeTool` | The toolbox

If you are not sure, start with `text`.

```note
Every example on this page sets `keySlot` on its model. That field names the vault slot that holds the provider key. The examples assume that the provider is registered ([Binding models](/docs/models)).
```

## Text

The Harbor front desk answers questions and looks up shipments. Use `text` for an agent that chats in turns and can call tools. Run it with `runTurn`.

- Must set: `identity`, `models`, `tools` and `inputs`.
- Can set: `outputs` and `turnBehaviour`.
- Provider: `openrouter`, `google` or a local server.

```ts frame=statements
const desk = defineProfile({
	type: 'text',
	id: 'harbor.desk',
	identity: { handle: 'desk', system: 'You are the Harbor front desk.' },
	models: {
		main: { provider: 'openrouter', apiId: 'openrouter/free', keySlot: 'openrouter' },
	},
	tools: { allow: [] },
	inputs: {},
})
```

## Image

The label artist draws the art for a shipping label. Use `image` for an agent that returns a picture. Run it with `runTurn`.

- Must set: the same fields as `text`, plus `image`.
- Cannot set: `inputs.voice`, `outputs.structured` or `turnBehaviour.allowSteering`.
- Provider: `openrouter` or `google`.

```ts frame=statements
const illustrator = defineProfile({
	type: 'image',
	id: 'harbor.label',
	identity: { handle: 'label', system: 'Draw clear shipping-label art.' },
	models: {
		main: {
			provider: 'google',
			apiId: 'gemini-2.5-flash-image',
			keySlot: 'google',
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
- Canary: Theorem adds no canary to a speech profile, because it has no system prompt.

`speech.format` is `pcm` or `mp3`. `pcm` is delivered as WAV. `mp3` needs a model that can make it, such as an OpenRouter model.

```ts frame=statements
const announcer = defineProfile({
	type: 'speech',
	id: 'harbor.announce',
	identity: { handle: 'announce' },
	models: {
		main: {
			provider: 'google',
			apiId: 'gemini-3.1-flash-tts-preview',
			keySlot: 'google',
		},
	},
	speech: { voice: 'Kore' },
})
```

## Live

The phone line talks with a shipper in real time. Use `live` for a realtime voice or video call. Run it with `runSession`.

- Must set: `identity`, `models`, `tools` and `live`.
- Cannot set: `inputs` or `outputs`. `live.ingress` replaces `inputs`.
- Provider: `google` only.

If you leave out an ingress channel, audio and video default to on and text to off. At least one channel must be on.

Use `live.sessionResumption` in place of `turnBehaviour.resumption`. Use `live.contextCompression` in place of model `compaction`.

```ts frame=statements
const line = defineProfile({
	type: 'live',
	id: 'harbor.line',
	identity: { handle: 'line', system: 'You are on a live call with a Harbor shipper.' },
	models: {
		main: { provider: 'google', apiId: 'gemini-3.1-flash-live-preview', keySlot: 'google' },
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
- Provider: `typesafe` or `openrouter`.

The contract is your own id for the decision. Theorem records it on the trace and does not send it to the model. The questions and the state travel on the `runDecision` request ([Running a turn](/docs/runner)).

```ts frame=statements
const router = defineProfile({
	type: 'decision',
	id: 'harbor.route',
	identity: { handle: 'route' },
	models: {
		jev: { provider: 'typesafe', apiId: 'jev-latest', keySlot: 'typesafe' },
	},
	inputs: { state: 'json' },
	decision: { contract: 'harbor.route.v1' },
})
```

## Host

The toolbox measures a road leg for a page that has no chat. Use `host` to run registered tools with no model, for example from your own API route. Run it with `invokeTool` ([Running a turn](/docs/runner)).

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
