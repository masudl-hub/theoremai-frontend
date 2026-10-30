---
title: Kernel Labels & Errors
updated: 2026-10-26
summary: Customizing system error strings, tool activity messages, and localized copy.
entry: src/kernel/registry/profiles.ts
covers: src/kernel/registry/profiles.ts, src/kernel/schema.ts
cover: /imagery/th30_wideorchard.png
coverAlt: Geometric rows of fruit trees in evening light
coverPosition: 50% 50%
---

Theorem provides overridable, human-safe notices and error messages by default. Every emit-site—from tool activity indicators to terminal failure notices—resolves its copy through a central labels dictionary.

Use this to customize phrasing, localize strings into other languages, or match organizational tone without modifying kernel internals.

## Label Resolution Hierarchy

When the kernel needs a user-facing string or prompt note, it resolves the text across three layers:

1. **`labels`** on the profile: Profile-specific overrides. Wins over all other definitions for that agent.
2. **`overrideLabels()`**: Process-wide overrides applied across all profiles in the application.
3. **Built-in Defaults**: Fallback strings shipped directly with the kernel.

Templates use `{param}` placeholders replaced at runtime. This slice shows the `labels` block of a text profile:

```ts frame=profile:text
labels: {
	'error.timeout': 'The logistics database took too long to answer. Try again in a moment.',
	'error.rate_limit': 'Too many tracking requests. Pausing queries.',
},
```

To replace wording process-wide across all profiles, invoke `overrideLabels()` during application bootstrap:

```ts
import { overrideLabels } from '@theoremjs/agents';

overrideLabels({
	'error.auth': 'Please re-authenticate your terminal session.',
	'error.safety': 'This instruction violates organizational transport safety policies.',
});
```

## Error Handling (`TheoremError`)

All kernel exceptions surface as `TheoremError`. This class extends native `Error` and provides structured error categorization:

* **`kind`**: An `ErrorKind` identifying why the operation failed.
* **`message`**: The diagnostic for hosts, traces, and logs.
* **`copy`**: Optional user wording more specific than the kind's: one line, or one per problem found.

```ts
import { runTurn, TheoremError } from '@theoremjs/agents';

try {
	const events = runTurn({ profile: 'freight.assistant', input: { text: 'Dispatch' } });
	for await (const _event of events) {
		// ...
	}
} catch (err) {
	if (err instanceof TheoremError) {
		console.error(`Operation failed: [${err.kind}] ${err.message}`);
	}
}
```

## Error Kind Reference

The kernel categorizes all failures into 20 stable `ErrorKind` values. HTTP servers derive response status codes directly from these kinds:

| Error Kind | HTTP | Trigger |
| :--- | :--- | :--- |
| **`'config'`** | `500` | The profile, tool, or schema is set up wrong. |
| **`'request'`** | `400` | The host called Theorem wrongly. |
| **`'conflict'`** | `409` | The call conflicts with the state it acts on, such as an operation that is still running or not settled. |
| **`'not_found'`** | `404` | Something the call names by id is not there, such as a conversation the store no longer holds. |
| **`'input'`** | `422` | The user sent input the profile does not accept. |
| **`'action'`** | `403` | The user asked for something the profile does not allow. |
| **`'auth'`** | `401` | A missing or rejected credential, or an account that cannot be billed. |
| **`'rate_limit'`** | `429` | Too many requests, or a quota used up. |
| **`'busy'`** | `503` | The provider is up but too busy for the call. Another key or a moment later may serve it. |
| **`'unsupported'`** | `422` | The model or route cannot serve this request. |
| **`'unavailable'`** | `503` | The provider is down. |
| **`'bad_response'`** | `502` | The provider answered with something that cannot be used. |
| **`'network'`** | `502` | The request never reached the provider. |
| **`'timeout'`** | `504` | The model took longer than the host allowed. |
| **`'safety'`** | `422` | Theorem or the provider held the reply back. |
| **`'blocked'`** | `403` | A guardrail or host policy stopped one of the agent's steps. |
| **`'declined'`** | `409` | The user declined one of the agent's steps. |
| **`'failed'`** | `502` | One of the agent's steps ran and failed. |
| **`'cancelled'`** | `499` | The user or host stopped the turn. |
| **`'internal'`** | `500` | A Theorem invariant broke. |

## Related Guides

* **[Profiles](/docs/profiles)**: Declaring profile-level `labels` blocks.
* **[Turn Resumption & Steering](/docs/profiles/resumption)**: Handling retryable stop reasons like `'provider_error'` and `'stream_incomplete'`.
* **[Lifecycle Hooks & Interception](/docs/profiles/lifecycle)**: Handling tool denials and gate triggers in `onStage`.
* **[Guardrails & Sanitize](/docs/guardrails)**: Configured boundary filters and canary leak protection.
