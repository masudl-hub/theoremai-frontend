---
title: Headless Web & Transport
updated: 2026-11-03
summary: Headless client transport, NDJSON stream decoding, and browser execution primitives.
entry: src/interface/mod.ts
covers: src/interface, react, web
cover: /imagery/th30_braidedriver.png
coverAlt: Glacial braided river channels carving sandbanks from aerial view
coverPosition: 50% 50%
---

Deploying an agent to web browsers requires streaming incremental tokens over HTTP, handling user approvals for gated tools, sanitizing client inputs, and managing conversation persistence without leaking model credentials or internal prompt instructions.

Theorem provides `@theoremjs/web`: Web-standard server handlers that serve a profile, and the browser client that talks to them, with no UI framework. A handler takes a `Request` and returns a `Response`, so it mounts on any framework that speaks them: Deno.serve, Hono, Next.js route handlers, SvelteKit, or Cloudflare Workers.

```figure
{
  "kind": "lanes",
  "still": {
    "src": "/imagery/th30_sanddunes.png",
    "position": "50% 50%"
  },
  "caption": "One message. The browser sends what the person did now, and the keys stay on your server.",
  "lanes": [
    "The browser",
    "Your server",
    "The model"
  ],
  "steps": [
    {
      "lane": "The browser",
      "label": "POST <base>/turn",
      "text": "The message and the opaque ref the store issued.",
      "kind": "ingress"
    },
    {
      "lane": "Your server",
      "label": "createTheoremHandler",
      "text": "It serves one profile. It reads the keys from the options you pass, and the session from your session option or a cookie it issues.",
      "kind": "runner",
      "parts": [
        {
          "label": "provider",
          "text": "The host options its model calls run on."
        },
        {
          "label": "conversation store",
          "text": "Owns the transcript and the history the model reads."
        }
      ]
    },
    {
      "lane": "The model",
      "label": "research.scout runs",
      "text": "The handler runs the turn.",
      "kind": "model"
    },
    {
      "lane": "The browser",
      "label": "NDJSON stream",
      "text": "The turn's events, one JSON object to a line.",
      "kind": "stream"
    }
  ]
}
```

## Web Handler Architecture (`createTheoremHandler`)

`createTheoremHandler` serves one profile as one Web-standard handler. Your route gives it the request, and it reads the session and the keys from the options you pass.

### Catch-All Route Dispatch

Mount the handler under a catch-all route. It answers these sub-routes:

| Method & Route | Payload / Response | Purpose |
| :--- | :--- | :--- |
| **`GET <base>`** | Returns `{ interface }` | Serves the profile's client-safe interface (`clientProfileInterface`), without its server-only fields. |
| **`POST <base>/turn`** | NDJSON Stream | Streams the turn's events (`text`, `tool`, `done`, and the rest). A message sent while the reply waits on gates walks away from them first. |
| **`POST <base>/invoke`** | NDJSON Stream | Streams the events for the user's answer to a paused tool call (`approve` or `deny`, with a key the user types at a sign-in gate). |
| **`POST <base>/steer`** | Returns `{ ok: true }` | Adds messages to a running turn. |
| **`POST <base>/stop`** | Returns `{ ok: true }` | Stops a running turn where it stands. Its stream goes on to save and send what the reply left. |
| **`POST <base>/page-result`** | Returns `{ accepted: true }` | Takes the page's result for a tool the turn ran in the page. |
| **`POST <base>/conversation`** | Returns `{ transcript, paused }` | Retrieves the rendered transcript and any paused reply for a conversation reference. |
| **`POST <base>/notify`** | NDJSON Stream | Stays open: one line now, and one each time a background call in this session ends. Set `notifier` to serve it. |
| **`POST <base>/rewind`** | Returns `{ conversation, view }` | Truncates a conversation after a designated block, returning a new conversation ref for branching. |

## Mounting on Web Frameworks

`createTheoremHandler` takes the profile, the host options its model calls run on (`provider`), and a conversation store. In the samples, `profile` is your profile, `research.scout`, from your own module. Fill each key slot that its models name.

### Next.js App Router (`app/api/agent/[...path]/route.ts`)

