---
title: Binding models
updated: 2026-10-09
summary: Register a provider, bind a model to it, pick one per request, and fix failed bindings.
entry: src/providers/mod.ts
covers: src/providers, src/kernel/registry/vault.ts, src/kernel/registry/catalog.ts, src/kernel/registry/profiles.ts, src/kernel/schema.ts
cover: /imagery/th30_midnightblueberries.png
coverAlt: Blueberry bushes at night
coverPosition: 0% 95%
---

Select a model through a registered provider. Keep credentials in the host's vault, outside the profile.

## The idea

A **provider definition** contains connection settings, credential-slot names, and an adapter.
An **adapter** converts Theorem requests and model responses to and from a model server's protocol.
Register the definition once under an ID that your application chooses.

A **binding** is an entry under `models`. It selects that registered provider and an upstream model.

| Field | Value |
| --- | --- |
| `provider` | The registered provider ID |
| `apiId` | The upstream model or deployment ID |
| `keySlot` | Optional credential-slot override |
| `providerOptions` | Optional adapter-specific JSON settings |

A **key slot** names a credential. It does not contain the credential.
A **vault** maps slot names to credential values or resolver functions.
Pass the vault in host options when you run the agent.

The provider definition contains host code. The binding contains ordinary data.
The same registered provider can supply models to several profiles.

## Bind the models of the Harbor desk

These four steps give the Harbor desk one model, then a second model that a request can choose.

### 1. Register the provider

Register a provider before you register a profile that names it. The `id` is the name that bindings use.

```ts
import { defineProvider, openRouterAdapter, registerProvider } from '@theoremjs/agents';

const router = defineProvider({
	id: 'openrouter',
	connection: {},
	keySlot: 'openrouter',
	adapter: openRouterAdapter(),
});
registerProvider(router);

export const binding = router.model('openrouter/free');
```

`connection` holds server settings, such as its address. OpenRouter uses its default address when this object is empty.
The definition names the default credential slot. Its `.model()` helper checks settings and returns binding data.
`registerProfile` rejects an unknown provider with a `config` error.

### 2. Declare a binding

Put binding data under `models`, with a name that you choose. Here the name is `main`.
You can use the helper result or write the equivalent data directly. Registration validates either form.

```ts frame=profile:text
type: 'text',
models: {
	main: {
		provider: 'openrouter',
		apiId: 'openrouter/free',
		keySlot: 'openrouter',
	},
},
```

To set the slot one time, put `keySlot` on the provider and leave it out of each binding. A binding's `keySlot` replaces the provider's.

The number of bindings depends on the type of profile:

- A `text`, `image`, `speech` or `live` profile declares one binding or more.
- A `decision` profile declares exactly one binding.
- A `host` profile declares none.

### 3. Fill the key slot

Pass the vault to `runTurn`, in the host options after the request. The vault has one entry for each slot that the profile names.

```ts frame=statements
const hostOptions = {
	vault: { openrouter: process.env.OPENROUTER_API_KEY },
};
```

A vault entry is a string, a JSON credential object, or a resolver function.
A resolver can return a promise. Theorem calls it when the adapter needs the credential.
The adapter checks the resolved value. The host owns caching and refresh.
Pass the same host options to `runSession` or `runDecision` for those profile types ([Running a turn](/docs/runner)).

### 4. Let a request pick the model

Declare several bindings when requests need different models.
The desk uses one model for routine questions and another for shipment disputes.

```ts frame=profile:text
type: 'text',
models: {
	flash: {
		provider: 'openrouter',
		apiId: 'openrouter/free',
		keySlot: 'openrouter',
	},
	pro: {
		provider: 'openrouter',
		apiId: 'example/other',
		keySlot: 'openrouter',
	},
},
defaultModel: 'flash',
allowModelSelect: true,
```

- With two bindings or more, set `defaultModel`. With one binding, that binding is the default.
- `allowModelSelect: true` lets a request pass `model`. It needs two bindings or more.
- A turn runs `defaultModel` unless the request names another key of `models`.

```note
A live session takes no `model`. It always runs `defaultModel`.
```

## Key slot rules

A slot keeps a key out of the profile. These rules keep the slot names safe and complete.

- OpenRouter, Google, and TypeSafe need a credential slot. Set `keySlot` on the definition or binding.
- A compatible endpoint needs a slot if its server requires a credential. External adapters declare their own credential requirements.
- A slot name has at most 32 characters. It uses letters, digits, `-` and `_`.
- `fallbackKeySlot` names an explicit second slot on the definition or binding. It must differ from the primary slot.
- The adapter decides when to use fallback. OpenRouter chat and Google Interactions retry quota failures once with the fallback credential.

## Choose a provider for the profile type

Choose an adapter that provides the operation your profile requires.
`registerProfile` rejects a profile type that the adapter does not declare.

