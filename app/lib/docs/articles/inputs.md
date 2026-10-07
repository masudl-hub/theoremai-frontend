---
title: Declaring inputs
updated: 2026-10-07
summary: Declare what a turn may send. Theorem refuses a turn that sends more.
entry: src/kernel/registry/profiles.ts
covers: src/kernel/registry/ingress.ts, src/kernel/registry/attachments.ts, src/kernel/registry/catalog.ts, src/kernel/engine/live-ingress.ts
cover: /imagery/th30_cobaltwaves.png
coverAlt: Cobalt waves on a black beach
coverPosition: 0% 81%
---

State what one turn can send to the agent: text, files, voice or fixed choices. Theorem refuses a turn that sends more.

## The idea

Most applications check input in the route. One route checks the size of a file. A second route forgets. The agent then accepts different input on different pages.

In Theorem, `inputs` is part of the profile. Theorem checks each turn against it before the model sees anything. If the turn breaks the profile, `runTurn` throws, and no model call happens.

```figure
{
	"kind": "sequence",
	"still": {
		"src": "/imagery/th30_cobaltwaves.png",
		"position": "40% 50%"
	},
	"caption": "Theorem checks each turn against the profile before the model reads it.",
	"steps": [
		{
			"label": "A turn arrives",
			"text": "It can carry text, files, voice clips and slot choices."
		},
		{
			"label": "Theorem checks it against inputs",
			"text": "The first check that fails ends the turn.",
			"parts": [
				{
					"label": "Declared",
					"text": "The profile declares this kind of input."
				},
				{
					"label": "Type",
					"text": "The media type of each file is allowed."
				},
				{
					"label": "Size",
					"text": "Each file and the full turn are under the caps."
				}
			]
		},
		{
			"label": "The model reads the turn",
			"text": "If a check fails, runTurn throws a TheoremError, and no model call happens."
		}
	]
}
```

`inputs` belongs to `text` and `image` profiles. The other types state their input in a different field ([Other agent types](/docs/inputs#other-agent-types)).

## Declare what the Harbor desk accepts

A shipper sends the Harbor desk a question, and often a manifest or a photo of a container. These steps declare each kind of input. Use only the steps that your agent needs.

### 1. Accept text

A `text` or `image` profile must set `inputs`. A profile that leaves out `inputs.text` accepts text, so `inputs: {}` is a profile that takes text only.

Set `inputs.text` to `false` to refuse text.

### 2. Accept files

Set `inputs.attachments.accept` to the file types that a turn can send. A file type is a MIME type, such as `application/pdf`. A type such as `image/*` matches a whole family. A profile without `attachments` accepts no files.

```ts frame=profile:text
inputs: {
	text: true,
	attachments: { accept: ['image/*', 'application/pdf'] },
	maxFiles: 4,
	maxBytes: 5_000_000,
	maxTurnBytes: 12_000_000,
},
```

A profile with `attachments` or `voice` must also set three caps. Each cap is a positive whole number. `defineProfile` throws without them.

- `maxFiles` counts files and voice clips together.
- `maxBytes` is the cap for one file.
- `maxTurnBytes` is the cap for all files and clips in one turn.

To give one file type its own cap, set `limitsByMime`. Its keys are MIME types or families such as `video/*`. Each value replaces `maxBytes` for those files.

```warning
The byte caps apply to files that a turn sends inline. For a file that a turn sends by reference, with a `uri`, Theorem checks the type and the count only.
```

Two more limits apply:

- An `image` profile accepts images, video and PDF only. It takes no voice.
- A file must be a media type that Theorem knows: an image, audio, video or document type. Theorem refuses any other type, even if `accept` lists it.

### 3. Send a file

The request carries the file in `input.attachments`.

```ts frame=request
input: {
	text: 'Is this container on hold?',
	attachments: [
		{ mimeType: 'application/pdf', data: manifestBase64, name: 'manifest.pdf' },
	],
},
```

- `data` is the file as base64 text.
- `name` tells the user which file Theorem refused. Theorem never sends it to the model.

The detectors of the profile read a `text/plain`, `text/markdown` or `text/csv` file before the model does. Without a setting, a placeholder replaces injection text and sensitive data ([Setting guardrails](/docs/guardrails)). In a CSV file, Theorem also adds an apostrophe before a cell that starts like a formula.

### 4. Accept voice

A driver can send the desk a short voice clip from the road. Set `inputs.voice.accept` to the audio types that a clip can have. The same three caps apply. A turn sends clips in `input.voice`.

Only a `text` profile takes voice clips.

```ts frame=profile:text
inputs: {
	voice: { accept: ['audio/*'] },
	maxFiles: 1,
	maxBytes: 2_000_000,
	maxTurnBytes: 2_000_000,
},
```

### 5. Offer fixed choices

The desk answers by email or by chat, and the reply is different for each. Use `inputs.slots` when a turn must pick from a fixed list. Each key is a slot name. Its value lists the choices.

```ts frame=profile:text
inputs: {
	slots: { channel: ['email', 'chat'] },
},
```

A turn passes its choice in `input.slots`. A profile can also use the choice to select its reply schema ([Declaring outputs](/docs/outputs)).

## Other agent types

The other four types do not use the fields above ([Choosing a modality](/docs/modalities)).

- A `speech` profile has no `inputs`. The text of the turn is the transcript.
- A `host` profile runs tools and takes no turn, so it has no `inputs`.
- A `live` profile sets its channels in `live.ingress`.
- A `decision` profile reads JSON state. Its `inputs` holds `state` and `maxStateBytes` only.

## Open live channels

A live session takes audio, video and text on separate channels. Audio and video are on when you leave them out. Text is off when you leave it out. At least one channel must be on.

```ts frame=profile:live
live: {
	ingress: { audio: true, video: true, text: false },
},
```

## Cap decision state

A decision call sends JSON state. The state must not be `null`. Set `inputs.maxStateBytes` to a positive whole number to cap its size. Without it, the state has no cap.

`runDecision` throws a `DecisionError` with code `invalid_request` in three cases ([Running a turn](/docs/runner)):

- The state is `null`.
- The state cannot become JSON.
- The state is over the cap.

```ts frame=profile:decision
inputs: { state: 'json', maxStateBytes: 65_536 },
```

## Fix a refused turn

`runTurn` throws a `TheoremError` when a turn breaks the profile. A file error lists one code for each problem.

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
