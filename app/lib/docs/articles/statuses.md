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

Use `lexicon` when the words Theorem shows your users do not match your product, such as an error line or a file-size notice. Each key names one line. A replacement changes the words only. It does not change whether a check runs ([Setting guardrails](/docs/guardrails)) or whether a tool asks for consent ([Registering tools](/docs/tools)).

## Replace a line

Add `lexicon` to the profile and name each key you replace. A key you leave out keeps its default wording.

```ts frame=profile:text
lexicon: {
	'error.auth': 'Sorry, please sign in again to continue.',
},
```

## Which keys exist

Most keys are lines a person reads, such as `error.safety` and `attachments.file_too_large`. Some keys are notes the model reads, such as `canary.bind_note` and `taint.blocked`. `LEXICON_KEYS` lists them all, and the dictionary on this page shows each default wording. `defineProfile` refuses a key that is not in the list.

## Replace a line for every profile

Call `overrideLexicon` once to replace lines for every profile in the process. A profile’s own `lexicon` wins over `overrideLexicon`, and `overrideLexicon` wins over the defaults. `resetLexicon` removes every process-wide replacement.

```ts frame=statements
overrideLexicon({
	'egress.refusal': 'Sorry, I cannot share that.',
})
```

## Where a replacement applies

Every profile type takes `lexicon`. Each `error` event that `runTurn` delivers carries its line in the `error` field.

If your server shows an error itself, call `publicError(err, profile.lexicon)`. Without the second argument, the profile’s wording is skipped. For a refused file, call `attachmentIssueText(issue, profile.lexicon)`.

The browser interface receives only the keys in `CLIENT_LEXICON_KEYS`: errors, file and voice notices, session states and two tool lines. The repair, canary, taint and egress lines stay on the server. See [Building the interface](/docs/interface).

## Keep the placeholders

A line can hold placeholders in curly braces, such as `{canary}`. Use only the placeholders that the key fills. `defineProfile` refuses a replacement that names any other.

One placeholder is required. `canary.bind_note` must keep `{canary}`, because Theorem uses that line to tell the model its canary token.

```ts frame=profile:text
lexicon: {
	'canary.bind_note': 'Session token: {canary}',
},
```

## Fix a refused replacement

What you see | Cause | Fix
--- | --- | ---
`config` error: unknown lexicon key | The key is not in `LEXICON_KEYS` | Use a key from the dictionary on this page
`config` error: a placeholder is never filled in | The line names a placeholder that the key does not fill | Use only the placeholders that the key’s default line shows
`config` error: must contain `{canary}` | `canary.bind_note` has no `{canary}` | Keep `{canary}`, because Theorem tells the model its token with this line
