---
title: Getting started
updated: 2026-10-07
summary: Write a profile, run a turn, and see Theorem refuse what it doesn't state.
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

In Theorem, all the parts are in one object, the profile.

```figure
{
	"kind": "sequence",
	"still": { "src": "/imagery/th30_emeraldriver.png", "position": "18% 50%" },
	"caption": "You write the agent once. Theorem checks it once, then runs every request from it.",
	"steps": [
		{
			"label": "You write the profile",
			"text": "One object states every part of the agent.",
			"parts": [
				{ "label": "Identity", "chapter": "identity", "text": "Who the agent is: its type, its name and its instruction." },
				{ "label": "Models", "chapter": "models", "text": "Which models it can use, and which key each model takes." },
				{ "label": "Tools", "chapter": "tools", "text": "Which tools it can call." },
				{ "label": "Inputs", "chapter": "inputs", "text": "What it accepts: text, files, voice or fixed choices." },
				{ "label": "Outputs", "chapter": "outputs", "text": "What it returns: text, JSON that a schema checks, an image or speech." },
				{ "label": "Turn behaviour", "chapter": "turn-behaviour", "text": "If a reply that stopped early can continue, and if a running turn can be steered." },
				{ "label": "Guardrails", "chapter": "guardrails", "text": "How Theorem guards each input and each output." },
				{ "label": "Wording", "chapter": "statuses", "text": "Its own words for the error lines and notices that a person sees." },
				{ "label": "Observability", "chapter": "traces", "text": "Where the record of each turn goes, and what the record keeps." }
			]
		},
		{
			"label": "defineProfile checks it",
			"text": "This happens once, when your application starts. It throws if a field is missing, or if a field does not belong to the type of agent."
		},
		{
			"label": "runTurn runs every request from it",
			"text": "This happens on every turn. The request supplies the input. It cannot add a tool, and it can choose a model only if the profile allows that."
		}
	]
}
```

Change the profile, and every turn changes. No other code describes the agent.

## The profile is the limit

A request cannot ask for more than the profile states:

- Theorem refuses a request that sets `model`, unless the profile sets `allowModelSelect`.
- Theorem refuses a request that sends `input.slots`, unless the profile declares those slots.
- The model sees only the tools that `tools.allow` names.

To allow more, change the profile. No request and no other file can allow it. This is why the profile and the agent cannot drift apart.

## Install

```bash
# npm
npm install @theoremjs/agents zod
# deno
deno add jsr:@theoremjs/agents
```

## Quick start

These steps build one agent and ask it one question. The agent is the front desk of Harbor, a company that moves freight.

### 1. Register a tool

The desk needs one fact that the model does not have: why a shipment is on hold. A **tool** gives the model that fact. `registerTool` stores the tool under its `name`.

```ts
import { registerTool } from '@theoremjs/agents';
import { z } from 'zod';

registerTool({
	type: 'function',
	name: 'harbor_holdStatus',
	description: 'Look up why a Harbor shipment is on hold.',
	category: 'ops',
	access: 'read-only',
	paths: ['*'],
	loadTier: 'T0',
	permission: 'auto',
	input: z.object({ shipmentId: z.string() }),
	output: z.object({ status: z.string(), reason: z.string() }),
	handler: () => ({ status: 'hold', reason: 'Customs needs the commercial invoice PDF.' }),
});
```

The five fields from `category` to `permission` describe the tool to Theorem. [Registering tools](/docs/tools) explains each one.

### 2. Define the profile

This profile is a text agent with one model. `tools.allow` names the one tool that the model can call.

`defineProfile` checks the profile. `registerProfile` stores it under its `id`, so that a request can name it. An `id` can have at most 64 characters.

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
	tools: { allow: ['harbor_holdStatus'] },
	inputs: { text: true },
});

registerProfile(desk);
```

### 3. Give the profile a key

A profile never holds a key. It names a **key slot**, here `openrouter`. You fill the slot in a **vault**, an object that maps each slot name to a key.

`createProvider` binds the profile to its model and to the vault. The profile can then stay in your repository, and the key stays in your environment.

```ts frame=statements
import { createProvider } from '@theoremjs/agents';

const provider = createProvider(desk, {
	vault: { openrouter: process.env.OPENROUTER_API_KEY },
});
```

### 4. Run a turn

A **turn** is one request to the agent and its reply. `runTurn` runs the turn and returns a stream of events. Each `text` event carries a piece of the reply.

```ts frame=statements
import { runTurn } from '@theoremjs/agents';

for await (const event of runTurn(
	{ profile: 'harbor.desk', input: { text: 'Why is shipment H-1042 on hold?' } },
	provider,
)) {
	if (event.type === 'text') process.stdout.write(event.text);
}
```

### 5. Ask for more than the profile states

A request can come from a browser, so it can contain anything. This request asks for a model that the profile does not name.

```ts frame=statements
import { runTurn, TheoremError } from '@theoremjs/agents';

