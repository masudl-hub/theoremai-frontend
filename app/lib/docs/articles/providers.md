---
title: Key Slots & Failover
updated: 2026-11-02
summary: Where a model's keys come from, how slots resolve, and how a failed call retries or moves to a second key.
entry: src/providers/mod.ts
covers: src/providers, src/kernel/protocols
cover: /imagery/th30_hayss.png
coverAlt: Golden haystacks across open farmland at dusk
coverPosition: 50% 50%
---

A [model binding](/docs/profiles/bindings) names the key slot its calls are signed with. Your vault holds the key, and Theorem reads it when a turn runs. This page covers where keys come from, how they resolve, and what happens when a call fails.

Bindings hold no secret keys, open no sockets, and stay apart from environment variables.

## Name a Binding's Key Slots

`keySlot` names the key a model's calls are signed with, and `fallbackKeySlot` names a second key. Left out, each one defaults to the slot registered on the provider:

```ts frame=profile:text
models: {
	open: {
		provider: 'openrouter',
		protocol: 'openRouterOpenAi',
		apiId: 'openrouter/free',
		keySlot: 'openrouter_primary',
		fallbackKeySlot: 'openrouter_secondary',
	},
},
```

## Choosing Upstreams on OpenRouter

OpenRouter can answer one model from several upstreams. Set `provider` in a binding's `options` to say which of them may answer. It is OpenRouter's own `provider` request field, under OpenRouter's own names. Without it, OpenRouter makes its own choice. The scout sets none. To add one:

```ts frame=models
models: {
	open: {
		// ...
		options: {
			provider: { only: ['gmicloud/fp8'], allow_fallbacks: false },
		},
	},
},
```

| Field | Type | Description |
| :--- | :--- | :--- |
| **`only`** | `string[]` | Upstream endpoints to allow, by slug, such as `gmicloud/fp8`. |
| **`order`** | `string[]` | Upstream endpoints to try first, in order. |
| **`ignore`** | `string[]` | Upstream endpoints to skip. |
| **`allow_fallbacks`** | `boolean` | Whether another upstream may answer when the listed ones cannot. |
| **`require_parameters`** | `boolean` | Whether every upstream must support every supplied parameter. On unless you set it. |
| **`data_collection`** | `'allow'` \| `'deny'` | Whether an upstream that may store and train on data can answer. |
| **`zdr`** | `boolean` | Use only endpoints with zero data retention. |
| **`enforce_distillable_text`** | `boolean` | Use only models whose authors allow text distillation. |
| **`quantizations`** | `string[]` | Quantization levels to allow, such as `fp8`. |
| **`sort`** | `string` \| `{ by, partition? }` | What to order upstreams by: `price`, `throughput` or `latency`. |
| **`preferred_min_throughput`** | `number` \| object | Tokens per second below which an upstream is tried later. |
| **`preferred_max_latency`** | `number` \| object | Seconds above which an upstream is tried later. |
| **`max_price`** | `{ prompt?, completion?, request?, image? }` | The prices above which an upstream is refused: per million input tokens, per million output tokens, per request and per image. |

The field goes out on text profiles only. A speech request on this protocol leaves without it.

## Startup Verification

When `registerProfile()` loads a profile, Theorem validates every model binding synchronously before any network calls occur:

1. **Provider Check**: Confirms the provider ID exists in the active registry.
2. **Protocol Check**: Confirms the registered provider serves `binding.protocol`.
3. **Modality Check**: Confirms the protocol supports the profile's modality (text, live voice, embeddings, images, speech, transcription, or decisions).
4. **Options Validation**: Parses `models.*.options` through the protocol's Zod validator.
5. **Slot Invariants**: Ensures `keySlot` does not equal `fallbackKeySlot`, and rejects key slots if the provider definition requires no key.

Any mismatch throws a typed `TheoremError('config')` or `TheoremError('unsupported')` immediately.

## Key Slots & Resolution Hierarchy

Credentials never live in profile files. Model bindings point to **slots** in the host vault.

### Slot Name Rules

Slot names must match `KEY_SLOT_NAME`:

```text
/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/
```

