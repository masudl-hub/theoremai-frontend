---
title: React Hooks
updated: 2026-10-30
summary: Headless React hooks for chat, decision, embedding and host profiles.
entry: react/src/index.ts
covers: react, src/interface
cover: /imagery/th30_canyon.png
coverAlt: Red sandstone desert canyon carved by ancient flowing rivers
coverPosition: 50% 50%
---

Modern web applications require custom design systems, bespoke micro-interactions, and granular control over the DOM. Rigid, pre-styled AI components break design fidelity and complicate integration into production component libraries.

Theorem provides a suite of headless React hooks in `@theoremjs/react`. These hooks manage streaming, tool gates, pending message queues and the transport. They render no markup and ship no styles, so you draw them with your own components.

## Hook Summary

| Hook | Profile Type | Purpose | Primary Methods & State |
| :--- | :--- | :--- | :--- |
| [`useTheoremInterface`](#1-interface-discovery-usetheoreminterface) | `text`, `image`, `speech`, `transcription`, `live` | Describes the profile as the page sees it: inputs, models, tools and labels | `status`, `iface`, `failure` |
| [`useTheoremChat`](#2-conversational-streaming-usetheoremchat) | `text`, `image`, `speech`, `transcription` | Manages transcript blocks, streaming, the composer's pending queue and tool gates | `phase`, `blocks`, `streamBlocks`, `draftText`, `setDraftText`, `handleSubmit`, `handleStop`, `handleToolDecision` |
| [`useTheoremDecision`](#3-structured-decisions-usetheoremdecision) | `decision` | Asks the profile's questions about a state the page posts | `iface`, `decide`, `status`, `result`, `failure`, `cancel` |
| [`useTheoremEmbedding`](#4-vector-search--embeddings-usetheoremembedding) | `embedding` | Embeds inputs, one call at a time | `iface`, `embed`, `status`, `result`, `failure`, `cancel` |
| [`useEmbeddingIndex`](#4-vector-search--embeddings-usetheoremembedding) | `embedding` | Embeds documents for search in as many requests as the profile's limits need, and reports progress | `index`, `status`, `progress`, `result`, `cancel` |
| [`useTheoremHost`](#5-host-tools--mcp-consoles-usetheoremhost) | `host` | Runs the host's tools, side by side, and answers the gates they pause on | `iface`, `calls`, `run`, `answer`, `cancel` |

## 1. Interface Discovery (`useTheoremInterface`)

Before the page draws a composer, it needs to know what the profile accepts. The `useTheoremInterface` hook asks the host to describe the profile through the transport.

```tsx
import { createHttpTransport, useTheoremInterface } from '@theoremjs/react';

const transport = createHttpTransport({ endpoint: '/api/theorem' });

// ...
const described = useTheoremInterface(transport);

if (described.status === 'loading') return <div>Loading interface...</div>;
if (described.status === 'error') return <div>Failed to load: {described.failure.error}</div>;

return <div>Connected to {described.iface.identity.handle}</div>;
```

The returned `iface` object exposes client-safe metadata:
- **`inputs`**: What the profile accepts: text (`inputs.text`), attachments (`inputs.attachments`), voice notes, and slots (`inputs.slots`).
- **`models`**: The profile's model bindings, without their host functions.
- **`tools`**: The tools the profile allows, and the names of the tools the page answers.
- **`labels`**: The profile's wording overrides for the client's messages. Pass them to `labelText`.

The identity reaches the page as its handle only. Tool handlers, schemas, endpoints and headers stay on the host.

## 2. Conversational Streaming (`useTheoremChat`)

The `useTheoremChat` hook binds `createChatController` from `@theoremjs/web/client` to React with `useSyncExternalStore`. The chat's transcript, stream, pending queue and tool gates become React state.

### Lean Consumption

When a tool call completes, each image or other media part it returned becomes a `media` block right after the call, so it stands before what the model says next.

To display incoming tokens as they arrive over the wire, concatenate committed `chat.blocks` with active `chat.streamBlocks`:

```tsx
const chat = useTheoremChat({
	transport,
	iface: described.status === 'ready' && described.iface.type !== 'live' ? described.iface : null,
});

const allBlocks = useMemo(
	() => [...chat.blocks, ...chat.streamBlocks],
	[chat.blocks, chat.streamBlocks],
);
```

### Transcript Phases & Gating

The `chat.phase` enum indicates the active runtime state:
- `'idle'`: Ready for user input.
- `'streaming'`: Model response tokens are actively flowing into `chat.streamBlocks`.
- `'gated'`: The turn waits for a person to answer a tool gate.

When `chat.phase === 'gated'`, draw the question and answer it with `handleToolDecision` and `'allow'` or `'deny'`. The chat answers the one gate that waits, so the index the transcript passes is not used. A sign-in gate is answered with `handleAuthenticated` instead. Every tool of `research.scout` runs without asking, so add `permission: 'always_confirm'` to the tool that must ask.

```tsx
{chat.phase === 'gated' && (
	<div>
		{/* ... */}
		<button onClick={() => chat.handleToolDecision(0, 'allow')}>Approve</button>
		<button onClick={() => chat.handleToolDecision(0, 'deny')}>Reject</button>
	</div>
)}
```

### In-Browser Page Tools

A tool the profile declares with `answeredBy: 'page'` runs in the browser. Give the chat a function for each one by name in `pageTools`. Each function gets the tool's arguments and returns `{ output }`:

```tsx
const chat = useTheoremChat({
	// ...
	pageTools: {
		check_device: () => ({
			output: {
				webgpu: 'gpu' in navigator,
				// ...
			},
		}),
	},
});
```

## 3. Structured Decisions (`useTheoremDecision`)

A decision profile answers its questions about a state the page posts. The `useTheoremDecision` hook describes the profile once, then `decide(state)` runs as often as needed. A new decision aborts the one still running.

```tsx
import { createDecisionTransport, useTheoremDecision } from '@theoremjs/react';

const transport = createDecisionTransport({ endpoint: '/api/decision' });

// ...
const { decide, status, result, failure, cancel } = useTheoremDecision(transport);

decide({
	question: 'What write path do recent systems use to store episodic memory?',
	passage: 'MemGPT (Packer et al.) pages conversational history into an external store.',
});
```

## 4. Vector Search & Embeddings (`useTheoremEmbedding`)

Theorem provides two complementary hooks for working with embedding profiles:
1. `useTheoremEmbedding`: Describes the profile once, then `embed(inputs, options)` embeds them. A new call aborts the one still running.
2. `useEmbeddingIndex`: Embeds documents with `task: 'document'`, in as many requests as the profile's input limits need, one after another, and reports `progress` in requests.

```tsx
import {
	createEmbeddingTransport,
	useEmbeddingIndex,
	useTheoremEmbedding,
} from '@theoremjs/react';

const transport = createEmbeddingTransport({ endpoint: '/api/embedding' });

// ...
const query = useTheoremEmbedding(transport);
const { index, progress, status, result } = useEmbeddingIndex(transport);

// ...
index(
	[
		'MemGPT treats context as a virtual memory hierarchy rather than a single prompt window.',
		// ...
	],
	query.iface.inputs,
);
// ...
query.embed(['episodic memory'], { task: 'query' });
```

## 5. Host Tools & MCP Consoles (`useTheoremHost`)

A host profile serves its tools to the page through `createTheoremHostHandler`, and to MCP clients through `createTheoremMcpHandler`. The `useTheoremHost` hook describes the host once, then `run(name, input)` starts a call and returns its id at once. Calls run side by side: `cancel(id)` stops one, and `answer(id, resolution)` answers the gate it pauses on. Each call carries its streamed `events`, its latest `progress`, `isRunning` and `failure`. The hook renders nothing.

```tsx
import { createHostTransport, useTheoremHost } from '@theoremjs/react';

const transport = createHostTransport({ endpoint: '/api/host' });

// ...
const { calls, run, cancel } = useTheoremHost(transport);

run('read_pages', {
	urls: ['https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2'],
	question: 'What datasets are evaluated?',
});
// ...
{calls.map((call) => (
	<li key={call.id}>
		{/* ... */}
		{call.isRunning && <button onClick={() => cancel(call.id)}>Cancel</button>}
	</li>
))}
```

## Related Guides

* **[Text Profiles](/docs/profiles/text)**: Declaring inputs, tools, and models for text conversational agents.
* **[Headless Web & Transport](/docs/web)**: Web-standard server route dispatchers and conversation stores.
* **[Realtime Voice & Video](/docs/web/realtime)**: WebSocket relay audio worklets and media streams.
* **[Astryx UI Components](/docs/web/astryx)**: Ready-made Astryx components built on top of these headless hooks.
