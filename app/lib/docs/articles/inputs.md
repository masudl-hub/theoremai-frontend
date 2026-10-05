---
title: Declaring inputs
updated: 2026-10-05
summary: Declare what a turn may send: text, files, voice or choices. Theorem refuses any turn that sends more than the profile declares.
entry: src/kernel/registry/profiles.ts
covers: src/kernel/registry/ingress.ts, src/kernel/registry/attachments.ts, src/kernel/registry/catalog.ts, src/kernel/engine/live-ingress.ts
cover: /imagery/th30_cobaltwaves.png
coverAlt: Cobalt waves on a black beach
coverPosition: 0% 81%
---

Use `inputs` to declare what one turn of a `text` or `image` agent may send. A turn that sends more than the profile declares is refused. This profile accepts text, PDF and image files, and nothing else.

```ts frame=profile:text
inputs: {
	text: true,
	attachments: { accept: ['image/*', 'application/pdf'] },
	maxFiles: 4,
	maxBytes: 5_000_000,
	maxTurnBytes: 12_000_000,
},
```

## Accept text

A `text` or `image` profile must set `inputs`. A profile that leaves `inputs.text` out accepts text.

Set `inputs.text` to `false` to refuse text.

## Accept files

Set `inputs.attachments.accept` to the file types a turn may send. A file type is a MIME type, such as `application/pdf`. A type such as `image/*` matches a whole family.

A profile without `attachments` accepts no files.

A profile with `attachments` or `voice` must also set `maxFiles`, `maxBytes` and `maxTurnBytes`. Each is a positive whole number. Theorem refuses to register the profile without them.

`maxFiles` counts files and voice clips together. `maxBytes` caps one file. `maxTurnBytes` caps all files and clips in one turn.

To give one file type its own cap, set `limitsByMime`. Its keys are MIME types or families such as `video/*`. Each value replaces `maxBytes` for those files.

The byte caps apply to files sent inline. Theorem checks a file sent by reference, with a `uri`, for type and count only.

An `image` profile accepts images, video and PDF only. It takes no voice.

A file must be a media type that Theorem knows: an image, audio, video or document type. Any other type is refused, even when `accept` lists it.

## Send a file

```ts frame=request
input: {
	text: 'Is this container on hold?',
	attachments: [
		{ mimeType: 'application/pdf', data: manifestBase64, name: 'manifest.pdf' },
	],
},
```

`data` is the file as base64 text. `name` only tells the user which file Theorem refused. Theorem never sends it to the model.

Theorem cleans a `text/plain`, `text/markdown` or `text/csv` file before the model reads it. It replaces injection text and sensitive data with an omitted marker. In a CSV file, it adds an apostrophe before a cell that starts like a formula.

## Accept voice

Only a `text` profile takes voice clips. Set `inputs.voice.accept` to the audio types a clip may be. The same three caps apply. A turn sends clips in `input.voice`.

```ts frame=profile:text
inputs: {
	voice: { accept: ['audio/*'] },
	maxFiles: 1,
	maxBytes: 2_000_000,
	maxTurnBytes: 2_000_000,
},
```

## Offer choices

Use `inputs.slots` when a turn must pick from a fixed list, such as a language. Each key is a slot name. Its value lists the choices.

A turn passes its pick in `input.slots`. A profile can also use the pick to choose its reply schema. [Declaring outputs](/docs/outputs).

```ts frame=profile:text
inputs: {
	slots: { channel: ['email', 'chat'] },
},
```

## Other agent types

A `speech` profile has no `inputs`. The text of the turn is the transcript.

A `host` profile runs tools and takes no turn, so it has no `inputs`.

A `live` profile sets its channels in `live.ingress`. A `decision` profile reads JSON state in `inputs`. [Choosing a modality](/docs/modalities).

## Open live channels

A live session takes audio, video and text on separate channels. Audio and video are on when you leave them out. Text is off when you leave it out. At least one channel must be on.

```ts frame=profile:live
live: {
	ingress: { audio: true, video: true, text: false },
},
```

## Cap decision state

A decision call sends JSON state. The state must not be `null`. Set `inputs.maxStateBytes` to a positive whole number to cap its size. Without it, the state has no cap. A state that is `null`, cannot become JSON or passes the cap makes `runDecision` throw a `DecisionError` with code `invalid_request` ([Running a turn](/docs/runner)).

```ts frame=profile:decision
inputs: { state: 'json', maxStateBytes: 65_536 },
```

## Read a refused turn

`runTurn` throws a `TheoremError` when a turn breaks the profile. A file error lists one code for each problem. `runDecision` throws when the state is over `maxStateBytes`.

## Fix a refused turn

Error | Cause | Fix
--- | --- | ---
Kind `input`, `attachments_not_accepted` | The turn sent a file, and the profile has no `attachments` | Add `inputs.attachments`
Kind `input`, `voice_not_accepted` | The turn sent a clip, and the profile has no `voice` | Add `inputs.voice` to a `text` profile
Kind `input`, `mime_not_allowed` | The file type is not in `accept` | Add the type to `accept`, or send another file
Kind `input`, `too_many_files` | The turn sent more than `maxFiles` | Send fewer files, or raise `maxFiles`
Kind `input`, `file_too_large` | One inline file is over its cap | Send a smaller file, or raise `maxBytes` or `limitsByMime`
Kind `input`, `turn_too_large` | The files together are over `maxTurnBytes` | Send fewer files, or raise `maxTurnBytes`
Kind `request` | The turn sent text, and `inputs.text` is `false` | Remove the text, or set `inputs.text` to `true`
Kind `request` | A slot is not declared, or its value is not in the list | Declare the slot, or send a listed value
Kind `request` | A `speech` turn has empty text | Send the text to speak
Kind `request` | A `continueFrom` turn sent `input.text` | Remove the text: Theorem sends the continue instruction
