---
title: Function Tools
updated: 2026-10-29
summary: Authoring TypeScript function tools with Zod schema validation, streaming progress generators, and DOM page tools.
entry: src/kernel/tools/execute.ts
covers: src/kernel/tools/execute.ts, src/kernel/tools/types.ts
cover: /imagery/th30_mineralhills.png
coverAlt: Mineral hills layered with pastel hues
coverPosition: 50% 50%
---

Function tools execute custom TypeScript or JavaScript code in response to a model tool call. They run in your backend process through a `handler`, or in the page the person is on through `answeredBy: 'page'`.

The kernel checks both sides with [Zod](https://zod.dev): the input before your handler runs, and the output before the result reaches the model.

## Registering a Function Tool

Register function tools using `registerTool()` with `type: 'function'`:

```ts
import { registerTool } from '@theoremjs/agents';
import { z } from 'zod';

export const holdStatusTool = registerTool({
	type: 'function',
	name: 'check_hold_status',
	description: 'Look up why a freight shipment is currently on hold.',
	category: 'logistics',
	access: 'read-only',
	paths: ['*'],
	loadTier: 'T0',
	permission: 'auto',

	input: z.object({
		shipmentId: z.string().describe('The alphanumeric shipment identifier'),
	}),

	output: z.object({
		status: z.enum(['hold', 'cleared', 'in_transit']),
		reason: z.string(),
	}),

	handler: async (input, ctx) => {
		const record = await fetchShipment(input.shipmentId, { signal: ctx.signal });
		return {
			status: record.status,
			reason: record.holdReason ?? 'No hold applied',
		};
	},
});
```

* `name`: Identifier used by the model to call the tool.
* `description`: Explains to the model what the tool does and when to call it.
* `input`: Zod schema compiled to provider JSON Schema and checked before `handler` runs.
* `output`: Zod schema validating the value returned by `handler`. A value that fails it, or no value at all, fails the call as `invalid_output`.

## Handler Execution Models

Function tools support two execution models: a plain function and a streaming generator.

### Plain Handlers (Default)

The standard handler takes typed `input` and a `ToolContext`, and returns the typed `output`, directly or as a promise:

```text
handler: async (input, ctx) => {
	const result = await db.query(input.query);
	return { rows: result.rows };
}
```

### Streaming Generator Handlers

For long-running tasks, declare an `async function*` handler. It can yield `progress`, `draft`, `trace`, `artifact` and `warning` events for the host to show, and ends with one `complete` event that carries the output:

```text
handler: async function* (input, ctx) {
	yield { kind: 'progress', data: { percent: 30, stage: 'Connecting to telemetry' } };
	const trajectory = await computeTrajectory(input.routeId, { signal: ctx.signal });

	yield { kind: 'progress', data: { percent: 100, stage: 'Calculation complete' } };
	yield { kind: 'complete', output: trajectory };
}
```

The host receives the other events as the tool runs; the model reads only the `complete` output. A generator that never yields `complete` fails the call as `invalid_output`.

### Browser Tools (`answeredBy: 'page'`)

When the page the person is on answers a call (such as querying the DOM, inspecting canvas state, or reading browser storage), omit the `handler` and declare `answeredBy: 'page'`. The `look` and `act` tools from `@theoremjs/agents/surface` work this way. The kernel supplies the handler; it returns what the page sent:

```ts
import { registerTool } from '@theoremjs/agents';
import { z } from 'zod';

export const readViewportSelectionTool = registerTool({
	type: 'function',
	name: 'read_viewport_selection',
	description: 'Read the currently selected elements in the user canvas.',
	category: 'workspace',
	access: 'read-only',
	paths: ['*'],
	loadTier: 'T0',
	permission: 'auto',

	answeredBy: 'page', // Omit handler; execution target is the client web page

	input: z.object({}),
	output: z.object({
		selectedIds: z.array(z.string()),
	}),
});
```

#### Contract & Schema Verification

Under the TypeScript `FunctionToolInput` type, `handler` is required unless the tool declares `answeredBy: 'page'`. A page tool's own `handler`, if you give one, is replaced by the kernel's:

```text
type FunctionToolInput<TIn, TOut> = ... & (
	| { handler: ToolHandler<TIn, NoInfer<TOut>>; answeredBy?: 'page' }
	| { answeredBy: 'page'; handler?: undefined }
);
```

The page's answer is checked like any handler's output. The kernel validates it against the tool's Zod `output` schema, and an answer that fails it fails the call as `invalid_output` before it reaches the model.

#### Runtime Dispatch Modes

* **Turn-Based Pausing (`kind: 'page'` gate)**: When the call carries no page answer and no `pageExecution` is set on `ToolContext`, the call stops at a `ToolGate` with `kind: 'page'`. The kernel asks the page only after every permission check, sign-in and `pre_tool` stage has let the call through. The page runs the call, and the host resumes it through `invokeTool` with `page: PageAnswer`.
* **Live Dispatch (`pageExecution`)**: When `pageExecution` is set on `ToolContext`, the call does not stop at a gate. The kernel emits a tool event with `{ phase: 'dispatch', grantId, arguments }` and waits for the page's answer. This path also needs a tool execution coordinator (`execution`); without one the call is a `config` error.

#### Failure States

If the page cannot complete the call, the host answers with a failure variant of `PageAnswer`. Both fail the call as `handler_error`, and the model reads the message:
* **`{ timedOut: true }`**: The relay stopped waiting for the page. The message is the `tool.page_timed_out` label.
* **`{ unanswered: true }`**: The page has nothing that answers the tool. The message is the `tool.page_no_answer` label.

## Tool Execution Context (`ToolContext`)

Handlers receive a `ToolContext` carrying host state and runtime affordances:

* **`ctx.signal`**: The request's `AbortSignal`, when it has one. Pass it to database queries or outbound network calls.
* **`ctx.host`**: Opaque host data from the request's `host` (`runTurn` or `invokeTool`), such as tenant credentials or database pools. The kernel never reads it.
* **`ctx.callId`**: The identifier of this tool call.
* **`ctx.traceparent`**: The W3C `traceparent` of this call's `execute_tool` span. Parent the tool's own outbound spans on it.
* **`ctx.signedInFetch`**: Set for a tool with `auth` once its credential resolves. It carries the credential to the URL's own origin only (see [Auth & Credentials](/docs/tools/auth)).

## Tool Utilities & Output Hooks

### Grounding Sources (`sources`)

When a tool fetches web pages or places, list them as citations with the `sources` hook. Each source has a `title`, a `uri` and a `type` of `'web'` or `'maps'`:

```text
// ... inside registerTool definition
sources: (output) => [
	{
		title: output.vesselName,
		uri: `https://maritime.registry/vessels/${output.imoNumber}`,
		type: 'web',
	},
],
```

The kernel emits the valid sources as one `citation` event for the call. A source that does not fit that shape, or a hook that throws, becomes a `sources_invalid` warning, and that source is not cited.

### Unchecked Outputs (`uncheckedOutput`)

A handler must return the type of its `output` schema, or it does not compile. When it returns a value it cannot type, such as what a client sent back, wrap it in `uncheckedOutput()` to leave the check to run time:

```ts
import { uncheckedOutput } from '@theoremjs/agents';

async function _exampleHandler() {
	const rawPayload: unknown = await remoteClient.fetchBlob();
	return uncheckedOutput(rawPayload);
}
```

The kernel checks the value against your Zod `output` schema when the call settles. A mismatch fails the call as `invalid_output`.

## Related Guides

* **[Tools & Execution Pipeline](/docs/tools)**: Universal tool attributes, pipeline stages, and dynamic loading.
* **[HTTP Tools](/docs/tools/http)**: Declarative REST endpoint tools.
* **[Tool Permissions & Gates](/docs/tools/gates)**: Human approval gates and `invokeTool()` resumption.
* **[Auth & Credentials](/docs/tools/auth)**: Authenticating function tools with `ctx.signedInFetch`.
