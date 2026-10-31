---
title: Function Tools
updated: 2026-10-30
summary: Authoring TypeScript function tools with Zod schema validation, streaming progress generators, and tools the page answers.
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

```ts frame=tool:function
name: 'export_report',
// ...
input: z.object({
	title: z.string().describe("The report's title"),
	body: z.string().describe('The report, in Markdown'),
}),

output: z.object({
	saved: z.boolean(),
}),

handler: async (input, ctx) => {
	const response = await fetch('https://app.example/reports', {
		method: 'POST',
		body: JSON.stringify(input),
		signal: ctx.signal,
	});
	return { saved: response.ok };
},
// ...
```

* `name`: Identifier used by the model to call the tool.
* `description`: Explains to the model what the tool does and when to call it.
* `input`: Zod schema compiled to provider JSON Schema and checked before `handler` runs.
* `output`: Zod schema validating the value returned by `handler`. A value that fails it, or no value at all, fails the call as `invalid_output`.

The cookbook's `export_report` is a stub that answers `{ saved: true }`. The handler above is yours to write, and `https://app.example/reports` stands for your own store.

## Why `export_report` Is `read-write`

```ts frame=tool:function
name: 'export_report',
// ...
access: 'read-write',
// ...
```

`access` decides whether a call survives a page read. `research.scout` sets `guardrails.taint.afterRemoteRead: 'write'`, so once a turn has read a remote result, `export_report` fails with `tainted_turn` and its handler does not run. A page the scout read cannot steer what it saves. A `read-only` tool such as `check_device` is never stopped this way. See [Confused-Deputy Taint Tracking](/docs/guardrails/ingress).

## Handler Execution Models

Function tools support two execution models: a plain function and a streaming generator.

### Plain Handlers (Default)

The standard handler takes typed `input` and a `ToolContext`, and returns the typed `output`, directly or as a promise:

```text
handler: async (input, ctx) => {
	const saved = await saveReport(input, { signal: ctx.signal });
	return { saved };
}
```

### Streaming Generator Handlers

For long-running tasks, declare an `async function*` handler. It can yield `progress`, `draft`, `trace`, `artifact` and `warning` events for the host to show, and ends with one `complete` event that carries the output:

```text
handler: async function* (input, ctx) {
	yield { kind: 'progress', data: { percent: 30, stage: 'Saving the report' } };
	const saved = await saveReport(input, { signal: ctx.signal });

	yield { kind: 'progress', data: { percent: 100, stage: 'Report saved' } };
	yield { kind: 'complete', output: { saved } };
}
```

The host receives the other events as the tool runs; the model reads only the `complete` output. A generator that never yields `complete` fails the call as `invalid_output`.

### Browser Tools (`answeredBy: 'page'`)

When the page the person is on answers a call, omit the `handler` and declare `answeredBy: 'page'`. The scout's `check_device` works this way, because only the page can see the device. The `look` and `act` tools from `@theoremjs/agents/surface` work this way. The kernel supplies the handler; it returns what the page sent:

```ts frame=tool:function
name: 'check_device',
// ...
answeredBy: 'page', // Omit handler; execution target is the client web page
// ...
```

#### Contract & Schema Verification

Under the TypeScript `FunctionToolInput` type, `handler` is required unless the tool declares `answeredBy: 'page'`. A page tool's own `handler`, if you give one, is replaced by the kernel's:

```text
type FunctionToolInput<TIn, TOut> =
	// ...
	& (
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

When a tool fetches web pages or places, list them as citations with the `sources` hook. Each source has a `title`, a `uri` and a `type` of `'web'` or `'maps'`. The cookbook's tools set no `sources`, so this is for a tool of your own whose output carries `candidates` shaped like those in `research.reply`:

```text
// ...
sources: (output) =>
	output.candidates.map((candidate) => ({
		title: candidate.name,
		uri: candidate.url,
		type: 'web',
	})),
// ...
```

The kernel emits the valid sources as one `citation` event for the call. A source that does not fit that shape, or a hook that throws, becomes a `sources_invalid` warning, and that source is not cited.

### Unchecked Outputs (`uncheckedOutput`)

A handler must return the type of its `output` schema, or it does not compile. When it returns a value it cannot type, such as what a client sent back, wrap it in `uncheckedOutput()` to leave the check to run time:

```ts frame=tool:function
// ...
handler: async () => {
	const rawPayload: unknown = await remoteClient.fetchBlob();
	return uncheckedOutput(rawPayload);
},
// ...
```

The kernel checks the value against your Zod `output` schema when the call settles. A mismatch fails the call as `invalid_output`.

## Related Guides

* **[Tools & Execution Pipeline](/docs/tools)**: Universal tool attributes, pipeline stages, and dynamic loading.
* **[HTTP Tools](/docs/tools/http)**: Declarative REST endpoint tools.
* **[Tool Permissions & Gates](/docs/tools/gates)**: Human approval gates and `invokeTool()` resumption.
* **[Auth & Credentials](/docs/tools/auth)**: Authenticating function tools with `ctx.signedInFetch`.
