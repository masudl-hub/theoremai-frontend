---
title: Binding models
updated: 2026-10-22
summary: Register a provider, bind a model to it, pick one per request, and fix failed bindings.
entry: src/providers/mod.ts
covers: src/providers, src/kernel/protocols, src/kernel/registry/vault.ts, src/kernel/registry/catalog.ts, src/kernel/registry/profiles.ts, src/kernel/schema.ts
cover: /imagery/th30_midnightblueberries.png
coverAlt: Blueberry bushes at night
coverPosition: 0% 95%
---

Select a model through a registered provider. Keep credentials in the host's vault, outside the profile.

## The idea

A model call uses three parts:

- A **protocol** is the code for one API shape, such as OpenAI Chat Completions. It writes each request and reads each reply.
- A **provider** is data about a service: its address, the protocols that it serves, and how to sign in. It contains no request code.
- A **binding** is an entry under `models`. It names a protocol, a registered provider and an upstream model.

Register a provider one time in a scope. The registration sets its connection and its key slots.

| Field | Value |
| --- | --- |
| `protocol` | The protocol ID, such as `openRouterOpenAi` |
| `provider` | The registered provider ID |
| `apiId` | The upstream model or deployment ID |
| `keySlot` | Optional credential-slot override |
| `fallbackKeySlot` | Optional second credential slot |
| `options` | Optional settings that the protocol defines |

A **key slot** names a credential. It does not contain the credential.
A **vault** maps slot names to credential values or resolver functions.
Pass the vault in host options when you run the agent.

The provider and the protocol are host code. The binding contains ordinary data.
The same registered provider can supply models to several profiles.

## Bind the models of the Harbor desk

These four steps give the Harbor desk one model, then a second model that a request can choose.

### 1. Register the provider

Register a provider before you register a profile that names it. Bindings use the registered ID.

```ts
import { openRouterProvider, registerProvider } from '@theoremjs/agents';

const router = registerProvider(openRouterProvider, { keySlot: 'openrouter' });

export const binding = router.model('openRouterOpenAi', 'openrouter/free');
```

The second argument is the registration. Its fields are `id`, `connection`, `keySlot` and `fallbackKeySlot`, and each is optional.
The registered ID is the provider's own `id`, here `openrouter`, unless you set `id`.
`connection` holds server settings, such as its address. OpenRouter uses its default address when you omit it.
The `.model()` helper checks the options against the protocol and returns binding data.
`registerProfile` rejects an unknown provider with a `config` error.

### 2. Declare a binding

Put binding data under `models`, with a name that you choose. Here the name is `main`.
You can use the helper result or write the equivalent data directly. Registration validates either form.

```ts frame=profile:text
type: 'text',
models: {
	main: {
		protocol: 'openRouterOpenAi',
		provider: 'openrouter',
		apiId: 'openrouter/free',
		keySlot: 'openrouter',
	},
},
```

To set the slot one time, set `keySlot` in the registration and leave it out of each binding. A binding's `keySlot` replaces the registration's.

The number of bindings depends on the type of profile:

- A `text`, `image`, `speech`, `live` or `embedding` profile declares one binding or more.
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
Each entry must be an own property of the vault. Theorem ignores inherited entries.
A resolver can return a promise. Theorem calls it before it signs the request.
The provider's key schema checks the resolved value. The host owns caching and refresh.
Pass the same host options to `runSession`, `runDecision` or `runEmbedding` for those profile types ([Running a turn](/docs/runner)).

### 4. Let a request pick the model

Declare several bindings when requests need different models.
The desk uses one model for routine questions and another for shipment disputes.

```ts frame=profile:text
type: 'text',
models: {
	flash: {
		protocol: 'openRouterOpenAi',
		provider: 'openrouter',
		apiId: 'openrouter/free',
		keySlot: 'openrouter',
	},
	pro: {
		protocol: 'openRouterOpenAi',
		provider: 'openrouter',
		apiId: 'example/other',
		keySlot: 'openrouter',
	},
},
defaultModel: 'flash',
allowModelSelect: true,
```

- With two bindings or more, set `defaultModel`. With one binding, that binding is the default.
- `allowModelSelect: true` lets a request pass `model`. A name that is not a key of `models` is refused.
- A turn runs `defaultModel` unless the request names another key of `models`.

```note
A live session takes no `model`. It always runs `defaultModel`.
```

## Bound provider operations

Set `limits` in provider host options when your service needs tighter deadlines or response budgets.
The defaults allow 120 seconds per operation and 30 seconds to open a live connection.
Creation, credential resolution, and retries share the deadline. HTTP retries also share the byte budget.
A request that gets no response, or the status 408, 429, 500, 502, 503, 504 or 529, is sent again, at most four times. Each wait is the `Retry-After` of the response when it gives one, else 1, 2, 4, then 8 seconds. The waits stay within 5 seconds in all and within the deadline. After the last try, the error goes back as it came.
Normalized limits count media, tool arguments, and native state as well as text.
Limits remain host code. They do not enter a model binding or profile.
A protocol that you define gets these protections when it calls `send` or `connect` on its context.

