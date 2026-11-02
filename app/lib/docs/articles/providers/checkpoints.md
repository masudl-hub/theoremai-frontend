---
title: Provider Checkpoints & State
updated: 2026-11-02
summary: Dual-layer state architecture, native provider checkpoints, history hashing, and drift recovery.
entry: src/kernel/checkpoint.ts
covers: src/kernel/checkpoint.ts, src/kernel/protocols/provider.ts
cover: /imagery/th30_sulfurvolcano.png
coverAlt: Steaming sulfur vents on a volcanic caldera rim
coverPosition: 50% 50%
---

Multi-turn conversations with language models encounter a fundamental architectural tension: upstream providers optimize inference using proprietary server-side caching, assistant threads, or native conversation handles, but distributed host applications require portable, fault-tolerant persistence that can fail over across models and providers without losing context.

Theorem resolves this tension through a **dual-layer state architecture**:
1. **Portable History Layer (`TurnHistoryMessage[]`)**: Universal, provider-agnostic transcripts maintained in open formats (`role`, `content`, `parts`, `reasoning`).
2. **Native Provider Checkpoint Layer (`ProviderCheckpoint`)**: The protocol's saved JSON state, and what it was saved for.

```figure
{
  "kind": "lanes",
  "still": {
    "src": "/imagery/th30_mineralhills.png",
    "position": "30% 50%"
  },
  "caption": "A turn with a checkpoint. Only geminiInteractions and geminiLive write one.",
  "lanes": [
    "Your code",
    "Theorem",
    "The provider"
  ],
  "steps": [
    {
      "lane": "Your code",
      "label": "You send both layers",
      "text": "runTurn takes the portable history in input.history, and the checkpoint in providerState.",
      "kind": "ingress"
    },
    {
      "lane": "Theorem",
      "label": "Theorem checks the checkpoint",
      "text": "It runs the six checks below, in order.",
      "kind": "guardrail",
      "parts": [
        {
          "label": "All pass",
          "text": "Theorem sends the state and only the history after it."
        },
        {
          "label": "One fails",
          "text": "Theorem yields a provider_warning and sends the history you passed, with no state."
        }
      ]
    },
    {
      "lane": "The provider",
      "label": "The provider answers",
      "text": "It goes on from its saved state, or reads the history again.",
      "kind": "model"
    },
    {
      "lane": "Your code",
      "label": "You save the new checkpoint",
      "text": "It arrives on done.providerState.",
      "kind": "guardrail"
    }
  ]
}
```

## The Dual-Layer Conversation Model

During multi-turn execution, the host persists both the portable history transcript and the optional native checkpoint:

If the provider, the model, the protocol version, the connection, the key slot or the covered history changes, Theorem drops the checkpoint and sends the history instead. Under `providerContinuation.history: 'provider'` you send no history, so nothing is replayed.

## Continuation Policies (`providerContinuation.history`)

The profile's `providerContinuation` block establishes who owns conversation memory:

```ts frame=profile:text
providerContinuation: {
	history: 'host', // 'host' | 'stateless' | 'provider'
},
```

Continuation policies are scoped strictly to turn types (`text`, `image`, `speech`, and `live`). Profiles targeting `decision`, `embedding`, or `host` do not support continuation and reject this setting during validation.

### Policy Comparison

| Mode | Who holds the conversation | What the host sends | When the turn goes elsewhere |
| :--- | :--- | :--- | :--- |
| **`'host'`** *(Default)* | The host | `input.history` and `providerState` | Theorem drops the checkpoint and sends the history. |
| **`'provider'`** | The provider | `providerState` alone, with no `input.history` | The turn needs the host's history. |
| **`'stateless'`** | Nobody | Neither | Not applicable. A request that carries `input.history` or `providerState` fails with a `request` error, and the `done` event carries no checkpoint. |

## Checkpoint Structure

A `ProviderCheckpoint` holds the upstream state alongside validation digests:

