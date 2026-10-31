---
title: Getting started
updated: 2026-10-29
summary: Define an agent once as a typed profile, run a turn, and enforce hard runtime boundaries.
entry: src/kernel/engine/runner/mod.ts
covers: mod.ts, src/kernel/engine/runner, src/kernel/registry/profiles.ts
cover: /imagery/th30_emeraldriver.png
coverAlt: A green river through red canyons
coverPosition: 100% 100%
suggest: 1
---

```prompt
Theorem is a TypeScript agent kernel. An agent is defined once as a typed profile that holds its identity, model bindings, allowed tools, inputs, outputs, and guardrails.

Core capabilities:
- Profile types: text, image, speech, live (real-time voice and video), decision (judgements about a JSON state), embedding (vectors), and host (your code runs the tools, with no model orchestrating).
- Hard boundaries: A turn cannot exceed its profile. A request can pick a model only when the profile allows it, and the model sees only the tools the profile allows. Tool arguments and results are checked against the tool's schemas. A canary token planted in the instruction is looked for in what leaves. A refused request fails before any model call.
- Packages: `@theoremjs/agents` (the kernel), `@theoremjs/web` (Web-standard server handlers and a browser client, no UI framework), `@theoremjs/react` (headless hooks and an Astryx UI), `@theoremjs/studio` (a studio to edit, run, and test agents).

Discovery & Rules:
- Before building functionality, check whether Theorem provides it (such as turn resumption, history compaction, a fallback key slot, egress canaries, or output validation).
- Connect to Theorem's Docs MCP server at /mcp using search_docs and read_docs, or read /llms.txt.
- Never invent profile fields or materialise omitted defaults. Always verify contracts against the documentation.
```

Define an agent once, as a **profile**. Theorem checks the profile when you define it, then runs every request from it.

## The request lifecycle

A request cannot call a model or a tool that the profile does not allow. Each turn takes the same path, from the request to the events your code reads:

```figure
{
  "kind": "switchback",
  "still": { "src": "/imagery/th30_emeraldriver.png", "position": "18% 50%" },
  "caption": "Every turn runs from a registered profile. Theorem reads the text at each boundary it crosses, around the model and tool calls.",
  "rows": [
    {
      "direction": "ltr",
      "steps": [
        {
          "label": "Host Request",
          "token": { "label": "Host Request", "kind": "ingress" },
          "text": "Your code calls runTurn with the profile id, the input text, and any attachments, voice clips, context or history the profile accepts."
        },
        {
          "label": "Input Boundary",
          "token": { "label": "Input Boundary", "kind": "guardrail" },
          "text": "Detectors read the inbound text. By default a match is flagged; the profile can set redact or block instead."
        },
        {
          "label": "Profile Check",
          "token": { "label": "Profile Check", "kind": "profile" },
          "text": "Theorem checks the request against the profile and refuses a model choice, slot, context sender or file type that the profile does not allow."
        },
        {
          "label": "Turn Runner",
          "token": { "label": "Turn Runner", "kind": "runner" },
          "text": "The runner plants a canary token in the instruction and runs the steps of the turn, up to the profile's step limit."
        }
      ]
    },
    {
      "direction": "rtl",
      "steps": [
        {
          "label": "Model Dispatch",
          "token": { "label": "Model Dispatch", "kind": "model" },
          "text": "The model's protocol turns the request into the provider's wire format. The call is signed with the key from your vault."
        },
        {
          "label": "Tool Gate",
          "token": { "label": "Tool Gate", "kind": "tool" },
          "text": "When the model asks for a tool, Theorem checks its permission and its arguments against the tool's input schema, runs it, and checks the result against the output schema."
        },
        {
          "label": "Outbound Boundary",
          "token": { "label": "Outbound Boundary", "kind": "guardrail" },
          "text": "Detectors read tool arguments and the reply. By default a canary or private-prompt leak is flagged; the profile can set redact or block instead."
        },
        {
          "label": "Event Stream",
          "token": { "label": "Event Stream", "kind": "stream" },
          "text": "runTurn yields text, tool and lifecycle events to your code. @theoremjs/web sends them to a browser as lines of JSON."
        }
      ]
    }
  ]
}
```

## Installation

Theorem is four packages. Install the core runtime and Zod, then add the packages your app needs.

