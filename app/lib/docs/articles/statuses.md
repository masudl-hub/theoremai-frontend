---
title: Describing statuses
updated: 2026-10-23
summary: Replace the words Theorem shows people and the notes it sends to the model.
entry: src/guardrails/labels.ts
covers: src/kernel/turn-events.ts, src/kernel/stop.ts, src/guardrails/labels.ts, src/guardrails/error.ts
cover: /imagery/th30_corals.png
coverAlt: Coral reefs in turquoise water
coverPosition: 96% 6%
---

Change the words that Theorem says. Each line that a user reads has a key that you can replace. So does each line that Theorem sends to the model.

## The idea

An agent says more than its replies. It tells a user that a file is too large, or that the model is not available. In most applications, these lines are strings in many files, and no one knows the full list.

In Theorem, each line is a **label**, kept under a key. `LABEL_KEYS` lists all the keys, and the dictionary on this page shows the default wording of each one.

To change a line, you replace it by key. Theorem looks for the wording in three places, in this order:

```figure
{
	"kind": "sequence",
	"layout": "row",
	"still": {
		"src": "/imagery/th30_corals.png",
		"position": "40% 50%"
	},
	"caption": "Theorem uses the first place that has the key.",
	"steps": [
		{
			"label": "profile.labels",
			"text": "The wording of one profile."
		},
		{
			"label": "overrideLabels",
			"text": "The wording of every profile."
		},
		{
			"label": "The default line",
			"text": "The wording from Theorem."
		}
	]
}
```

A replacement changes the words only. It does not change if a check runs ([Setting guardrails](/docs/guardrails)), or if a tool asks for consent ([Registering tools](/docs/tools)).

## Give the Harbor desk its own words

Harbor wants its sign-in error to sound like Harbor. These steps replace that line, then replace a line for all Harbor agents.

### 1. Find the key

The main groups of keys are:

- Lines that a person reads, such as `error.safety` and `attachments.file_too_large`.
- Notes that the model reads, such as `canary.bind_note` and `taint.blocked`.
- Internal provider diagnostics under `provider.*`. Replace these server diagnostics with `overrideLabels`. Public failures use `error.*` wording.

Internal provider diagnostics do not travel to the browser. The client receives the public failure wording instead.

`defineProfile` refuses a key that is not in `LABEL_KEYS`.

### 2. Replace the line in the profile

Add `labels` to the profile, and name each key that you replace. A key that you leave out keeps its default wording. Every type of profile takes `labels`.

```ts frame=profile:text
labels: {
	'error.auth': 'Sorry, please sign in again to continue.',
},
```

### 3. Replace a line for every profile

Call `overrideLabels` one time to replace lines for every profile in the process. The `labels` of a profile wins over `overrideLabels`. `resetLabels` removes every replacement that `overrideLabels` made.

```ts frame=statements
overrideLabels({
	'egress.refusal': 'Sorry, I cannot share that.',
})
```

### 4. Keep the placeholders

A line can hold placeholders in curly braces, such as `{canary}`. Theorem fills them when it uses the line.

- Use only the placeholders that the key fills. `defineProfile` refuses a replacement that names any other.
- `canary.bind_note` must keep `{canary}`. Theorem uses that line to tell the model its canary token.

```ts frame=profile:text
labels: {
	'canary.bind_note': 'Session token: {canary}',
},
```

## Where a replacement applies

A replacement reaches the user by three paths. Know which one your code uses.

- **Events.** Each `error` event that `runTurn` delivers carries its line in the `error` field.
- **Your server.** If your server shows an error, call `publicError(err, profile.labels)`. Without the second argument, the wording of the profile is skipped. For a refused file, call `attachmentIssueText(issue, profile.labels)`.
- **The browser.** The interface receives only the keys in `CLIENT_LABEL_KEYS`: errors, stop notices, file and voice notices, session states, three tool lines, the two composer lines and `detect.blocked`. The repair, canary, taint and egress lines stay on the server ([Building the interface](/docs/interface)).

## Fix a refused replacement

`defineProfile` checks each replacement. Each row is one error and its fix.

What you see | Cause | Fix
--- | --- | ---
`config` error: unknown labels key | The key is not in `LABEL_KEYS` | Use a key from the dictionary on this page
`config` error: a placeholder is never filled in | The line names a placeholder that the key does not fill | Use only the placeholders that the key’s default line shows
`config` error: must contain `{canary}` | `canary.bind_note` has no `{canary}` | Keep `{canary}`, because Theorem tells the model its token with this line
