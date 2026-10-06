---
title: Recording traces
updated: 2026-10-05
summary: Record what each run did: register a destination, point writeTo at it, then choose what a trace record keeps and scrubs.
entry: src/observability/mod.ts
covers: src/observability
cover: /imagery/th30_siennadunes.png
coverAlt: Sienna dunes
coverPosition: 0% 0%
---

Record what each run did. A trace shows the steps of a run, how long each step took and the text that it used.

## The idea

When an agent gives a wrong answer, you must see what happened: which model ran, which tool it called, and which guardrail made a decision. A **trace** is that record.

Theorem makes one `TraceRecord` for each recorded run. The `observability` block of the profile says where the record goes and what it keeps.

```figure
{
	"kind": "sequence",
	"layout": "row",
	"still": {
		"src": "/imagery/th30_siennadunes.png",
		"position": "40% 50%"
	},
	"caption": "One run makes one record. The profile says where the record goes and what it keeps.",
	"steps": [
		{
			"label": "A run",
			"text": "Theorem times each step and keeps its text in one TraceRecord."
		},
		{
			"label": "observability",
			"text": "sampleRate decides if the run is recorded. include and scrub decide what the record keeps."
		},
		{
			"label": "The destination",
			"text": "JSONL files, or your own sink."
		}
	]
}
```

```note
Recording is off by default. If the profile has no `observability` block, or `writeTo` is `false` or missing, Theorem stores nothing.
```

## Record the runs of the Harbor desk

These four steps write each run of the Harbor front desk to a file, then send the records to a trace viewer.

### 1. Register a destination

A **destination** is a place that records go to, registered under an id. `jsonlSink(dir)` is a destination that writes JSONL files.

```ts
import { registerTraceDestination } from '@theoremjs/agents';
import { jsonlSink } from '@theoremjs/agents/observability/jsonl';

registerTraceDestination('jsonl.local', jsonlSink('/var/log/theorem'));
```

The directory must be an absolute path outside the project folder. If not, `jsonlSink` throws a `config` error.

### 2. Point the profile at the destination

```ts frame=profile:text
type: 'text',
observability: {
	writeTo: 'jsonl.local',
	sampleRate: 1,
},
```

- `writeTo` is `false`, the id of a registered destination, or a `TraceSink`.
- `sampleRate` is a number from 0 to 1. The default is 1. Theorem decides by trace id, so it keeps or drops one trace as a whole.

### 3. Choose what a record keeps

A record holds conversation content. Two settings control how much.

- `include` selects the optional content of a record. With an `observability` block, the upstream log, the usage and the guardrail decisions are on. The outbound wire bodies, the raw grounding evidence and the matched text of a guardrail hit are off.
- `scrub` removes sensitive values, injection text and the canary token from stored text. All three are on by default.

Both settings are independent of `guardrails` ([Setting guardrails](/docs/guardrails)). A profile that turns a guardrail off still scrubs its records.

Set `include` to keep less. Set a key of `scrub` to `false` only if you must store that text.

```warning
Treat the destination like a server log. Records hold conversation content.
```

### 4. Export the records

`toOtlpJson(records)` turns records into an OTLP/JSON request, the body of `POST /v1/traces`. You send the request. Theorem runs no exporter.

To add OpenInference attributes for a viewer such as Phoenix, call `toOtlpJson(withOpenInference(records))`. Import `withOpenInference` from `@theoremjs/agents/observability/openinference`.

## Write to your own sink

Use a `TraceSink` when records must go to your own store. A `TraceSink` has a `write(record, context)` method and an optional `onError`. Register it as a destination, or pass it as `writeTo`.

A failed write never fails the run. Theorem passes the error to `onWriteError` or to the `onError` of the sink.

## Know how the JSONL files rotate

`jsonlSink` keeps the files small and removes old ones.

- It writes one file or more for each day.
- It starts a new file at `rotateAfterMiB` (32 by default).
- It deletes day files older than `retainForDays` (14 by default).

## Record one call to a sink

To capture a single call, for a test or a single check, pass a sink to that call. The sink replaces `writeTo` for the call. The call always records, and it ignores `sampleRate`.

- `runTurn`, `runSession`, `compactHistory` and `invokeTool` take the sink as the last argument ([Running a turn](/docs/runner)).
- `runDecision` takes it as `options.sink`.

## Fix a missing record

Each row is one sign, its cause and its fix.

What you see | Cause | Fix
--- | --- | ---
No record at all | The profile has no `observability` block, or `writeTo` is `false` or missing | Add `observability: { writeTo }`
`config` error: destination is not registered | `writeTo` names an id that no `registerTraceDestination` call made | Register the destination before the first run
`config` error: must be a `TraceSink` | The destination has no `write` method | Pass a `TraceSink`
`config` error: trace directory must be absolute | `jsonlSink` got a relative path | Pass an absolute path
`config` error: outside the project checkout | The directory is inside the working directory | Choose a directory outside the project
Some runs have no record | `sampleRate` is below 1 | Set `sampleRate` to 1
The run works, but the file is empty | A write failed, and the error was dropped | Set `onWriteError`, or `onError` on the sink, to see the error