Adapter | Profile types
--- | ---
`openRouterAdapter` | `text`, `image`, `speech`, `decision`
`googleAdapter` | `text`, `image`, `speech`, `live`
`openAIChat` | `text`
`typesafeAdapter` | `decision`

The model can restrict these choices further. Required features need declared support before transport opens.
Unknown or unsupported requirements fail instead of silently losing settings.

### Configure a compatible protocol

Use `openAIChat` for an endpoint that accepts the compatible chat format.
Its default declaration verifies text input, text output, and streaming.
Tools, structured output, and reasoning remain unknown until you supply verified `ProviderCapabilities` in its `capabilities` option.

For an unknown Gemini model, pass a model-ID-to-capabilities map to `googleAdapter`.
A declaration records verified features. It does not add protocol behavior to the adapter.

### Implement a different protocol

Implement the public `ProviderAdapter` contract when the endpoint requires different request or response formats.
Declare schemas, capabilities, request validation, and supported operations. Register the adapter under your own provider ID.
Its executable code remains on the host. Profiles contain only its ID and JSON settings.
The kernel retains authority over guardrails, approvals, and client-tool execution.

A `speech` profile with `format: 'mp3'` needs a model that can make mp3. Use an OpenRouter model. Gemini speech returns `pcm`.

## Set providerOptions

Put vendor-specific settings in `providerOptions`. Keep shared settings, such as `maxOutputTokens`, on the binding.
The `.model()` helper and profile registration validate options with the selected adapter schema.
Unknown options fail validation.

- `openRouterAdapter`: `cache` sets prompt caching, `{ mode: 'automatic' }` or `{ mode: 'system' }`, with an optional `ttl` of `5m` or `1h`.
- `googleAdapter`: `store`, `persistViaInteractionId` and `googleMapsLocation`.
- `openAIChat`: `server`.
- `typesafeAdapter`: none.

## Keep Google interaction state

Use `providerOptions.persistViaInteractionId` when Google must retain native interaction context.
Storage must remain enabled: leave `store` unset or set it to `true`.
Without persistence, the adapter sends the history and current turn steps that you supply.

Save the returned `providerState` beside portable history. Send both on the next request.
The kernel validates the checkpoint before the adapter uses its interaction ID.
If the checkpoint becomes incompatible, the default policy rebuilds from portable history.
[Running a turn](/docs/runner) gives the save and recovery procedure.

## Run a model on your machine

Use `openAIChat` for a local server that accepts the compatible chat format, such as Ollama.
Omit the key slot only if that server does not require credentials.

Set `connection.baseURL` to the API base address. The adapter appends `/chat/completions`.
The optional `providerOptions.server` is a nonempty trace label, not an address.
`openAIChat` runs `text` profiles only.

```ts
import { openAIChat, registerProvider } from '@theoremjs/agents';

registerProvider({
	id: 'local',
	connection: { baseURL: 'http://127.0.0.1:11434/v1' },
	adapter: openAIChat(),
});
```

```ts frame=profile:text
type: 'text',
models: {
	local: {
		provider: 'local',
		apiId: 'llama3.2',
		providerOptions: { server: 'ollama' },
	},
},
```

## Fix a binding that fails

Configuration checks run during definition and registration. Credential resolution and actual request checks run when the operation starts.
Use this table to identify the failed boundary and its correction.

Where | What you see | Fix
--- | --- | ---
`defineProfile`, kind `config` | The profile sets `key`, `fallbackKey`, `protocol` or `provider` | Use registered provider IDs in bindings; put credential defaults in provider definitions
`defineProfile`, kind `config` | The model needs `provider` and `apiId` | Set both on the binding
`defineProfile`, kind `config` | The profile must set `defaultModel` when it declares more than one model | Set `defaultModel`
`defineProfile`, kind `config` | `allowModelSelect` requires at least two models | Add a model, or remove the flag
`defineProfile`, kind `config` | `keySlot` is not a key slot name | Use up to 32 letters, digits, `-` or `_`
`defineProfile`, kind `config` | A binding sets a key that its model does not know | Remove it, or move it into `providerOptions`
`registerProvider` or `registerProfile`, kind `config` | The fallback slot is the same slot as the primary | Name a different slot
`registerProfile`, kind `config` | Unknown provider | Register the provider first
`registerProfile`, kind `unsupported` | The provider cannot run profiles of this type | Use a provider from the table above
`registerProfile` throws | `providerOptions` has an option that the adapter does not know, or `persistViaInteractionId` is on with `store` off | Use an option from the list above
A turn, `error` event with `errorKind: 'auth'` | The vault has no key in the slot that the model names, or the model names no slot | Fill the slot, or name one. The stream reports this as an event, not a throw
A turn, kind `request` | The profile does not allow model selection, or the model is not a key of `models` | Set `allowModelSelect`, or name a key of `models`