## Key slot rules

A slot keeps a key out of the profile. These rules keep the slot names safe and complete.

- OpenRouter, Gemini and TypeSafe need a credential slot. Set `keySlot` in the registration or the binding.
- The local provider takes a key only if you name a slot. A provider without a key schema refuses a slot.
- A slot name has at most 32 characters. It uses letters, digits, `-` and `_`.
- `fallbackKeySlot` names a second slot in the registration or the binding. It must differ from the primary slot.
- After a quota refusal (HTTP 429), the kernel retries once with the fallback key. The vault must hold that slot.
- After an `auth` refusal, the kernel signs the request again and retries once.

These two retries happen before the reply starts.

## Choose a protocol for the profile type

Choose a protocol that has an endpoint for your profile type, and a provider that serves it.
`registerProfile` rejects a protocol that the provider does not serve, or that has no endpoint for the type.

Protocol | Profile types | Served by
--- | --- | ---
`openRouterOpenAi` | `text`, `speech` | `openRouterProvider`
`openRouterImages` | `image` | `openRouterProvider`
`openRouterEmbeddings` | `embedding` | `openRouterProvider`
`geminiInteractions` | `text`, `image`, `speech` | `geminiProvider`
`geminiLive` | `live` | `geminiProvider`
`geminiEmbeddings` | `embedding` | `geminiProvider`
`openAi` | `text`, `speech` | `localProvider`
`ollamaEmbeddings` | `embedding` | `localProvider`
`systemOne` | `decision` | `typesafeProvider`
`openRouterDecisions` | `decision` | `openRouterProvider`

Each first-party provider has a default ID and a connection:

Provider | ID | Connection | Key
--- | --- | --- | ---
`openRouterProvider` | `openrouter` | Optional `baseUrl`, `decisionUrl`, `siteUrl`, `siteName` | Required. Sent as a bearer token
`geminiProvider` | `gemini` | Optional `host` | Required. Sent in the `x-goog-api-key` header. Live sends it in the URL query
`typesafeProvider` | `typesafe` | Optional `baseUrl` | Required. Sent as a bearer token
`localProvider` | `local` | Required `baseUrl` | Optional. Sent as a bearer token

A `speech` profile with `format: 'mp3'` needs a model that can make mp3. Use an OpenRouter model. Gemini speech returns `pcm`.

### Connect a compatible server

Define a provider when a server speaks a protocol that Theorem already has.
A provider names the protocols that it serves, the base address of each, and how to sign in.

```ts
import { bearer, defineProvider, openAi, registerProvider } from '@theoremjs/agents';
import { z } from 'zod';

const gateway = defineProvider({
	id: 'gateway',
	name: 'Company gateway',
	description: 'The chat gateway of the company.',
	connection: z.strictObject({ baseUrl: z.string() }),
	key: z.string().trim().min(1),
	authorize: bearer(),
	serves: (at) => [{ protocol: openAi, baseUrl: at.baseUrl }],
});

registerProvider(gateway, {
	connection: { baseUrl: 'https://gateway.example/v1' },
	keySlot: 'gateway',
});
```

A provider ID uses lowercase letters, digits and `-`, and starts with a letter.
`connection` and `key` are zod schemas. Registration refuses a connection that does not parse.
Leave out `key` when the server takes no credential.
`bearer()`, `header(name)` and `query(name)` put the key on each request.
`serves` can also set `headers`, a different sign-in, or a `url` function for each protocol.
Optional `prices` fill in cost when the reply carries none.

### Implement a different protocol

Use `extendProtocol` when an API nearly matches a protocol that Theorem has.
The extension has its own ID. It can add options and endpoints, add to each request body, and read each reply row first.

```ts
import { extendProtocol, openAi } from '@theoremjs/agents';
import { z } from 'zod';

export const taggedChat = extendProtocol(openAi, {
	id: 'taggedChat',
	name: 'Tagged chat',
	description: 'OpenAI Chat Completions with a tag on each request.',
	options: z.strictObject({ tag: z.string().optional() }),
	body: (body, at) => ({ body: at.options.tag ? { ...body, user: at.options.tag } : body }),
});
```

Use `defineProtocol` for an API shape that is new.
Its definition names the endpoints for each profile type, the options schema, and a `create` function.
`create` gets a context with `send` and `connect`, and returns the operations: `complete`, `openSession`, `decide` or `embed`.
The protocol never holds a key, a slot or a base address. The provider supplies them when the kernel sends.
The kernel retains authority over guardrails, approvals, and client-tool execution.

