---
title: Setting the identity
updated: 2026-10-05
summary: Name your agent and tell the model who it is. Change the instruction by role, add one for a request, and keep secret lines out of replies.
entry: src/kernel/registry/profiles.ts
covers: src/kernel/registry/profiles.ts, src/kernel/registry/system-prompt.ts, src/kernel/registry/system-role.ts, src/kernel/system-parts.ts
cover: /imagery/th30_amethyst.png
coverAlt: Amethyst seams in a grey cliff
coverPosition: 0% 100%
---

Set `identity` to give an agent a name for people and an instruction for the model. `handle` is the name. `system` is the instruction that the model reads on every turn.

The profile holds both, so no request has to repeat them.

```ts frame=profile:text
identity: {
	handle: 'support',
	system: 'You help with account questions.',
},
```

## Set the handle and the instruction

- `handle` is required. It is the display name for hosts and users. Theorem does not send it to the model.
- `system` is optional. If you leave it out, the profile sends no instruction.

`text`, `image` and `live` take `handle`, `system` and `systemByRole`. `speech` and `decision` take `handle` only. `host` has no `identity` ([Choosing a modality](/docs/modalities)).

## Change the instruction by role

Use `systemByRole` when one agent needs a different instruction for different readers, for example a customer and an engineer. It maps a role name to an instruction. The request names the role in `input.role`.

Theorem picks the instruction in this order:
1. If `input.role` is a key of `systemByRole`, it uses that line.
2. Otherwise it uses `systemByRole[handle]`, if that key exists.
3. Otherwise it uses `system`.

```ts frame=profile:text
identity: {
	handle: 'support',
	system: 'You help with account questions.',
	systemByRole: {
		engineer: 'You help engineers debug account issues.',
	},
},
```

```ts frame=request
input: { text: 'The export is stuck.', role: 'engineer' }
```

## Keep secret lines out of replies

Use this when the instruction holds text that the agent must not repeat, such as an internal rule. Write `system` as a list of parts. Mark each secret part as `{ private: text }`.

Without a mark, the whole instruction is private. The agent cannot repeat any of it. Once you mark one part, the plain parts beside it become shareable. The agent can then say a greeting word for word.

The **canary** is a secret token that Theorem plants at the end of the instruction. While `guardrails.canary` is on ([Setting guardrails](/docs/guardrails)), `guardrails.promptEcho` stops a reply that repeats 12 words in a row of a private part. Both are on by default.

```ts frame=profile:text
identity: {
	handle: 'harbor',
	system: [
		'Greet with: "Thanks for calling Harbor, how can I help?" ',
		{ private: 'Refunds over $200 need a supervisor code.' },
	],
},
```

## What the private mark does not do

- The check compares words. It does not catch a paraphrase. Do not put a real secret in the prompt.
- A mark in a request’s `system` does not change the profile line. The profile line stays private.
- Theorem’s own notes to the model are always private.

In the [playground](/playground), write the prompt as one text. Wrap each private section as `{private: …}`. The exported profile holds the parts.

## Add an instruction for one request

Use a request `system` when one request needs an extra instruction. Pass `system` on the request to `runTurn` or `runSession`.

Theorem places it after the profile line, with a blank line between them. It sends the profile line as written. It applies the profile’s `sanitizeInput` and `redactSensitive` guardrails to the request line.

```ts frame=request-object
{
	input: { text: 'The export is stuck.', role: 'engineer' },
	system: 'Cite the ticket id if you have one.',
}
```

## Fix a role that does not behave

What you see | Why | Fix
--- | --- | ---
A request with an unknown role gets a role line | `systemByRole` has a key equal to the `handle`, so that line answers every request that names no known role | Rename the key, or remove it
A request fails with a `config` error on a speech profile | A speech profile takes no `system`, because the input text is the transcript | Remove `system` from the request
A live session ignores a role | A live session has no `input.role`. It uses `systemByRole[handle]`, then `system` | Put the live instruction in `system`
