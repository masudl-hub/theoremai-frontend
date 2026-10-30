---
title: Headless Web & Transport
updated: 2026-10-26
summary: Headless client transport, Server-Sent Events stream decoding, and browser execution primitives.
entry: src/interface/mod.ts
covers: src/interface, react
cover: /imagery/th30_braidedriver.png
coverAlt: Glacial braided river channels carving sandbanks from aerial view
coverPosition: 50% 50%
---

Deploying an agent to web browsers requires streaming incremental tokens over HTTP, handling user approvals for gated tools, sanitizing client inputs, and managing conversation persistence without leaking model credentials or internal prompt instructions.

Theorem provides `@theoremjs/web`: Web-standard server handlers that serve a profile, and the browser client that talks to them, with no UI framework. A handler takes a `Request` and returns a `Response`, so it mounts on any framework that speaks them: Deno.serve, Hono, Next.js route handlers, SvelteKit, or Cloudflare Workers.

## Web Handler Architecture (`createTheoremHandler`)

`createTheoremHandler` serves one profile as one Web-standard handler:

```mermaid
flowchart TD
		Client["Browser / Vanilla Client (@theoremjs/web/client)"]
		
		subgraph Server["Web Server Route (@theoremjs/web/server)"]
				Handler["createTheoremHandler(options)"]
				Auth["Session & Vault Resolution"]
				ConvStore["ConversationStore (Sealed / DB)"]
				SessStore["SessionStore (Gate Authority)"]
		end
		
		subgraph Kernel["Theorem Engine (@theoremjs/agents)"]
				Profile["harbor.desk Profile"]
				Runner["runTurn() / Gate Coordinator"]
		end
		
		Client -->|GET /api/agent (Describe)| Handler
		Client -->|POST /api/agent/turn (Stream)| Handler
		Client -->|POST /api/agent/invoke (Answer Gate)| Handler
		Client -->|POST /api/agent/steer (Inject)| Handler
		
		Handler --> Auth
		Handler --> ConvStore
		Handler --> SessStore
		Handler --> Kernel
```

### Catch-All Route Dispatch

Mount the handler under a catch-all route. It answers these sub-routes:

| Method & Route | Payload / Response | Purpose |
| :--- | :--- | :--- |
| **`GET <base>`** | Returns `{ interface }` | Serves the profile's client-safe interface (`clientProfileInterface`), without its server-only fields. |
| **`POST <base>/turn`** | NDJSON Stream | Streams the turn's events (`text`, `tool`, `done`, and the rest). A message sent while the reply waits on gates walks away from them first. |
| **`POST <base>/invoke`** | NDJSON Stream | Streams the events for the user's answer to a paused tool call (`approve`, `deny`, or `abandon`, or a key the user types at a sign-in gate). |
| **`POST <base>/steer`** | Returns `{ ok: true }` | Adds messages to a running turn. |
| **`POST <base>/stop`** | Returns `{ ok: true }` | Stops a running turn where it stands. Its stream goes on to save and send what the reply left. |
| **`POST <base>/conversation`** | Returns `{ transcript, reply }` | Retrieves the rendered transcript and any paused reply state for a conversation reference. |
| **`POST <base>/rewind`** | Returns `{ conversation, view }` | Truncates a conversation after a designated block, returning a new conversation ref for branching. |

## Mounting on Web Frameworks

`createTheoremHandler` takes the profile, the host options its model calls run on (`provider`), and a conversation store. In the samples, `harborDesk` is your profile, from your own module. Fill each key slot that its models name.

### Next.js App Router (`app/api/agent/[...path]/route.ts`)

```ts
import type { Profile } from '@theoremjs/agents';
import { createMemoryConversationStore, createTheoremHandler } from '@theoremjs/web/server';

declare const harborDesk: Profile;

const handler = createTheoremHandler({
	profile: harborDesk,
	provider: {
		vault: { gemini: process.env.GEMINI_API_KEY ?? '' },
	},
	conversationStore: createMemoryConversationStore(),
});

export const GET = handler;
export const POST = handler;
```

### Cloudflare Workers and Hono

A Worker hands each `Request` to the handler. The sealed store keeps nothing on the server. `keys` holds every sealing key still in use, by version, and `keyVersion` names the one that seals new writes. Each key is at least 32 bytes and stays off the browser:

```ts
import type { Profile } from '@theoremjs/agents';
import { createSealedConversationStore, createTheoremHandler } from '@theoremjs/web/server';

declare const harborDesk: Profile;

const handler = createTheoremHandler({
	profile: harborDesk,
	provider: {
		vault: { gemini: process.env.GEMINI_API_KEY ?? '' },
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

### Conversation Store Implementations

| Store | Function | Storage Mechanism | Best Fit |
| :--- | :--- | :--- | :--- |
| **Memory Store** | `createMemoryConversationStore()` | Process memory. Idle conversations are forgotten, and the oldest go first when the store is full. | One server instance. |
| **Sealed Store** | `createSealedConversationStore({ keys, keyVersion })` | **No database**: the `ref` is the conversation, sealed with the host's key (AES-256-GCM) and bound to the session. The browser carries it, and cannot read or change it. | Hosts that keep nothing on the server, such as Workers. |
| **Your Own Store** | Your `TheoremConversationStore` (`read` and `write`) | Your database. | Requests that can reach different instances, and long retention. |

For profiles configured with `providerContinuation: { history: 'stateless' }`, no conversation is retained and `conversationStore` is omitted.

## Specialized Handlers

Beyond conversational agents, `@theoremjs/web/server` provides specialized handlers for other modalities:

### 1. Decision Handlers (`createTheoremDecisionHandler`)
Serves a decision profile. `GET <base>` returns its interface, and `POST <base>/decide` returns the answers for the posted `{ state }`. The host owns the questions: the browser sends only the state, so a visitor cannot spend the host's key on questions of their own. `cargoSafetyDecision` is your decision profile:

```ts
import type { DecisionProfile } from '@theoremjs/agents';
import { createTheoremDecisionHandler } from '@theoremjs/web/server';

declare const cargoSafetyDecision: DecisionProfile;

const handler = createTheoremDecisionHandler({
	profile: cargoSafetyDecision,
	questions: {
		clearanceVerdict: {
			type: 'choice',
			instructions: 'Determine intake disposition based on container state.',
			criteria: {
				clear: 'Safe for immediate yard intake.',
				hold: 'Hold for physical inspection.',
			},
		},
	},
	vault: { gemini: process.env.GEMINI_API_KEY ?? '' },
});

export const GET = handler;
export const POST = handler;
```

### 2. Host Handlers (`createTheoremHostHandler`)
Serves a host profile's tools to the page, with no model. `GET <base>` returns the tools the page may call, with their schemas. `POST <base>/call` streams the events for one call. `createTheoremMcpHandler` serves the same tools to MCP clients.

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
	await chat.sendText('Verify container MSKU9012345.');
}
```

## Related Guides

* **[Headless React Hooks](/docs/web/react-hooks)**: The same transports in React, through `useTheoremChat` and the other hooks.
* **[Profiles & Contract](/docs/profiles)**: Universal profile structure, inputs, and model bindings.
* **[Provider Checkpoints & State](/docs/providers/checkpoints)**: Dual-layer history persistence and native checkpoints.
* **[Tool Permissions & Gates](/docs/tools/gates)**: Lifecycle of paused tool calls and user approval workflows.