Slot names can contain letters, numbers, hyphens, and `_` characters, up to 32 characters, starting with an alphanumeric character.

### Resolution Hierarchy

Key slots resolve with a clear priority:

* **Binding Override**: If `keySlot` is specified on the model binding, it takes precedence.
* **Provider Default**: If omitted on the model binding, it falls back to the provider's registered `keySlot`.
* **Duplicate Prevention**: `keySlot` and `fallbackKeySlot` cannot match. Setting both to the same slot throws a `TheoremError('config')`.

## The Host Vault & Dynamic Resolvers

Vault credentials are provided to `runTurn()` via `options.vault`:

```ts frame=statements
const events = runTurn(request, {
	vault: {
		openrouter_primary: process.env.OPENROUTER_PRIMARY_KEY,
		openrouter_secondary: process.env.OPENROUTER_BACKUP_KEY,
	},
});
// ...
```

### Dynamic Resolvers (`CredentialResolver`)

For rotating credentials, KMS lookups, or secrets fetched just-in-time, pass an async resolver function:

```ts frame=statements
import type { CredentialContext, KeyCredential } from '@theoremjs/agents';

const getSecretKey = async (ctx: CredentialContext): Promise<KeyCredential> => {
	// ctx contains: providerId, keySlot, and, when present, apiId and signal
	return await kmsClient.fetchSecret(ctx.keySlot, { signal: ctx.signal });
};

const events = runTurn(request, {
	vault: { openrouter_primary: getSecretKey },
});
// ...
```

The kernel invokes the resolver only for the slot requested by the active model call.

## Automated Failover & Retry

Theorem retries a failed model call, and can move it to a second key:

```figure
{
  "kind": "lanes",
  "still": {
    "src": "/imagery/th30_ceruleanshelf.png",
    "position": "50% 50%"
  },
  "caption": "A call that fails before its first event. After the first event, an error goes through to your code.",
  "lanes": [
    "Theorem",
    "The provider"
  ],
  "steps": [
    {
      "lane": "Theorem",
      "label": "Theorem sends the request",
      "text": "It signs the call with the key in keySlot.",
      "kind": "runner"
    },
    {
      "lane": "The provider",
      "label": "The provider fails the call",
      "text": "The answer is an error status, or the network fails.",
      "kind": "model"
    },
    {
      "lane": "Theorem",
      "label": "Theorem retries on the same key",
      "text": "On status 408, 429, 500, 502, 503, 504 or 529, or a network failure. It tries up to 4 more times and waits up to 5 seconds in all, and it follows Retry-After.",
      "kind": "runner"
    },
    {
      "lane": "Theorem",
      "label": "Theorem reads the last failure",
      "text": "What happens next depends on the kind of error.",
      "kind": "guardrail",
      "parts": [
        {
          "label": "rate_limit or busy",
          "text": "Theorem sends the call again on fallbackKeySlot, if the vault holds that key."
        },
        {
          "label": "auth",
          "text": "Theorem drops the cached signer token and tries once more."
        },
        {
          "label": "Any other error",
          "text": "The error goes through to your code."
        }
      ]
    }
  ]
}
```

### Failover Rules

1. **Before the first event**: Failover happens only on a `rate_limit` or `busy` error that comes before the call yields its first event, and only when the vault holds a key in `fallbackKeySlot`. After the first event, the error goes through.
2. **Clean start**: The call on `fallbackKeySlot` starts clean. It does not send the saved provider state of the first key, because the fallback slot can belong to another account.
3. **Upstream row**: Each failover records a `key_fallback` row in the upstream log, with the slot it left, the slot it moved to, the error kind and the error message.
4. **Auth refusal**: After an `auth` error, the kernel drops the cached signer token and tries the call once more.

## Related Guides

* **[Defining a Provider](/docs/providers/defining)**: Configuring endpoints, pre-defined providers, signers, and connection sanitization.
* **[Supported Protocols](/docs/providers/protocols)**: Wire protocols, SSE stream parsers, and modality matrix.
* **[Profiles & Bindings](/docs/profiles/bindings)**: Declaring model selection, reasoning efforts, and execution limits.
