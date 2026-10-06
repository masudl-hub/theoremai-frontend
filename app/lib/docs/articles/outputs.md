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

State the shape of the reply. A text agent can answer in free text, or in JSON that a schema checks and your code can read.

## The idea

Free text is for a person to read. Code cannot use it safely. If your page needs the next step of a shipment as a field, the reply must have that field on every turn.

In Theorem, the profile names a **schema**, a JSON Schema that you register under an id. Theorem sends the schema to the model as the response format. It then parses the reply before your code sees it.

```text
                 the reply of the model
                           │
                           ▼
                 ┌───────────────────┐
                 │ valid JSON?       │── no ──► error event,
                 └─────────┬─────────┘          kind bad_response
                           │ yes
                           ▼
                 ┌───────────────────┐          Theorem sends the error
                 │ your checks pass? │── no ──► to the model and asks again,
                 └─────────┬─────────┘          up to maxRetries times
                           │ yes
                           ▼
             structured event, with the parsed value
```

A profile without `outputs` replies in free text.

## Give the Harbor desk a fixed reply

The Harbor page shows the answer of the desk and a button for the next step. These steps make the desk return both as fields.

### 1. Register the schema

`registerStructured` stores a JSON Schema under an id. Register the schema before the profile. `registerProfile` throws if the profile names an id that no schema has.

```ts frame=statements
registerStructured('harbor.desk.reply', {
	jsonSchema: {
		type: 'object',
		properties: { reply: { type: 'string' }, nextStep: { type: 'string' } },
		required: ['reply', 'nextStep'],
	},
})
```

### 2. Name the schema in the profile

```ts frame=profile:text
outputs: {
	structured: 'harbor.desk.reply',
},
```

Only a `text` profile takes `outputs.structured` and `outputs.validation`. Set `structured` to `null` for free text.

### 3. Read the reply

If the reply is valid JSON, the turn emits a `structured` event with the parsed value. If not, the turn emits an `error` event of kind `bad_response`.

```ts frame=statements
import { runTurn } from '@theoremjs/agents';

for await (const event of runTurn(
	{ profile: 'harbor.desk', input: { text: 'Where do I find hold H-2291?' } },
	provider,
)) {
	if (event.type === 'structured') console.log(event.structured);
}
```

### 4. Check the reply with your own rules

A schema cannot express every rule. The button on the Harbor page has room for 140 characters. Use `outputs.validation.fields` to run your own check on a part of the reply.

- Each key is a dotted path into the reply, such as `diagram.mermaid`.
- Each value is a function. It receives that part of the reply and the slots of the turn.
- The function returns `{ isValid, error? }`.

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

If a check fails, Theorem sends its `error` to the model and asks for a new reply. `maxRetries` sets how many times Theorem asks. It must be a whole number of 0 or more.

```warning
Without `maxRetries`, no retry happens. A reply that fails a check goes out as it is.
```

A reply that a guardrail blocks has its own limit, `guardrails.blockedReply.maxRetries` ([Setting guardrails](/docs/guardrails)). Both limits count the same attempts.

Checks in `fields` need a `structured` schema. Each path must reach a property through object properties. If not, `registerProfile` throws.

### 5. Select the schema by slot

The desk answers by email and by chat, and each has a different shape. Use a slot map when one agent needs a different schema for each case ([Declaring inputs](/docs/inputs)).

- `by` names an input slot.
- `map` gives a schema id for each choice of that slot.
- `fallback` is the schema for each choice that `map` leaves out, and for a turn that sends no choice.

```ts frame=profile:text
outputs: {
	structured: {
		by: 'channel',
		map: { email: 'harbor.desk.email', chat: 'harbor.desk.chat' },
		fallback: 'harbor.desk.chat',
	},
},
```

`by` must name a slot in `inputs.slots`. Each key of `map` must be a choice of that slot. If not, `defineProfile` throws.

## Choose how the reply streams

A reply can arrive piece by piece, or all at one time. `outputs.streaming.mode` sets this. Without it, the mode is `sse`.

- `sse`: events arrive while the model writes. A reply that fails `validation` has then streamed already when Theorem asks for a new one.
- `buffered`: Theorem makes one non-streaming call, and its events arrive together. With `validation`, they arrive after the reply passes or the retries run out. Thinking still streams.

Set `streamThoughts` to `false` to drop `thought` events from the stream. It is on when you leave it out. Other events stay.

```ts frame=profile:text
outputs: {
	streaming: { mode: 'buffered', streamThoughts: false },
},
```

## Return an image or speech

The Harbor label artist returns a picture, and the dock announcer returns audio. An `image` profile sets `image`. A `speech` profile sets `speech`. Each returns `media` events. A `media` event holds `mimeType` and base64 `data`.

- `outputs` is optional on both types. Only `streaming` applies to them.
- OpenRouter image and speech calls always answer in one piece.
- A setting that you leave out of `image` or `speech` takes the provider default.
- A turn has one primary output: a schema, an image or speech. `defineProfile` refuses `outputs.structured`, other than `null`, on an `image` or `speech` profile.

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

The format decides which audio file your player receives. `speech.format` is `pcm` or `mp3`. Theorem returns `pcm` as WAV audio. Gemini speech refuses `mp3`. OpenRouter speech takes it.

## Skip outputs on other types

Three types take no `outputs` ([Choosing a modality](/docs/modalities)).

- A `live` profile has none, because the session is the output.
- A `decision` profile and a `host` profile make no turn output.

## Fix an output setting that fails

Where | What you see | Fix
--- | --- | ---
`registerProfile`, kind `config` | `outputs.structured` names an id that no `registerStructured` call made | Register the schema first
`defineProfile`, kind `config` | The `by` key of `outputs.structured` is not a slot in `inputs.slots` | Declare the slot, or name another
`defineProfile`, kind `config` | A key of `map` is not a choice of the slot | Use only choices that the slot lists
`registerProfile`, kind `config` | `validation.fields` has a path that no schema reaches | Name a property that the schema declares
`defineProfile`, kind `config` | `validation.maxRetries` is not a whole number of 0 or more | Use 0, 1, 2 and so on
`defineProfile`, kind `config` | An `image` or `speech` profile sets `outputs.structured` | Set it to `null`, or use a `text` profile
A turn, `error` event, kind `bad_response` | The model’s reply is not valid JSON | Tighten the schema and the instruction, then send the turn again
A turn, kind `config` | `speech.format` is `mp3` on a Gemini model | Use `pcm`, or an OpenRouter model
