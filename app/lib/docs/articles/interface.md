---
title: Building the interface
updated: 2026-10-07
summary: Serve one profile from your server and show a chat that reads it.
entry: src/interface/mod.ts
covers: src/interface
cover: /imagery/th30_lapis.png
coverAlt: A lapis lake among green hills
coverPosition: 100% 75%
suggest: 4
---

Show the agent to people. The chat in the browser reads what it can offer from the same profile that your server runs.

## The idea

A chat screen has many small facts in it. Can the user attach a file? Which models can the user choose? What does the error line say? In most applications, the client code repeats these facts, and the copy goes out of date.

In Theorem, the server sends the browser an **interface**: the profile without its secrets. The screen reads the inputs, the models, the tool names and the wording from it. If you change the profile, the screen changes.

```figure
{
	"kind": "sequence",
	"still": {
		"src": "/imagery/th30_lapis.png",
		"position": "40% 50%"
	},
	"caption": "The profile, the keys, the tools and the instruction stay on your server. The browser receives only the interface and the events.",
	"steps": [
		{
			"label": "Your server sends the interface",
			"text": "createTheoremHandler answers a GET request with the profile without its secrets."
		},
		{
			"label": "The browser draws the chat",
			"text": "TheoremChat reads the inputs, the models, the tool names and the wording from the interface."
		},
		{
			"label": "The browser sends a turn",
			"text": "It keeps the transcript, and it sends the new message to your server."
		},
		{
			"label": "Your server runs the turn",
			"text": "It streams the events back as NDJSON, and the browser shows them."
		},
		{
			"label": "The user approves a tool",
			"text": "The browser asks the user. Your server runs the tool only after a yes."
		}
	]
}
```

Three packages share the work:

- `createTheoremHandler` from `@theoremjs/react/server` sends the interface and runs the turns.
- `@theoremjs/react` reads the interface in the browser.
- `interfaceFromProfile` from `@theoremjs/agents/interface` builds the same `ProfileInterface` for a client of your own.

## Put the Harbor desk on a page

These three steps put the Harbor front desk on a web page. You need the profile ([Setting the identity](/docs/identity)) and each tool that `tools.allow` names ([Registering tools](/docs/tools)).

This chapter is about turns. A live profile uses `LiveRunner` ([Choosing a modality](/docs/modalities)).

### 1. Mount the handler

Pass the profile and the provider keys. `provider.vault` holds each key under a slot name. The slot is the `key` of the profile.

```ts
import { createTheoremHandler } from '@theoremjs/react/server';

export const handler = createTheoremHandler({
	profile,
	provider: { vault: { main: process.env.OPENROUTER_API_KEY } },
});
```

Mount the returned function on one catch-all route. It takes a `Request` and returns a `Response`.

### 2. Show the chat

Render `<TheoremChat endpoint="/api/theorem" />` from `@theoremjs/react/ui`. The `endpoint` is the route where you mounted the handler. The default is `/api/theorem`.

The chat reads the interface, then runs turns against the same route.

### 3. Answer a tool that waits

The desk takes a payment only after the user approves it. A tool that waits for the user is at a **gate**. A `tool` event with `phase: 'gate'` marks it. Its `gate.kind` is `confirmation`, `permission` or `auth`. The chat shows an approval prompt or a sign-in prompt for it.

`useTheoremChat` and `<TheoremChat />` answer the gate for you. If you write the transport calls, use `transport.invoke`.

```ts frame=statements
await transport.invoke(
	{ gateId, decision: 'approve' },
	onEvent,
)
```

The client answers with `POST /invoke`. The server runs the tool and streams the events that follow. The body has these fields:

Field | Required | What it is
--- | --- | ---
`gateId` | Yes | The call id of the tool
`decision` | Yes | `approve` or `deny`
`input` | No | The edit that the user made to the tool input
`secret` | No | A key that the user typed at a sign-in prompt

