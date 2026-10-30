---
title: Model Bindings & Key Slots
updated: 2026-10-29
summary: Configure model bindings, credentials, and secondary failover slots across upstream AI providers.
entry: src/providers/mod.ts
covers: src/providers, src/kernel/protocols
cover: /imagery/th30_hayss.png
coverAlt: Golden haystacks across open farmland at dusk
coverPosition: 50% 50%
---

A model binding connects a profile to an upstream AI model. It pairs a registered provider with one of its served protocols, an upstream model ID, and credential slots.

Model bindings contain pure configuration. They hold no secret keys, open no sockets, and remain decoupled from environment variables. All credentials stay in the host vault and resolve when a turn runs.

## Declaring a Model Binding

Models are declared under `models` on the profile. A binding defines five core fields:

| Field | Type | Description |
| :--- | :--- | :--- |
| **`provider`** | `string` | The ID of a registered provider (e.g., `'openrouter'`, `'gemini'`, `'local'`). |
| **`protocol`** | `string` | The protocol ID served by that provider (e.g., `'openRouterOpenAi'`, `'geminiInteractions'`). |
| **`apiId`** | `string` | Upstream model identifier recognized by the provider (e.g., `'anthropic/claude-sonnet-4.5'`). |
| **`keySlot`** | `string` *(optional)* | Vault credential slot name. Defaults to the provider's registered `keySlot`. |
| **`fallbackKeySlot`** | `string` *(optional)* | Secondary vault slot tried when the primary key is out of quota or the model is busy. Defaults to the provider's registered `fallbackKeySlot`. |

```ts frame=profile:text
models: {
		primary: {
			provider: 'openrouter',
			protocol: 'openRouterOpenAi',
			apiId: 'anthropic/claude-sonnet-4.5',
			keySlot: 'openrouter_primary',
			fallbackKeySlot: 'openrouter_secondary',
		},
	},
```

Bindings can also be generated using a registered provider's helper:

```text
const primary = router.model('openRouterOpenAi', 'anthropic/claude-sonnet-4.5', {
	fallbackKeySlot: 'openrouter_secondary',
});
```

Both forms produce the exact same validated data object checked by `modelBindingSchema`.

## Startup Verification

When `registerProfile()` loads a profile, Theorem validates every model binding synchronously before any network calls occur:

1. **Provider Check**: Confirms the provider ID exists in the active registry.
2. **Protocol Check**: Confirms the registered provider serves `binding.protocol`.
3. **Modality Check**: Confirms the protocol supports the profile's modality (text, live voice, embeddings, images, speech, or decisions).
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

```ts
import { runTurn } from '@theoremjs/agents';

await runTurn(
	{ profile: 'harbor.desk', input: { text: 'Summarize manifests.' } },
	{
		vault: {
			openrouter_primary: process.env.OPENROUTER_PRIMARY_KEY,
			openrouter_secondary: process.env.OPENROUTER_BACKUP_KEY,
		},
	},
);
```

### Dynamic Resolvers (`CredentialResolver`)

For rotating credentials, KMS lookups, or secrets fetched just-in-time, pass an async resolver function:

```ts
import { type CredentialContext, type KeyCredential, runTurn } from '@theoremjs/agents';

const getSecretKey = async (ctx: CredentialContext): Promise<KeyCredential> => {
	// ctx contains: providerId, apiId, keySlot, and signal
	return await kmsClient.fetchSecret(ctx.keySlot, { signal: ctx.signal });
};

await runTurn(
	{ profile: 'harbor.desk', input: { text: 'Summarize manifests.' } },
	{
		vault: { openrouter_primary: getSecretKey },
	},
);
```

The kernel invokes the resolver only for the slot requested by the active model call.

## Automated Failover & Retry

During upstream model execution, Theorem wraps provider requests in an automated self-healing loop:

```mermaid
sequenceDiagram
		participant Kernel as Turn Runner
		participant Primary as Primary Slot
		participant Fallback as Fallback Slot

		Kernel->>Primary: POST request (openrouter_primary)
		alt rate_limit or busy, before the first event
				Primary-->>Kernel: Out of quota or busy
				Note over Kernel: Discard session state (clean slate)
				Kernel->>Fallback: POST request (openrouter_secondary)
				Fallback-->>Kernel: 200 OK (Stream Events)
				Kernel-->>User: Content Stream
		else auth error
				Primary-->>Kernel: Key refused
				Note over Kernel: Invalidate cached signer & refresh once
				Kernel->>Primary: POST retry
		end
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
