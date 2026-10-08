---
title: Binding models
updated: 2026-10-08
summary: Register a provider, bind a model to it, pick one per request, and fix failed bindings.
entry: src/providers/mod.ts
covers: src/providers, src/kernel/registry/vault.ts, src/kernel/registry/catalog.ts, src/kernel/registry/profiles.ts, src/kernel/schema.ts
cover: /imagery/th30_midnightblueberries.png
coverAlt: Blueberry bushes at night
coverPosition: 0% 95%
---

Tell the agent which models it can call, and where each model finds its key. The key is never in the profile.

## The idea

A **provider** is a model server that you register once: OpenRouter, Google, a server on your machine. A **binding** is one entry under `models`. It names a registered provider and one model on it:

- `provider`: the `id` of a registered provider.
- `apiId`: the name of the model at the provider.
- `keySlot`: the name of a **key slot**. It is optional when the provider names a default slot.
- `providerOptions`: settings that only this provider understands. It is optional.

A provider holds an **adapter**, the code that speaks to one kind of model server. Theorem ships four: `openRouterAdapter`, `googleAdapter`, `openAIChat` and `typesafeAdapter`.

A key slot is a name, not a key. You fill the slot in a **vault**, an object that maps each slot name to a key. You pass the vault to `runTurn`. The profile can then stay in your repository, and the keys stay in your secrets store.

## Bind the models of the Harbor desk

These four steps give the Harbor desk one model, then a second model that a request can choose.

### 1. Register the provider

Register a provider before you register a profile that names it. The `id` is the name that bindings use.

```ts
import { openRouterAdapter, registerProvider } from '@theoremjs/agents';

registerProvider({
	id: 'openrouter',
	connection: {},
	adapter: openRouterAdapter(),
});
```

`connection` holds the settings of the server, such as its address. OpenRouter needs none. `registerProfile` throws a `config` error, `Unknown provider`, for a binding whose provider is not registered.

### 2. Declare a binding

Put the binding under `models`, with an id that you choose. Here the id is `main`.

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

A vault entry is a string, or a function that returns one when Theorem needs it. For a `live` profile, pass the `vault` to `runSession`. For a decision, pass it to `runDecision` ([Running a turn](/docs/runner)).

### 4. Let a request pick the model

The desk answers most questions with a fast model. A dispute about a hold needs a stronger one. Declare both, and let the request choose.

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

- Every model except a `local` one needs a slot. Set `keySlot` on the binding or on the provider. A turn on a model with no slot ends with an `auth` error.
- A slot name has at most 32 characters. It uses letters, digits, `-` and `_`.
- `fallbackKeySlot` names a second slot, on the binding or on the provider. If the provider refuses the first key for quota, Theorem retries once on the second. It must differ from `keySlot`.

## Choose a provider for the profile type

An adapter runs only some profile types. `registerProfile` refuses any other pair.

Adapter | Profile types
--- | ---
`openRouterAdapter` | `text`, `image`, `speech`, `decision`
`googleAdapter` | `text`, `image`, `speech`, `live`
`openAIChat` | `text`
`typesafeAdapter` | `decision`

A `speech` profile with `format: 'mp3'` needs a model that can make mp3. Use an OpenRouter model. Gemini speech returns `pcm`.

## Set providerOptions

`providerOptions` is checked by the adapter of the provider when you register the profile. An option that the adapter does not know makes `registerProfile` throw.

- `openRouterAdapter`: `cache` sets prompt caching, `{ mode: 'automatic' }` or `{ mode: 'system' }`, with an optional `ttl` of `5m` or `1h`.
- `googleAdapter`: `store`, `persistViaInteractionId` and `googleMapsLocation`.
- `openAIChat`: `server`.
- `typesafeAdapter`: none.

## Set persistViaInteractionId on Gemini

Google can keep the history of a chat for you. Set `persistViaInteractionId` in the `providerOptions` of a Google binding.

- `true`: Google builds the context from its stored interaction. This needs `store` left on.
- `false`: every call sends the history that you pass and the steps of the turn.

## Run a model on your machine

Use `openAIChat` to call a server on your machine that speaks the chat-completions format, such as Ollama. A local provider needs no key slot.

The connection sets `baseURL`, the address up to the path that Theorem adds. Theorem appends `/chat/completions`. The binding option `server` is a label that traces record. It is not a URL. If you set it, it must not be empty. A model on `openAIChat` serves `text` profiles only.

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

A wrong binding fails when the application starts, in `defineProfile` or `registerProfile`. A missing key fails when a turn runs. Each row is one failure and its fix.

Where | What you see | Fix
--- | --- | ---
`defineProfile`, kind `config` | The profile sets `key`, `fallbackKey`, `protocol` or `provider` | Move it to the registered provider or to the binding
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
