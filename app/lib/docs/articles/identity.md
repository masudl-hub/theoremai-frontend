---
title: Setting the identity
updated: 2026-10-07
summary: Name your agent, tell the model who it is, and hide secret lines.
entry: src/kernel/registry/profiles.ts
covers: src/kernel/registry/profiles.ts, src/kernel/registry/system-prompt.ts, src/kernel/registry/system-role.ts, src/kernel/system-parts.ts
cover: /imagery/th30_amethyst.png
coverAlt: Amethyst seams in a grey cliff
coverPosition: 0% 100%
---

Give the agent a name for people and an instruction for the model. Both are in the profile, so no request repeats them.

## The idea

The **instruction** is the text that tells the model who it is and how to answer. Many applications build this text in the route, from strings in different files. The text that the model reads then depends on which code ran.

In Theorem, `identity` holds the instruction. On each turn, Theorem builds the text for the model from three sources, always in the same order.

```figure
{
	"kind": "sequence",
	"still": {
		"src": "/imagery/th30_amethyst.png",
		"position": "40% 50%"
	},
	"caption": "Theorem joins the three lines in this order. The result is the instruction that the model reads.",
	"steps": [
		{
			"label": "The profile line",
			"text": "identity.system, or the line in identity.systemByRole for the role of the reader."
		},
		{
			"label": "The request line",
			"text": "An extra instruction that one request adds."
		},
		{
			"label": "Theorem's notes",
			"text": "Notes that Theorem writes, such as the canary."
		}
	]
}
```

A **canary** is a secret token. If the token appears in a reply, the reply leaked the instruction.

A request can add a line. It cannot remove or replace the profile line.

## Write the identity of the Harbor desk

These four steps write the identity of the Harbor front desk. Each step adds one part. You can stop after step 1.

### 1. Name the agent and write its instruction

`handle` is the name of the agent. `system` is the instruction.

- `handle` is required. It is the display name for your application and its users. It can have at most 32 characters. Theorem does not send it to the model.
- `system` is optional. If you leave it out, the profile sends no instruction.

```ts frame=profile:text
identity: {
	handle: 'desk',
	system: 'You are the Harbor front desk. Answer in short sentences.',
},
```

### 2. Give each role its own instruction

A customer and a dispatcher ask the desk different questions. Use `systemByRole` when one agent needs a different instruction for each kind of reader. It maps a role name to an instruction. The request names the role in `input.role`.

```ts frame=profile:text
identity: {
	handle: 'desk',
	system: 'You are the Harbor front desk. Answer in short sentences.',
	systemByRole: {
		dispatcher: 'You help Harbor dispatchers. Give hold codes and dock numbers.',
	},
},
```

```ts frame=request
input: { text: 'Why is H-2291 on hold?', role: 'dispatcher' }
```

Theorem picks the profile line in this order:

1. If `input.role` is a key of `systemByRole`, Theorem uses that line.
2. If not, Theorem uses `systemByRole[handle]`, if that key exists.
3. If not, Theorem uses `system`.

### 3. Mark the lines that the agent must not repeat

The desk has one internal rule that a customer must not read. It also has a greeting that the agent must say word for word. Write `system` as a list of parts, and mark each secret part as `{ private: text }`.

```ts frame=profile:text
identity: {
	handle: 'desk',
	system: [
		'Greet with: "Thanks for calling Harbor, how can I help?" ',
		{ private: 'Refunds over $200 need a supervisor code.' },
	],
},
```

The mark changes what the agent can repeat:

- With no mark, the whole instruction is private. The agent cannot repeat any of it.
- With one mark or more, the marked parts are private. The agent can repeat the plain parts.

The `prompt_leak` detector enforces the mark. It reads for 12 words in a row of a private part. Without a setting, it blocks a reply that repeats them ([Setting guardrails](/docs/guardrails)).

In the [playground](/playground), write the instruction as one text. Wrap each private section as `{private: …}`. The profile in the code you get from the playground holds the parts.

### 4. Add an instruction for one request

One request sometimes needs an instruction that the others do not. Pass `system` on the request to `runTurn` or `runSession`.

```ts frame=request-object
{
	input: { text: 'Why is H-2291 on hold?', role: 'dispatcher' },
	system: 'Cite the ticket id if you have one.',
}
```

Theorem puts the request line after the profile line, with a blank line between them. It sends the profile line as you wrote it. It checks the request line with the guardrails of the profile.

## What the private mark does not do

The mark protects the words of a line. It does not make the line a safe place for a secret.

- The check compares words. It does not catch a paraphrase. Do not put a password or a key in the instruction.
- A mark in the request line does not change the profile line. A profile line with no mark stays private.
- Theorem's own notes to the model are always private.

## Which profiles take an identity

Not every type of profile reads an instruction ([Choosing a modality](/docs/modalities)).

Profile type | `handle` | `system` and `systemByRole`
--- | --- | ---
`text`, `image`, `live` | Yes | Yes
`speech`, `decision` | Yes | No
`host` | No `identity` | No `identity`

## Fix a role that does not behave

What you see | Why | Fix
--- | --- | ---
A request with an unknown role gets a role line | `systemByRole` has a key equal to the `handle`. That line answers every request that names no known role | Rename the key, or remove it
A request fails with a `config` error on a speech profile | A speech profile takes no `system`, because the input text is the transcript | Remove `system` from the request
A live session ignores a role | A live session has no `input.role`. It uses `systemByRole[handle]`, then `system` | Put the live instruction in `system`