```ts
import { createMemoryConversationStore, createTheoremHandler } from '@theoremjs/web/server';

const handler = createTheoremHandler({
	profile,
	provider: {
		vault: {
			openrouter: process.env.OPENROUTER_API_KEY ?? '',
			// ...
		},
	},
	conversationStore: createMemoryConversationStore(),
});

export const GET = handler;
export const POST = handler;
```

### Cloudflare Workers and Hono

A Worker hands each `Request` to the handler. The sealed store keeps nothing on the server. `keys` holds every sealing key still in use, by version, and `keyVersion` names the one that seals new writes. Each key is at least 32 bytes and stays off the browser:

```ts
import { createSealedConversationStore, createTheoremHandler } from '@theoremjs/web/server';

const handler = createTheoremHandler({
	profile,
	provider: {
		// ...
	},
	conversationStore: createSealedConversationStore({
		keys: { 1: process.env.CONVERSATION_SEAL_KEY ?? '' },
		keyVersion: 1,
	}),
});

export default {
	fetch(request: Request): Promise<Response> {
		return handler(request);
	},
};
```

Hono and the other frameworks hand the handler their `Request` in the same way. To pick keys for each request (your users' own keys, or a vault for each tenant), give `provider` a function. It receives `{ request, model }` and returns the host options.

## Trust Boundaries & Conversation Stores

Theorem enforces strict trust boundaries between browser clients and server state:

1. **The Browser Never Sends History**: The conversation store owns the transcript, the history the model reads, and the paused reply. The browser sends only what the person did now, with the opaque ref (`ref`) the store issued.
2. **Server-Owned Gate Authority**: The session store (`sessionStore`) owns which paused calls may run, with what input, and the tool permissions. Request bodies cannot grant any of them.
3. **Credential Isolation**: A key the user types at a gate is sent once and saved in the credential store (`credentialStore`). No credential is ever sent back to the browser.
4. **Server-Chosen Prompt Lines**: The page does not choose a turn's [prompt lines](/docs/profiles#prompt-lines-and-options). For a profile with `identity.options`, `prepare` on the handler sets the turn's `path` and `options` on the server. A request that carries `stated` is refused with a `request` error unless you set `pageStatesTurn`, which is for a page you trust as you trust your server. Such a page passes `stated` to `TheoremChat`, or to `useLiveCall`, where a change during a call takes the call up again.

### Conversation Store Implementations

| Store | Function | Storage Mechanism | Best Fit |
| :--- | :--- | :--- | :--- |
| **Memory Store** | `createMemoryConversationStore()` | Process memory. It keeps every conversation until the process ends, unless you set `ttlMs` or `maxSessions`. | One server instance. |
| **Sealed Store** | `createSealedConversationStore({ keys, keyVersion })` | **No database**: the `ref` is the conversation, sealed with the host's key (AES-256-GCM) and bound to the session. The browser carries it, and cannot read or change it. | Hosts that keep nothing on the server, such as Workers. |
| **Your Own Store** | Your `TheoremConversationStore` (`read` and `write`) | Your database. | Requests that can reach different instances, and long retention. |

For profiles configured with `providerContinuation: { history: 'stateless' }`, no conversation is retained and `conversationStore` is omitted.

## Tools That Finish After Their Turn

A tool with a `background` setting (see [Tools](/docs/tools)) can answer the model now and finish after its turn, so a long job does not hold the reply. It runs inline until you give the handler its `background` option. `createTheoremHostHandler` takes the same option.

The option takes `{ request, sessionId }` and returns a `ToolBackgroundService`. The service gets each detached call and that call's late events:

```ts frame=statements
import type { TheoremHandlerOptions } from '@theoremjs/web/server';

const background: TheoremHandlerOptions['background'] = ({ sessionId }) => ({
	detached(call) {
		// call.stop() stops the call, and call.done resolves once it has settled
	},
	event(event, call) {
		// ...
	},
});
```

The value you return must stay valid after the request ends, until each call settles.

The session keeps each detached call and the reply the model read, so a late result leaves the next turn free to resume. `POST <base>/conversation` shows the call as it stands: still running, its result, or an error. The chat reads that after each reply and on load. The error's code is `outcome_not_retained` when the session has dropped the result, which by default happens 24 hours after the call settles (`operationRetentionMs`).

To tell an open page that a call ended, with no turn or reload, pass `notifier: createMemoryNotifier()` to `createTheoremHandler`. The page keeps `POST <base>/notify` open while a call runs, and each line makes it read the conversation again. The line carries no content. `createMemoryNotifier` reaches only pages connected to the process that ran the call, so for more than one instance, give a shared `TheoremNotifier`. For your own channel, such as a Web Push that reaches an open page, call `refresh()` on the `ChatController`. It runs the same read.

The model does not get a late result by itself. Your `prepare` passes the stored outcome in `input.lateResults` on a later turn. Pass each one once: the turn emits a `late_results` event, so a history built from events holds it from then on. The model reads it as a tool result, and the reply counts it as a read. In `input.context` or `input.history`, the same text would read as your word or the user's.

A shared session store keeps a call as `background` when its worker dies. Your own sweep marks it `uncertain` with the reason `worker_lost`, through the store's `compareAndSwap`, and the conversation then shows the call as an error.

## Specialized Handlers

Beyond conversational agents, `@theoremjs/web/server` provides specialized handlers for other modalities:

### 1. Decision Handlers (`createTheoremDecisionHandler`)
Serves a decision profile. `GET <base>` returns its interface, and `POST <base>/decide` returns the answers for the posted `{ state }`. The host owns the questions: the browser sends only the state, the images it names and, when you build the questions for each decision, the input your builder takes. A visitor cannot spend the host's key on questions of their own. `pageReader` is your decision profile, `research.pagereader`. Its model reads the key slot `typesafe`:

```ts
import type { DecisionProfile } from '@theoremjs/agents';
import { createTheoremDecisionHandler } from '@theoremjs/web/server';

declare const pageReader: DecisionProfile;

export const handler = createTheoremDecisionHandler({
	profile: pageReader,
	questions: {
		passage: {
			type: 'choice',
			instructions:
				'Does `passage` state a fact a careful researcher would want when answering `question`, including facts that do not settle it and anything contradictory?',
			criteria: {
				relevant: 'The passage states such a fact.',
				not_relevant:
					'The passage does not: it is about something else, or is only a heading, navigation, a reference or a list of links.',
			},
		},
	},
	vault: { typesafe: process.env.TYPESAFE_API_KEY ?? '' },
});
// ...
```

### 2. Host Handlers (`createTheoremHostHandler`)
Serves a host profile's tools to the page, so the page runs them directly. `GET <base>` returns the tools the page may call, with their schemas. `POST <base>/call` streams the events for one call, `POST <base>/invoke` answers a gate that call paused on, and `POST <base>/page-result` takes the page's result for a tool it runs. `createTheoremMcpHandler` serves the same tools to MCP clients.

### 3. Embedding Handlers (`createTheoremEmbeddingHandler`)
Serves an embedding profile over HTTP.

## Vanilla Browser Client (`@theoremjs/web/client`)

Applications without React interact with server handlers using `@theoremjs/web/client`:

`createHttpTransport` speaks to the handler at `endpoint` (default `/api/theorem`). `describe()` returns the profile's client-safe interface. A live profile runs in a call, not a chat, so the chat takes the other types only:

```ts
import { createChatController, createHttpTransport } from '@theoremjs/web/client';

const transport = createHttpTransport({ endpoint: '/api/agent' });

const iface = await transport.describe();

if (iface.type !== 'live') {
	const chat = createChatController({ transport, iface });

	// Called after each change: the transcript, the streaming reply, the phase
	chat.subscribe(() => {
		const state = chat.getState();
		console.log(state.blocks, state.streamBlocks);
	});

	// Sends the text, and resolves once the reply is done
	await chat.sendText(
		'Find recent papers, models, or datasets on episodic memory for language models.',
	);
}
```

## Related Guides

* **[Headless React Hooks](/docs/web/react-hooks)**: The same transports in React, through `useTheoremChat` and the other hooks.
* **[Profiles & Contract](/docs/profiles)**: Universal profile structure, inputs, and model bindings.
* **[Provider Checkpoints & State](/docs/providers/checkpoints)**: Dual-layer history persistence and native checkpoints.
* **[Tool Permissions & Gates](/docs/tools/gates)**: Lifecycle of paused tool calls and user approval workflows.