For an OAuth gate, pass `authorizationUrl` to the handler. It starts the flow with `createOAuthPkceFlow` and returns the sign-in URL. Your callback route saves the token in the `credentialStore` under the same session id. The gate then resumes with the gate id alone ([Registering tools](/docs/tools)). Without `authorizationUrl`, the gate carries no sign-in URL.

## Know how long a gate waits

A user does not always answer an approval immediately. A gate waits `gateTtlMs` milliseconds. The default is 30 minutes. The handler refuses a later answer with `session.gate_expired`: "Sorry, that step is no longer waiting for approval."

A new message while a gate waits walks away from it. The client sends the message to `/turn` with `abandon`, which names the waiting calls. The server settles each call as abandoned and then runs the new turn.

A request can end before it settles a call, for example when the client disconnects. The server then puts the call back to wait, so the user can answer again. See [Running a turn](/docs/runner).

## Build your own screen

Use the hooks when you draw the chat with your own components.

- `useTheoremInterface` loads the interface.
- `useTheoremChat` keeps the transcript, the drafts and the gates.

`useTheoremChat` takes a turn interface. A live interface is not one, so check `iface.type` first.

Bind each control to `iface`: `inputs`, `tools.allow`, `models` and `lexicon`. A text profile also has `allowSteering`. Do not write these fields again in the client ([Declaring inputs](/docs/inputs), [Describing statuses](/docs/statuses)).

```ts
import { createHttpTransport, useTheoremChat, useTheoremInterface } from '@theoremjs/react';

const transport = createHttpTransport({ endpoint: '/api/theorem' });

export function useMyChat() {
	const described = useTheoremInterface(transport);
	const chat = useTheoremChat({
		transport,
		iface: described.status === 'ready' && described.iface.type !== 'live' ? described.iface : null,
	});
	return chat.phase;
}
```

## Know the routes

A client of your own calls the handler over HTTP. The handler answers four routes under its mount point.

Route | What it does
--- | ---
`GET` on the mount point | Returns `{ interface }`
`POST /turn` | Runs a turn and streams the events
`POST /invoke` | Answers a tool that waits at a gate
`POST /steer` | Adds a message to a turn that is running

The handler removes the system prompt from the interface before it sends it. The profile, the keys and the prompt stay on the server.

## Set who the user is

The handler keeps the open gates and the tool credentials of each session. Use `session` when you have your own sign-in.

- `session` receives the `Request` and returns a session id. Build the id from the user id and the conversation id.
- If `session` returns `undefined`, the handler refuses the request with status 401.
- Without `session`, the handler sets an HttpOnly cookie named `theorem_session`.

`sessionStore`, `credentialStore` and `steerInbox` keep open gates, tool credentials and queued steers. Their default is process memory.

```warning
If requests can reach different instances of your server, pass stores that every instance shares. A gate in the memory of one instance is not visible to the others.
```

## Fix a chat that fails

Each row is one failure, its cause and its fix.

What you see | Cause | Fix
--- | --- | ---
`createTheoremHandler` throws when you create it | The profile is `live`, `host` or `decision` | Use `createTheoremHostHandler` for a host profile and `createTheoremDecisionHandler` for a decision profile. A live profile uses `LiveRunner`
Status 401 | `session` returned `undefined` | Return a session id for a signed-in user
The user reads "Sorry, the assistant can’t connect at the moment." | The profile’s key slot is empty in `provider.vault` (an `error` event of kind `auth`) | Fill the slot ([Binding models](/docs/models))
A turn ends with a `config` error | `provider` has no `vault` for an OpenRouter or Google model | Pass `provider.vault`
`session.gate_expired` | The answer came after `gateTtlMs`, or reached an instance that does not hold the gate | Answer sooner, or pass a shared `sessionStore`
`session.turn_ended` | A steer reached an instance that does not hold the turn | Pass a shared `steerInbox`
