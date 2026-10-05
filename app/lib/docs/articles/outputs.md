---
title: Declaring outputs
updated: 2026-10-05
summary: Make a text agent reply in a fixed JSON shape, check the reply, and choose how it streams. Image and speech agents return media.
entry: src/kernel/registry/profiles.ts
covers: src/kernel/registry/profile-outputs.ts, src/kernel/registry/schemas.ts, src/kernel/engine/repair.ts
cover: /imagery/th30_orangecanyon.png
coverAlt: An orange canyon
coverPosition: 0% 34%
---

Use `outputs` to make a `text` agent reply in a fixed JSON shape that your code can read. A profile without `outputs` replies in free text. Register a schema, then name it in the profile.

## Register the schema

```ts frame=statements
registerStructured('harbor.desk.reply', {
	jsonSchema: {
		type: 'object',
		properties: { reply: { type: 'string' }, nextStep: { type: 'string' } },
		required: ['reply', 'nextStep'],
	},
})
```

## Name it in the profile

```ts frame=profile:text
outputs: {
	structured: 'harbor.desk.reply',
},
```

## Pin the reply to a schema

`registerStructured` stores a JSON Schema under an id. Register it before the profile. Theorem refuses to register a profile that names an unknown id.

Theorem sends the schema to the model as its response format. When the reply is valid JSON, the run emits a `structured` event with the parsed value. Otherwise the run emits an `error` event of kind `bad_response`.

Only a `text` profile takes `outputs.structured` and `outputs.validation`. Set `structured` to `null` for free text.

## Pick the schema by slot

Use a slot map when one agent needs a different reply shape for each case. `by` names an input slot. `map` gives a schema id for each choice of that slot. `fallback` is the schema for every choice that `map` leaves out, and for a turn that sends no pick.

`by` must name a slot in `inputs.slots`. Each key of `map` must be a choice of that slot. Theorem refuses to register the profile otherwise. [Declaring inputs](/docs/inputs).

```ts frame=profile:text
outputs: {
	structured: {
		by: 'channel',
		map: { email: 'harbor.desk.email', chat: 'harbor.desk.chat' },
		fallback: 'harbor.desk.chat',
	},
},
```

## Check the reply

Use `outputs.validation.fields` to run your own checks on the structured reply. Each key is a dotted path into the reply, such as `diagram.mermaid`. Each value is a function.

The function receives that part of the reply and the turn’s slots. It returns `{ isValid, error? }`.

Checks in `fields` need a `structured` schema. Every path must reach a property through object properties. Theorem refuses to register the profile otherwise.

When a check fails, Theorem sends its `error` to the model and asks for a new reply. `maxRetries` sets how many times it asks. Without it, no retry happens, and the reply goes out as it is.

`guardrails.egress.maxRetries` also sets retries ([Setting guardrails](/docs/guardrails)). Theorem uses the larger of the two numbers. `maxRetries` must be a whole number of 0 or more.

```ts frame=profile:text
outputs: {
	structured: 'harbor.desk.reply',
	validation: {
		fields: {
			nextStep: (value) => ({
				isValid: typeof value === 'string' && value.length <= 140,
				error: 'nextStep must be 140 characters or fewer.',
			}),
		},
		maxRetries: 2,
	},
},
```

## Choose how the reply streams

`outputs.streaming.mode` is `sse` or `buffered`. Without it, the mode is `sse`.

In `sse`, events arrive while the model writes. A reply that fails `validation` has then streamed already when Theorem asks for a new one.

In `buffered`, Theorem makes one non-streaming call. Its events arrive together. With `validation`, they arrive after the reply passes or the retries run out. Thinking still streams.

Set `streamThoughts` to `false` to drop `thought` events from the stream. It is on when you leave it out. Other events stay.

```ts frame=profile:text
outputs: {
	streaming: { mode: 'buffered', streamThoughts: false },
},
```

## Return an image or speech

An `image` profile sets `image`. A `speech` profile sets `speech`. Each returns `media` events. A `media` event holds `mimeType` and base64 `data`.

`outputs` is optional on both. Only `streaming` applies to them. OpenRouter image and speech calls always answer in one piece.

A pin that you leave out takes the provider default.

`defineProfile` refuses `outputs.structured`, other than `null`, on an `image` or `speech` profile. A turn has one primary output: a schema, an image or speech.

```ts frame=profile:image
type: 'image',
image: {
	aspectRatio: '1:1',
	mimeType: 'image/png',
},
```

```ts frame=profile:speech
type: 'speech',
speech: {
	voice: 'Kore',
	format: 'pcm',
},
```

## Pick the speech format

`speech.format` is `pcm` or `mp3`. Theorem returns `pcm` as WAV audio. Gemini speech refuses `mp3`. OpenRouter speech takes it.

## Skip outputs on other types

A `live` profile has no `outputs`, because the session is the output. A `decision` profile and a `host` profile make no turn output. [Choosing a modality](/docs/modalities).

## Fix an output setting that fails

Where | What you see | Fix
--- | --- | ---
Registering the profile, kind `config` | `outputs.structured` names an id that no `registerStructured` call made | Register the schema first
Registering the profile, kind `config` | The `by` key of `outputs.structured` is not a slot in `inputs.slots` | Declare the slot, or name another
Registering the profile, kind `config` | A key of `map` is not a choice of the slot | Use only choices that the slot lists
Registering the profile, kind `config` | `validation.fields` has a path that no schema reaches | Name a property that the schema declares
Registering the profile, kind `config` | `validation.maxRetries` is not a whole number of 0 or more | Use 0, 1, 2 and so on
`defineProfile`, kind `config` | An `image` or `speech` profile sets `outputs.structured` | Set it to `null`, or use a `text` profile
A turn, `error` event, kind `bad_response` | The model’s reply is not valid JSON | Tighten the schema and the instruction, then send the turn again
A turn, kind `config` | `speech.format` is `mp3` on a Gemini model | Use `pcm`, or an OpenRouter model
