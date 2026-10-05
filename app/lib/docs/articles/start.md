---
title: Getting started
updated: 2026-10-05
summary: Write an agent once as a profile, run your first turn in three steps, and see why a request cannot ask for more than the profile states.
entry: src/kernel/engine/runner/mod.ts
covers: mod.ts, src/kernel/engine/runner, src/kernel/registry/profiles.ts
cover: /imagery/th30_emeraldriver.png
coverAlt: A green river through red canyons
coverPosition: 100% 100%
suggest: 1
---

Define an agent once, as a **profile**. Theorem checks the profile, then runs every request from it.

## The idea

An agent is more than a prompt. It is also a model, a list of tools, the input that it accepts, the shape of its reply and the checks around it.

In most applications, these parts are in different files. The prompt is in one file. The tool list is in a second file. The input checks are in a route. Each part changes alone, and after some time the parts do not agree. This is **drift**.

In Theorem, all the parts are in one object, the profile. A profile states:

- who the agent is: its name and its instruction
- which models the agent can use, and which key each model takes
- which tools the agent can call
- what the agent accepts: text, files, voice or fixed choices
- what the agent returns: text, JSON that a schema checks, an image or speech
- how Theorem guards each input and each output

Theorem reads the profile at two moments.

- **When your application starts.** `defineProfile` checks the profile. It throws if a field is missing, or if a field does not belong to the type of agent.
- **On every turn.** `runTurn` runs the request from the profile. The request supplies the input. It cannot add a tool, and it can choose a model only if the profile allows that.

Change the profile, and every turn changes. No other code describes the agent.

```text
            ┌─────────────────────────────┐
            │        agent profile        │
            │  identity · models · tools  │
            │  inputs · outputs · guards  │
            └──────────────┬──────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌───────────────────┐             ┌───────────────────┐
│ AT START          │             │ ON EVERY TURN     │
│ defineProfile     │             │ runTurn           │
│                   │             │                   │
│ checks the        │  request ─► │ runs the request  │ ─► events
│ profile once      │             │ from the profile  │
└───────────────────┘             └───────────────────┘
```

## Install

```bash
npm install @theoremjs/agents zod
```

```bash
deno add jsr:@theoremjs/agents
```

## Quick start

These three steps define one agent and ask it one question. The agent is the front desk of Harbor, a company that moves freight. You need an OpenRouter key in `OPENROUTER_API_KEY`.

### 1. Define the profile

This profile is a text agent with one model and no tools. `defineProfile` checks it. `registerProfile` stores it under its `id`, so that a request can name it.

```ts
import { defineProfile, registerProfile } from '@theoremjs/agents';

const desk = defineProfile({
	type: 'text',
	id: 'harbor.desk',
	identity: { handle: 'desk', system: 'You are the Harbor front desk. Answer in short sentences.' },
	models: {
		main: { protocol: 'openAi', provider: 'openrouter', apiId: 'openrouter/free' },
	},
	key: 'openrouter',
	tools: { allow: [] },
	inputs: { text: true },
});

registerProfile(desk);
```

### 2. Give the profile a key

A profile never holds a key. It names a **key slot**, here `openrouter`. You fill the slot in a **vault**, an object that maps each slot name to a key.

`createProvider` binds the profile to its model and to the vault. The profile can then stay in your repository, and the key stays in your environment.

```ts frame=statements
import { createProvider } from '@theoremjs/agents';

const provider = createProvider(desk, {
	vault: { openrouter: process.env.OPENROUTER_API_KEY },
});
```

### 3. Run a turn

A **turn** is one request to the agent and its reply. `runTurn` runs the turn and returns a stream of events. Each `text` event carries a piece of the reply.

```ts frame=statements
import { runTurn } from '@theoremjs/agents';

for await (const event of runTurn(
	{ profile: 'harbor.desk', input: { text: 'Where do I find hold H-2291?' } },
	provider,
)) {
	if (event.type === 'text') process.stdout.write(event.text);
}
```

## What the turn did

Theorem did more than call the model. For this one request, Theorem did these steps in order:

1. It found the profile `harbor.desk`, its model and its key.
2. It cleaned the input text and redacted sensitive data.
3. It sent the instruction with a **canary** at the end. A canary is a secret token. If the token appears in a reply, the reply leaked the instruction.
4. It checked the reply before it released any text.
5. It gave you the reply as events.

The profile did not ask for steps 2, 3 and 4. A profile that sets no `guardrails` keeps them on. [Setting guardrails](/docs/guardrails) explains each one.

## The profile is the limit

A request cannot ask for more than the profile states. With the profile above:

- Theorem refuses a request that sets `model`, because the profile does not set `allowModelSelect`.
- Theorem refuses a request that sends `input.slots`, because the profile declares no slots.
- The model sees no tools, because `tools.allow` is empty.

To allow one of these, change the profile. No request and no other file can allow it. This is why the profile and the agent cannot drift apart.

## A full profile: the Harbor desk

The quick start used a small part of a profile. The program below is the Harbor desk with more of its parts. It reads a photo or a PDF, finds the hold on a shipment, measures a road leg and answers in a fixed JSON shape.

Each later chapter explains one part of this program.

```ts seed=firstTurn
```

```playground
firstTurn
```

```prompt
Install `@theoremjs/agents` and `zod`.

Copy the Harbor desk program from the docs fence in full (tools, structured schema, profile, `firstTurn`).

Run it with an OpenRouter key. Do not invent extra profile fields.
```

## How the guide is ordered

The chapters follow the order in which you build an agent. First you define the profile, one part in each chapter. Then you run it. Then you show it to people and watch what it does.

```text
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ 1. DEFINE         │   │ 2. RUN            │   │ 3. SHOW AND WATCH │
│ defineProfile     │─► │ createProvider    │─► │ handler and UI    │
│ one profile says  │   │ runTurn           │   │ statuses          │
│ what the agent is │   │ events and gates  │   │ traces            │
└───────────────────┘   └───────────────────┘   └───────────────────┘
```