## Set options

Put protocol-specific settings in `options`. Keep shared settings, such as `maxOutputTokens`, on the binding.
The `.model()` helper and profile registration validate options with the protocol's schema.
Unknown options fail validation.

- `openRouterOpenAi`: `cache` sets prompt caching, `{ mode: 'automatic' }` or `{ mode: 'system' }`, with an optional `ttl` of `5m` or `1h`.
- `geminiInteractions`: `store` and `persistViaInteractionId`.
- `geminiEmbeddings`: `outputDimensionality` of 768, 1536 or 3072, and `taskType`, such as `RETRIEVAL_QUERY`, for `gemini-embedding-001`. Gemini Embedding 2 refuses `taskType`; set the request's `task` instead.
- `openRouterEmbeddings`: `encodingFormat`, `float` or `base64`.
- `ollamaEmbeddings`: `truncate` and `dimensions`.
- Every other first-party protocol: none.

```ts
import { openRouterProvider, registerProvider } from '@theoremjs/agents';

const router = registerProvider(openRouterProvider, { keySlot: 'openrouter' });

export const binding = router.model('openRouterOpenAi', 'openrouter/free', {
	maxOutputTokens: 1024,
	options: { cache: { mode: 'system', ttl: '1h' } },
});
```

Provider built-in tools belong to the protocol. The protocol validates their arguments and writes them for its API.
For Google Maps, pass the location through `builtInArgs.googleMaps.location` on the request.
`geminiLive` rejects built-in arguments.

## Keep Google interaction state

Use `options.persistViaInteractionId` when Google must retain native interaction context.
Storage must remain enabled: leave `store` unset or set it to `true`.
Without persistence, the protocol sends the history and current turn steps that you supply.

Save the returned `providerState` beside portable history. Send both on the next request.
The kernel validates the checkpoint before the protocol uses its interaction ID.
If the checkpoint does not match the binding, the kernel rebuilds from portable history.
[Running a turn](/docs/runner) gives the save and recovery procedure.

## Run a model on your machine

Use `localProvider` for a server that speaks OpenAI Chat Completions, such as Ollama.
Set `connection.baseUrl` to the API base address, up to and including `/v1`.
The `openAi` protocol appends `/chat/completions`.

```ts
import { localProvider, registerProvider } from '@theoremjs/agents';

registerProvider(localProvider, {
	connection: { baseUrl: 'http://127.0.0.1:11434/v1' },
});
```

```ts frame=profile:text
type: 'text',
models: {
	local: {
		protocol: 'openAi',
		provider: 'local',
		apiId: 'llama3.2',
	},
},
```

Omit the key slot if the server takes no credential.
To run two local servers, register `localProvider` again with a different `id`.

## Fix a binding that fails

Configuration checks run during definition and registration. Credential resolution and actual request checks run when the operation starts.
Use this table to identify the failed boundary and its correction.

Where | What you see | Fix
--- | --- | ---
`defineProfile`, kind `config` | The profile sets `key`, `fallbackKey`, `protocol` or `provider` | Set the protocol and provider on each binding; put key slots in the registration
`defineProfile`, kind `config` | The profile must set `models.*.protocol` | Set `protocol` on the binding
`defineProfile`, kind `config` | Model bindings require provider and apiId | Set both on the binding
`defineProfile`, kind `config` | The profile must set `defaultModel` when it declares more than one model | Set `defaultModel`
`defineProfile`, kind `config` | `keySlot` is not a key slot name | Use up to 32 letters, digits, `-` or `_`
`defineProfile`, kind `config` | A binding sets a key that it does not know | Remove it, or move it into `options`
`registerProvider`, kind `config` | Provider id is already registered | Register it with a different `id`
`registerProvider`, kind `config` | The provider has an invalid connection | Fix the connection fields
`registerProvider` or `registerProfile`, kind `config` | The provider takes no key, so it has no key slot | Remove `keySlot` and `fallbackKeySlot`
`registerProvider` or `registerProfile`, kind `config` | The fallback slot is the same slot as the primary | Name a different slot
`registerProfile`, kind `config` | No provider is registered for the model | Register the provider first
`registerProfile`, kind `config` | The provider does not serve the protocol | Use a protocol from the table above
`registerProfile`, kind `unsupported` | The protocol has no endpoint for this profile type | Use a protocol from the table above
`registerProfile` or `.model()`, kind `config` | The options do not fit the protocol | Use an option from the list above
A turn, `error` event with `errorKind: 'auth'` | The vault has no credential in the slot, or the key is not what the provider takes | Fill the slot. The stream reports this as an event, not a throw
A turn, kind `request` | The profile does not allow model selection, or the model is not a key of `models` | Set `allowModelSelect`, or name a key of `models`