```text
interface ProviderCheckpoint {
	protocol: string;              // The protocol ID, e.g. 'geminiInteractions'
	provider: string;              // The provider ID, e.g. 'gemini'
	version: number;               // The protocol's continuation.version the data was written under
	apiId: string;                 // The upstream model ID
	keySlot?: string;              // The slot whose key the saved state belongs to
	compatibilityKey: string;      // Hash of the provider's connection and the options the protocol keys its state on
	coveredHistoryLength: number;  // How many history messages the state covers
	coveredHistoryHash: string;    // SHA-256 digest of those messages
	data: JsonValue;               // The protocol's own state
	wireCallIds?: Record<string, string>; // The wire's own ID for each Theorem call ID the state holds
}
```

### Transcript Prefix Verification (`historyHash`)

Before it uses a checkpoint, Theorem computes a SHA-256 digest of the first `coveredHistoryLength` history messages (`historyHash`). The digest sorts the keys of each message and removes the `<user_data>` fence around user text, so the same messages give the same digest.

If a host edits, truncates, or prepends messages in earlier parts of the transcript, `coveredHistoryHash` does not match, and Theorem treats the native state as invalidated.

## State Drift & Fallback Warnings

When it restores state, Theorem checks six things, in this order:

1. **Protocol and provider**: `provider_changed`
2. **API id**: `model_changed`
3. **Contract version**: `version_changed`
4. **Compatibility key**: `connection_changed`
5. **Key slot**: `key_changed`
6. **History**: `history_changed`

If every check passes, Theorem restores the state and sends only the new messages. The first check that fails names the reason.

When drift occurs, execution does not crash. Theorem sends the history instead and yields a `provider_warning` event, whose `warning` has this shape:

```text
export interface ProviderWarning {
	code: 'provider_state_rebuilt';
	reason:
		| 'provider_changed'    // Checkpoint belonged to another provider
		| 'model_changed'       // Checkpoint belonged to another model
		| 'connection_changed'  // Base URL or transport options changed
		| 'key_changed'         // Key slot changed (e.g., fallback key triggered)
		| 'history_changed'     // History was edited or truncated prior to checkpoint
		| 'version_changed';    // Protocol serialization format version bumped
}
```

## Runner Execution Example

`runTurn` streams events. The `done` event carries `providerState` when the protocol saved one. The host keeps it with the history it stores, and sends both on the next turn:

```ts frame=statements
import type { ProviderCheckpoint } from '@theoremjs/agents';

let providerState: ProviderCheckpoint | undefined;
for await (const event of runTurn(request)) {
	// ...
	if (event.type === 'done') providerState = event.providerState;
}

// The next turn, with the history the host stored
const next = runTurn({
	profile: 'research.scout',
	providerState,
	input: {
		history,
		text: 'Quote the exact claims from their abstracts.',
	},
});
```

If the checkpoint does not match the history or the binding, Theorem sends the history instead and emits a `provider_warning` event.

## Stateless Turns

For security-sensitive or high-throughput batch workloads where context retention is unwanted, configure `history: 'stateless'`:

```ts frame=profile:text
providerContinuation: {
	history: 'stateless',
},
```

When `history: 'stateless'` is set:
1. The `done` event carries no `providerState`.
2. A request that carries `input.history` or `providerState` fails with a `request` error: `A stateless profile takes no conversation history`.

This guarantees that multi-turn history cannot accidentally leak into stateless decision or analysis turns.

## Related Guides

* **[Profiles & Continuation](/docs/profiles)**: Declaring `providerContinuation.history` on agent profiles.
* **[Key Slots & Failover](/docs/providers)**: Multi-model bindings, key slot failover, and fallback routing.
* **[Supported Protocols](/docs/providers/protocols)**: Wire protocols, SSE stream parsers, and modality matrix.
* **[History Compaction](/docs/profiles/compaction)**: Automated token counting, sliding windows, and transcript pruning.
