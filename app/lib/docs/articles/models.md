---
title: Binding models
updated: 2026-10-07
summary: Bind a model to a key slot, pick one per request, and fix failed bindings.
entry: src/providers/mod.ts
covers: src/providers, src/kernel/registry/vault.ts, src/kernel/registry/catalog.ts, src/kernel/registry/profiles.ts, src/kernel/schema.ts
cover: /imagery/th30_midnightblueberries.png
coverAlt: Blueberry bushes at night
coverPosition: 0% 95%
---

Tell the agent which models it can call, and where each model finds its key. The key is never in the profile.

## The idea

A **binding** is one entry under `models`. It states how Theorem reaches one model:

- `protocol`: the wire format that Theorem speaks to the model.
- `provider`: the company or the server that runs the model.
- `apiId`: the name of the model at the provider.
- `key`: the name of a **key slot**.

A key slot is a name, not a key. You fill the slot in a **vault**, an object that maps each slot name to a key. The profile can then stay in your repository, and the keys stay in your secrets store.

`createProvider` joins the two. It reads the binding from the profile and the key from the vault, and it returns a provider that `runTurn` can call.

## Bind the models of the Harbor desk

These three steps give the Harbor desk one model, then a second model that a request can choose.

### 1. Declare a binding

Put the binding under `models`, with an id that you choose. Here the id is `main`.

```ts frame=profile:text
type: 'text',
models: {
	main: {
		protocol: 'openAi',
		provider: 'openrouter',
		apiId: 'openrouter/free',
		key: 'openrouter',
	},
},
```

`protocol` and `provider` must be a legal pair ([Choose a legal pair](/docs/models#choose-a-legal-pair)). You can set `key` one time on the profile, and leave it out of each binding.

The number of bindings depends on the type of profile:

- A `text`, `image`, `speech` or `live` profile declares one binding or more.
- A `decision` profile declares exactly one binding.
- A `host` profile declares none.

### 2. Fill the key slot

Pass the vault when you create the provider. The vault has one entry for each slot that the profile names.

```ts frame=statements
const provider = createProvider(profile, {
	vault: { openrouter: process.env.OPENROUTER_API_KEY },
});
```

`createProvider(profile, options, modelId)` binds one model. If you leave out `modelId`, it uses `defaultModel`.

`createProvider` does not open live sessions. For a `live` profile, call `runSession` and pass the `vault` there ([Running a turn](/docs/runner)).

### 3. Let a request pick the model

The desk answers most questions with a fast model. A dispute about a hold needs a stronger one. Declare both, and let the request choose.

```ts frame=profile:text
type: 'text',
models: {
	flash: {
		protocol: 'openAi',
		provider: 'openrouter',
		apiId: 'openrouter/free',
		key: 'openrouter',
	},
	pro: {
		protocol: 'openAi',
		provider: 'openrouter',
		apiId: 'example/other',
		key: 'openrouter',
	},
},
defaultModel: 'flash',
allowModelSelect: true,
```

- With two bindings or more, set `defaultModel`. With one binding, that binding is the default.
- `allowModelSelect: true` lets a request pass `model`. It needs two bindings or more.
- A turn runs `defaultModel` unless the request names another key of `models`. Create the provider for that model.

```note
A live session takes no `model`. It always runs `defaultModel`.
```

## Key slot rules

A slot keeps a key out of the profile. These rules keep the slot names safe and complete.

- Every model except a `local` one needs a slot. Set `models.*.key` on the binding or `key` on the profile. Without one, `defineProfile` throws.
- A slot name has at most 32 characters. It uses letters, digits, `-` and `_`.
- `fallbackKey` names a second slot. If the provider refuses the first key for quota, Theorem retries once on the second. It must differ from `key`.

## Choose a legal pair

A protocol works only with the providers that speak it. `defineProfile` refuses any other pair.

Protocol | Provider | Profile types
--- | --- | ---
`openAi` | `openrouter` | `text`, `image`, `speech`
`openAi` | `local` | `text`
`geminiInteractions` | `google` | `text`, `image`, `speech`
`geminiLive` | `google` | `live`
`decision` | `typesafe` or `openrouter` | `decision`

## Set persistViaInteractionId on Gemini

Google can keep the history of a chat for you. A `geminiInteractions` binding must say if it uses that store. Set `persistViaInteractionId`.

- `true`: Google builds the context from its stored interaction. This needs `store` left on.
- `false`: every call sends the history that you pass and the steps of the turn.

## Run a model on your machine

Use a `local` model to call a server on your machine, such as Ollama. A `local` binding needs no key slot.

The binding sets `server`, a label that traces record. It is not a URL. Only a `local` binding takes `server`, and it must not be empty. A `local` model serves `text` profiles only.

```ts frame=profile:text
type: 'text',
models: {
	local: {
		protocol: 'openAi',
		provider: 'local',
		apiId: 'llama3.2',
		server: 'ollama',
	},
},
```

You pass the URL when you create the provider.

```ts frame=statements
createProvider(profile, { local: { baseUrl: 'http://127.0.0.1:11434' } }, 'local');
```

## Fix a binding that fails

Most wrong bindings fail in `defineProfile`, when the application starts. Each row is one failure and its fix.

Where | What you see | Fix
--- | --- | ---
`defineProfile`, kind `config` | The protocol is not valid for the provider | Use a pair from the table above
`defineProfile`, kind `config` | The model needs `models.*.key` or the profile `key` | Set a key slot
`defineProfile`, kind `config` | `persistViaInteractionId` is required on a `geminiInteractions` binding | Set it to `true` or `false`
`defineProfile`, kind `config` | The profile must set `defaultModel` when it declares more than one model | Set `defaultModel`
`defineProfile`, kind `config` | `allowModelSelect` requires at least two models | Add a model, or remove the flag
`defineProfile`, kind `config` | `fallbackKey` is the same slot as `key` | Name a different slot
`defineProfile`, kind `config` | The key is not a key slot name | Use up to 32 letters, digits, `-` or `_`
`defineProfile`, kind `config` | `server` is only valid when the provider is `local` | Remove `server`
`defineProfile`, kind `config` | A local server serves text profiles only | Use a `text` profile
`createProvider`, kind `config` | It requires a vault, or `local` options | Pass `vault`, or `local` for a `local` model
`createProvider`, kind `request` | It does not support `live`, `host` or `decision` | Use `runSession`, `invokeTool` or `runDecision`
A turn, kind `request` | The profile does not allow model selection, or the model is not a key of `models` | Set `allowModelSelect`, or name a key of `models`
A turn, `error` event with `errorKind: 'auth'` | The vault has no key in the slot that the model names | Fill the slot. The stream reports this as an event, not a throw
