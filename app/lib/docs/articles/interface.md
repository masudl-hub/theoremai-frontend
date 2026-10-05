---
title: Building the interface
updated: 2026-10-05
summary: Serve one profile from your server and show a chat in the browser that reads its inputs, models and tools from that profile.
entry: src/interface/mod.ts
covers: src/interface
cover: /imagery/th30_lapis.png
coverAlt: A lapis lake among green hills
coverPosition: 100% 75%
suggest: 4
---

Use the Theorem interface to build a chat screen that always matches the agent your server runs. The **interface** is the profile without its secrets. The screen reads the inputs, models, tool names and wording from it. You do not copy them into the client.

`createTheoremHandler` from `@theoremjs/react/server` serves the interface and runs the turns. `@theoremjs/react` reads it in the browser. `interfaceFromProfile` from `@theoremjs/agents/interface` builds the same `ProfileInterface` for a client of your own.

## Before you begin

Define the profile ([Defining identity](/docs/identity)). The handler registers it. Register every tool that `tools.allow` names, because the host registers tools ([Registering tools](/docs/tools)). This page covers turns. A live profile uses `LiveRunner` ([Choosing a modality](/docs/modalities)).

## See what runs where

```text
Browser                              Your server
-------                              -----------
<TheoremChat />  --- GET   /------>  createTheoremHandler
  reads the interface                  profile, keys, tools, prompt
  keeps the transcript  --- POST /turn --->  runs the turn
  asks the user         --- POST /invoke ->  runs the approved tool
  shows the events <-- NDJSON events ---
```

## Mount the handler

Pass the profile and the provider keys. `provider.vault` holds each key under a slot name. The slot is the `key` of the profile.

Mount the returned function on one catch-all route. It takes a `Request` and returns a `Response`.

```ts
import { createTheoremHandler } from '@theoremjs/react/server';

export const handler = createTheoremHandler({
	profile,
	provider: { vault: { main: process.env.OPENROUTER_API_KEY } },
});
```

## Show the chat

Render `<TheoremChat endpoint="/api/theorem" />` from `@theoremjs/react/ui`. The `endpoint` is the route where you mounted the handler. The default is `/api/theorem`. The chat reads the interface, then runs turns against the same route.

## Build your own screen

Use the hooks when you draw the chat yourself. `useTheoremInterface` loads the interface. `useTheoremChat` keeps the transcript, the drafts and the gates.

`useTheoremChat` takes a turn interface. A live interface is not one, so check `iface.type` first. Bind each control to `iface`: `inputs`, `tools.allow`, `models` and `lexicon`. A text profile also has `allowSteering`. Do not write these fields again in the client. See [Declaring inputs](/docs/inputs) and [Describing statuses](/docs/statuses).

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

The handler answers four routes under its mount point. `GET` on the mount point returns `{ interface }`. `POST` on `/turn` runs a turn and streams the events. `POST` on `/invoke` answers a tool that is waiting. `POST` on `/steer` adds a message to a running turn.

The handler removes the system prompt from the interface before it sends it. The profile, the keys and the prompt stay on the server.

## Set who the user is

Use `session` when you have your own sign-in. It receives the `Request` and returns a session id, built from the user id and the conversation id. If it returns `undefined`, the handler refuses the request with status 401. Without `session`, the handler sets an HttpOnly cookie named `theorem_session`.

`sessionStore`, `credentialStore` and `steerInbox` keep open gates, tool credentials and queued steers. Their default is process memory. Pass stores that every instance shares when requests can reach different instances.

## Fix a chat that fails

What you see | Cause | Fix
--- | --- | ---
`createTheoremHandler` throws when you create it | The profile is `live`, `host` or `decision` | Use `createTheoremHostHandler` for a host profile and `createTheoremDecisionHandler` for a decision profile. A live profile uses `LiveRunner`
Status 401 | `session` returned `undefined` | Return a session id for a signed-in user
The user reads "Sorry, the assistant can’t connect at the moment." | The profile’s key slot is empty in `provider.vault` (an `error` event of kind `auth`) | Fill the slot ([Binding models](/docs/models))
A turn ends with a `config` error | `provider` has no `vault` for an OpenRouter or Google model | Pass `provider.vault`
`session.gate_expired` | The answer came after `gateTtlMs`, or reached an instance that does not hold the gate | Answer sooner, or pass a shared `sessionStore`
`session.turn_ended` | A steer reached an instance that does not hold the turn | Pass a shared `steerInbox`

## Answer a tool that waits

A tool can wait for the user. A `tool` event with `phase: 'gate'` marks it, and its `gate.kind` is `confirmation`, `permission` or `auth`. The chat shows an approval or sign-in prompt for it.

The client answers with `POST /invoke`. The body has two required fields: `gateId` (the call id of the tool) and `decision` (`approve` or `deny`). It has two optional fields: `input` (the user’s edit) and `secret` (a key typed at a sign-in prompt). The server runs the tool and streams the events that follow.

`useTheoremChat` sends this request for you. Use `transport.invoke` when you build the transport calls yourself. For an OAuth gate, pass `authorizationUrl` to the handler. It starts the flow with `createOAuthPkceFlow` and returns the sign-in URL. Your callback route saves the token in the `credentialStore` under the same session id, and the gate resumes with the gate id alone ([Registering tools](/docs/tools)). Without `authorizationUrl`, the gate carries no sign-in URL.

```ts frame=statements
await transport.invoke(
	{ gateId, decision: 'approve' },
	onEvent,
)
```

## Know how long a gate waits

A gate waits `gateTtlMs` milliseconds. The default is 30 minutes. The handler refuses a later answer with `session.gate_expired`: "Sorry, that step is no longer waiting for approval."

A new message while a gate waits walks away from it. The client sends the message to `/turn` with `abandon`, which names the waiting calls. The server settles each call as abandoned and then runs the new turn.

A request can end before it settles a call, for example when the client disconnects. The server then puts the call back to wait, so the user can answer again. See [Running a turn](/docs/runner).