try {
	for await (const event of runTurn(
		{
			profile: 'harbor.desk',
			model: 'bigger',
			input: { text: 'Why is shipment H-1042 on hold?' },
		},
		provider,
	)) {
		if (event.type === 'text') process.stdout.write(event.text);
	}
} catch (error) {
	if (error instanceof TheoremError) console.log(error.kind, error.message);
}
```

`runTurn` throws before it calls the model:

```text
request Profile harbor.desk does not allow model selection
```

No change to the request can allow the choice. To allow it, change the profile: bind a second model and set `allowModelSelect` ([Binding models](/docs/models)).

## What the turn did

Theorem did more than call the model. The figure shows each step of the request in step 4, and each check that ran. The profile sets no `guardrails`, so these are the checks that run by default.

```figure
{
	"kind": "lanes",
	"still": { "src": "/imagery/th30_emeraldriver.png", "position": "60% 30%" },
	"caption": "One turn of the Harbor desk. Theorem stands between your code and the model, and checks the text each time it crosses.",
	"lanes": ["Your code", "Theorem", "The model"],
	"steps": [
		{
			"lane": "Your code",
			"label": "Your code sent the request",
			"text": "The request named harbor.desk and carried the question."
		},
		{
			"lane": "Theorem",
			"label": "Theorem checked the input",
			"text": "The profile gave the model, the key and the one tool. Then Theorem read the question.",
			"parts": [
				{ "label": "Sensitive data", "chapter": "guardrails", "text": "The question had no ID numbers, card numbers, IP addresses or credentials. Theorem redacts each one that it finds." },
				{ "label": "Injection", "chapter": "guardrails", "text": "The question had no text written to steer the model. Theorem redacts that text too." },
				{ "label": "Canary", "chapter": "guardrails", "text": "Theorem ended the instruction with a secret token. A reply that contains the token leaked the instruction." }
			]
		},
		{
			"lane": "The model",
			"label": "The model asked for the tool",
			"text": "The model saw the question and one tool, because tools.allow names one."
		},
		{
			"lane": "Theorem",
			"label": "Theorem checked the call",
			"text": "The model cannot run code. It can only ask.",
			"parts": [
				{ "label": "Leak", "chapter": "guardrails", "text": "The call did not contain the canary, or 12 words in a row from the instruction." },
				{ "label": "Arguments", "chapter": "tools", "text": "The arguments matched the input schema of the tool." },
				{ "label": "Sensitive data", "chapter": "guardrails", "text": "The arguments had no sensitive data. Theorem reports each match, because a tool call can carry data out." }
			]
		},
		{
			"lane": "Your code",
			"label": "Your handler ran",
			"text": "The handler returned the hold and its reason."
		},
		{
			"lane": "Theorem",
			"label": "Theorem checked the result",
			"text": "The model reads the result, so the result is input too.",
			"parts": [
				{ "label": "Shape", "chapter": "tools", "text": "The result matched the output schema of the tool." },
				{ "label": "Sensitive data and injection", "chapter": "guardrails", "text": "The result had neither. Theorem redacts each match before the model reads the result." }
			]
		},
		{
			"lane": "The model",
			"label": "The model wrote the reply",
			"text": "Theorem called the model again, with the result of the tool."
		},
		{
			"lane": "Theorem",
			"label": "Theorem checked the reply",
			"text": "Theorem released each piece of text only after it passed.",
			"parts": [
				{ "label": "Canary", "chapter": "guardrails", "text": "No piece of the reply contained the secret token." },
				{ "label": "Prompt leak", "chapter": "guardrails", "text": "No piece repeated 12 words in a row from the instruction." }
			]
		},
		{
			"lane": "Your code",
			"label": "Your code received events",
			"text": "Each text event carried a piece of the reply."
		}
	]
}
```

A profile can add checks, such as a check of each reply for sensitive data or for links ([Setting guardrails](/docs/guardrails)).

## The full Harbor desk

The quick start used a small part of a profile. The program below is the same desk with more of its parts:

- It has two more tools. An HTTP tool reads the weather at a port from a public API. An MCP tool searches the web for news about a port ([Registering tools](/docs/tools)).
- It reads a photo or a PDF ([Declaring inputs](/docs/inputs)).

The play button on the program opens it in the playground.

```ts seed=firstTurn
```

```prompt
Install `@theoremjs/agents` and `zod`.

Copy the Harbor desk program from the docs fence in full (tools, profile, `firstTurn`).

Run it with an OpenRouter key. Do not invent extra profile fields.
```

## How the guide is ordered

The chapters follow the order in which you build an agent.

```figure
{
	"kind": "sequence",
	"layout": "row",
	"still": { "src": "/imagery/th30_emeraldriver.png", "position": "82% 50%" },
	"caption": "First you define the profile. Then you run it. Then you show it to people and watch what it does.",
	"steps": [
		{
			"label": "Define",
			"text": "One chapter for each part of the profile.",
			"parts": [
				{ "label": "Choosing a modality", "chapter": "modalities" },
				{ "label": "Setting the identity", "chapter": "identity" },
				{ "label": "Binding models", "chapter": "models" },
				{ "label": "Registering tools", "chapter": "tools" },
				{ "label": "Declaring inputs", "chapter": "inputs" },
				{ "label": "Declaring outputs", "chapter": "outputs" },
				{ "label": "Setting turn behaviour", "chapter": "turn-behaviour" },
				{ "label": "Setting guardrails", "chapter": "guardrails" }
			]
		},
		{
			"label": "Run",
			"text": "Your server runs requests from the profile.",
			"parts": [
				{ "label": "Running a turn", "chapter": "runner", "text": "The function for each type of agent, and the events it returns." }
			]
		},
		{
			"label": "Show and watch",
			"text": "People use the agent, and you see what it did.",
			"parts": [
				{ "label": "Building the interface", "chapter": "interface", "text": "A chat in the browser that reads the profile." },
				{ "label": "Describing statuses", "chapter": "statuses", "text": "The words that a person sees when a turn fails or waits." },
				{ "label": "Recording traces", "chapter": "traces", "text": "The record of each turn." }
			]
		}
	]
}
```