| Package | What it delivers | Install |
| :--- | :--- | :--- |
| **`@theoremjs/agents`** | **Core runtime.** Typed profiles, the turn runner, guardrails, and tools. | `npm install @theoremjs/agents zod` |
| **`@theoremjs/web`** | **Web platform.** Server handlers and a browser client, with no UI framework. | `npm install @theoremjs/web @theoremjs/agents zod` |
| **`@theoremjs/react`** | **React.** Hooks for your own UI, and a ready-made chat and voice call built on Astryx. | `npm install @theoremjs/react @theoremjs/web @theoremjs/agents zod react react-dom` |
| **`@theoremjs/studio`** | **Studio.** A visual workbench for authoring profiles and testing turns. Needs [Deno](https://deno.com). | `npm install -D @theoremjs/studio @theoremjs/agents @theoremjs/web` |

On Deno, add the core runtime with `deno add jsr:@theoremjs/agents`. For React's ready-made UI, also install `@astryxdesign/core @stylexjs/stylex`.

## Quick start: the first turn

These steps build a research scout that searches GitHub for repositories. The full program at the end of this page adds a web search tool.

### 1. Register a tool

`registerTool` registers or replaces a tool in the default scope:

```ts
import { registerTool } from '@theoremjs/agents';
import { z } from 'zod';

registerTool({
	type: 'http',
	name: 'search_github',
	description: 'Search public GitHub repositories, most recently updated first.',
	category: 'research',
	access: 'read-only',
	permission: 'auto',
	loadTier: 'T0',
	paths: ['*'],
	endpoint: 'https://api.github.com/search/repositories?sort=updated&per_page=6',
	method: 'GET',
	mapping: {
		queryParams: ['q'],
	},
	labels: {
		activity: 'Searching GitHub for {q}',
		activityPast: 'Found hits for {q}',
		activityFailed: 'Could not search GitHub for {q}',
		request: 'search GitHub for {q}',
	},
	input: z.object({
		q: z.string().min(1),
	}),
	output: z.object({
		total_count: z.number(),
		items: z.array(z.record(z.string(), z.unknown())),
	}),
});
```

### 2. Define the profile

`defineProfile` validates a definition and returns the profile, throwing on a malformed definition. `registerProfile` defines, validates, and registers a profile in the default scope:

```ts
import {
	defineProfile,
	openRouterProvider,
	registerProfile,
	registerProvider,
} from '@theoremjs/agents';

registerProvider(openRouterProvider, { id: 'openrouter' });

const scoutProfile = defineProfile({
	type: 'text',
	id: 'research.scout',
	identity: {
		handle: 'scout',
		system:
			'Role: Advanced reasoning engine for research on how language models keep, retrieve, and recombine context.',
	},
	models: {
		gemini: {
			protocol: 'openRouterOpenAi',
			provider: 'openrouter',
			apiId: 'google/gemini-3.8-flash',
			keySlot: 'openrouter',
			efforts: { normal: 'medium', deep: 'high' },
			defaultEffort: 'normal',
		},
	},
	defaultModel: 'gemini',
	tools: {
		allow: ['search_github'],
	},
	inputs: {},
	outputs: {
		streaming: {
			mode: 'sse',
		},
	},
});

registerProfile(scoutProfile);
```

#### Model bindings
Each entry under `models` binds a local name to an upstream model and its call settings:
* **`protocol`** *(required)*: The API shape this model is spoken to in (e.g. `'openRouterOpenAi'`, `'geminiInteractions'`).
* **`provider`** *(required)*: The service that runs the model or routes requests to one, such as Gemini or OpenRouter. Its registration supplies the endpoint and authentication.
* **`apiId`** *(required)*: The model's id as the provider lists it, such as `'google/gemini-3.8-flash'`; sent on every call.
* **`keySlot`** *(optional)*: The key slot this model's calls are signed with, instead of the provider's. Use it to bill one model to a different key. Absent: the provider's primary slot.
* **`fallbackKeySlot`** *(optional)*: The key slot tried once after a rate limit or a busy model on the primary slot, instead of the provider's fallback. Must differ from the primary slot. Absent: the provider's fallback slot, if it has one.

### 3. Supply the vault and run the turn

`runTurn` runs one turn of a profile in the default scope, streaming its events. `vault` (`KeyVault`) holds the host's keys by slot; the kernel reads a slot only for the call that names it:

```ts
import { runTurn } from '@theoremjs/agents';

const hostOptions = {
	vault: {
		openrouter: process.env.OPENROUTER_API_KEY ?? '',
	},
};

const turnRequest = {
	profile: 'research.scout',
	input: {
		text: 'Find recent papers on episodic memory in language models.',
	},
};

for await (const event of runTurn(turnRequest, hostOptions)) {
	if (event.type === 'text') {
		process.stdout.write(event.text);
	}
}
```

## The full program

The program below is the scout as the studio builds it. It adds a second tool, an MCP tool that searches the web, and sets the profile's step limit, turn behaviour, network guardrail and observability. The play button opens it in the studio.

```ts seed=firstTurn
```

## The profile is the limit

A request can never ask for more than the profile declares:

1. **Model selection**: Theorem refuses a request that sets `model`, unless the profile sets `allowModelSelect`. Even then, the request must name one of the profile's `models`.
2. **Tool scope**: The model can only call the tools that `tools.allow` names.
3. **Inputs**: Theorem refuses slots the profile does not declare, context from a sender that `inputs.context` does not list, and files or voice clips of a type that the profile does not accept.

### What happens when a request overreaches?

```ts
import { runTurn, TheoremError } from '@theoremjs/agents';

const hostOptions = {
	vault: {
		openrouter: process.env.OPENROUTER_API_KEY ?? '',
	},
};

try {
	for await (const event of runTurn(
		{
			profile: 'research.scout',
			model: 'bigger',
			input: { text: 'Hello' },
		},
		hostOptions,
	)) {
		if (event.type === 'text') process.stdout.write(event.text);
	}
} catch (error) {
	if (error instanceof TheoremError) {
		console.error(`Refused [${error.kind}]: ${error.message}`);
	}
}
```

The turn throws a `TheoremError` before it calls the model:

```text
Refused [request]: Profile research.scout does not allow model selection
```

A `TheoremError` carries a typed `kind` (`ErrorKind`), from which hosts choose an HTTP status and the user's wording. To allow the choice, change the profile: bind a second model and set `allowModelSelect`.
