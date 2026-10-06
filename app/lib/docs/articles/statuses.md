---
title: Describing statuses
updated: 2026-10-05
summary: Replace the words Theorem shows people, such as error and file notices, and the notes it sends to the model, key by key.
entry: src/guardrails/lexicon.ts
covers: src/kernel/turn-events.ts, src/kernel/stop.ts, src/guardrails/lexicon.ts, src/guardrails/error.ts
cover: /imagery/th30_corals.png
coverAlt: Coral reefs in turquoise water
coverPosition: 96% 6%
---

Change the words that Theorem says. Each line that a user reads has a key that you can replace. So does each line that Theorem sends to the model.

## The idea

An agent says more than its replies. It tells a user that a file is too large, or that the model is not available. In most applications, these lines are strings in many files, and no one knows the full list.

In Theorem, each line is in the **lexicon** under a key. `LEXICON_KEYS` lists all the keys, and the dictionary on this page shows the default wording of each one.

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
			"label": "profile.lexicon",
			"text": "The wording of one profile."
		},
		{
			"label": "overrideLexicon",
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

There are two groups of keys:

- Lines that a person reads, such as `error.safety` and `attachments.file_too_large`.
- Notes that the model reads, such as `canary.bind_note` and `taint.blocked`.

`defineProfile` refuses a key that is not in `LEXICON_KEYS`.

### 2. Replace the line in the profile

Add `lexicon` to the profile, and name each key that you replace. A key that you leave out keeps its default wording. Every type of profile takes `lexicon`.

```ts frame=profile:text
lexicon: {
	'error.auth': 'Sorry, please sign in again to continue.',
},
```

### 3. Replace a line for every profile

Call `overrideLexicon` one time to replace lines for every profile in the process. The `lexicon` of a profile wins over `overrideLexicon`. `resetLexicon` removes every replacement that `overrideLexicon` made.

```ts frame=statements
overrideLexicon({
	'egress.refusal': 'Sorry, I cannot share that.',
})
```

### 4. Keep the placeholders

A line can hold placeholders in curly braces, such as `{canary}`. Theorem fills them when it uses the line.

- Use only the placeholders that the key fills. `defineProfile` refuses a replacement that names any other.
- `canary.bind_note` must keep `{canary}`. Theorem uses that line to tell the model its canary token.

```ts frame=profile:text
lexicon: {
	'canary.bind_note': 'Session token: {canary}',
},
```

## Where a replacement applies

A replacement reaches the user by three paths. Know which one your code uses.

- **Events.** Each `error` event that `runTurn` delivers carries its line in the `error` field.
- **Your server.** If your server shows an error, call `publicError(err, profile.lexicon)`. Without the second argument, the wording of the profile is skipped. For a refused file, call `attachmentIssueText(issue, profile.lexicon)`.
- **The browser.** The interface receives only the keys in `CLIENT_LEXICON_KEYS`: errors, file and voice notices, session states, two tool lines and `detect.blocked`. The repair, canary, taint and egress lines stay on the server ([Building the interface](/docs/interface)).

## Fix a refused replacement

`defineProfile` checks each replacement. Each row is one error and its fix.

What you see | Cause | Fix
--- | --- | ---
`config` error: unknown lexicon key | The key is not in `LEXICON_KEYS` | Use a key from the dictionary on this page
`config` error: a placeholder is never filled in | The line names a placeholder that the key does not fill | Use only the placeholders that the key’s default line shows
`config` error: must contain `{canary}` | `canary.bind_note` has no `{canary}` | Keep `{canary}`, because Theorem tells the model its token with this line
