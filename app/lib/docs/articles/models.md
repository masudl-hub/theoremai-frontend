---
title: Binding models
updated: 2026-10-05
summary: Bind a model with a protocol, a provider and an apiId. Give it a key slot, pick a model per request, and fix a binding that fails.
entry: src/providers/mod.ts
covers: src/providers, src/kernel/registry/vault.ts, src/kernel/registry/catalog.ts, src/kernel/registry/profiles.ts, src/kernel/schema.ts
cover: /imagery/th30_midnightblueberries.png
coverAlt: Blueberry bushes at night
coverPosition: 0% 95%
---

Bind a model when the agent needs something to call. A binding is one entry under `models`, stored under an id you choose. It names the protocol, the provider, the provider’s model id and the key slot.

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

## Declare the bindings

- `protocol` and `provider` say how Theorem talks to the model. They must be a legal pair (see the table below).
- `apiId` is the model’s name at the provider.
- `key` names the vault slot that holds the key. You can set `key` once on the profile instead.

A `text`, `image`, `speech` or `live` profile declares at least one binding. With one binding and no `defaultModel`, that binding is the default. With two or more, set `defaultModel`.

A `decision` profile declares exactly one binding. A `host` profile declares none.

## Give the model a key

A profile never holds a key. It names a **key slot**. You fill the slot in a **vault**, an object that maps slot names to keys. The profile can then live in your repository and the keys stay in your secrets store.

Pass the vault when you create the provider.

```ts frame=statements
const provider = createProvider(profile, {
	vault: { openrouter: process.env.OPENROUTER_API_KEY },
});
```

## Key slot rules

- Every model except a `local` one needs a slot. Set `models.*.key` on the binding or `key` on the profile. Without one, `defineProfile` throws.
- A slot name has at most 32 characters. It uses letters, digits, `-` and `_`.
- `fallbackKey` names a second slot. If the provider refuses the first key for quota, Theorem retries once on the second. It must differ from `key`.

`createProvider(profile, options, modelId)` binds one model. If you leave out `modelId`, it uses `defaultModel`.

`createProvider` does not open live sessions. For a `live` profile, call `runSession` and pass the `vault` there ([Running a turn](/docs/runner)).

## Choose a legal pair

Protocol | Provider | Profile types
--- | --- | ---
`openAi` | `openrouter` | `text`, `image`, `speech`
`openAi` | `local` | `text`
`geminiInteractions` | `google` | `text`, `image`, `speech`
`geminiLive` | `google` | `live`
`decision` | `typesafe` or `openrouter` | `decision`

## Set persistViaInteractionId on Gemini

A `geminiInteractions` binding must set `persistViaInteractionId`.

- `true`: Google builds the context from its stored interaction. This needs `store` left on.
- `false`: every call sends the history that you pass and the steps of the turn.

## Run a model on your machine

Use a `local` model to call a server such as Ollama. The binding sets `server`, a label that traces record. It is not a URL. Only a `local` binding takes `server`, and it must not be empty.

You pass the URL when you create the provider. A `local` model serves `text` profiles only.

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

```ts frame=statements
createProvider(profile, { local: { baseUrl: 'http://127.0.0.1:11434' } }, 'local');
```

## Let a request pick the model

Use model selection when one agent needs a fast model and a deep one. A turn runs `defaultModel` unless the request names another key.

Set `allowModelSelect: true` on the profile. It needs two or more bindings. The request then passes `model`. Create the provider for that model.

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

## Fix a binding that fails

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

```note
A live session takes no `model`. It always runs `defaultModel`.
```
