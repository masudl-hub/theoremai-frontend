---
title: Telemetry Destinations
updated: 2026-10-30
summary: Connect telemetry to OpenTelemetry OTLP collectors, Phoenix tracing, or streaming JSONL logs.
entry: src/observability/destinations.ts
covers: src/observability/destinations.ts, src/observability/otlp.ts, src/observability/jsonl.ts, src/observability/policy.ts, src/observability/openinference.ts, src/observability/phoenix.ts
cover: /imagery/th30_arctic.png
coverAlt: Frozen arctic ice sheet stretching toward pale polar horizon
coverPosition: 50% 50%
---

Theorem maintains no proprietary telemetry database or persistent background daemon. Instead, the kernel produces standardized trace records and hands them to **trace sinks**—pluggable writers that buffer, transform, or export records to external observability platforms.

Hosts configure telemetry declaratively on agent profiles (`observability`), register named global destinations at startup (`registerTraceDestination`), or pass a trace sink to one `runTurn` call.

## Observability Policy (`ProfileObservabilitySpec`)

A profile declares its tracing in its `observability` block. Omit the block and the profile records nothing.

```ts frame=profile:text
observability: {
	writeTo: 'production-collector', // A registered destination id, a TraceSink, or false
	sampleRate: 0.25, // Keep 25% of traces (default: 1)
	resource: {
		'service.name': 'research-scout',
		'deployment.environment': 'production',
	},
	include: {
		usage: true, // Token counts and cost (default: true)
		guardrailDecisions: true, // Guardrail decisions (default: true)
		upstreamLog: false, // Scrubbed provider rows and frames (default: true)
		outboundWire: false, // Scrubbed outbound request bodies (default: false)
	},
	scrub: {
		sensitive: true, // The ids, financial, network and credentials detectors (default: true)
		canary: true, // Never store the canary token (default: true)
		injection: true, // The injection and tool_instructions detectors (default: true)
	},
	retainForDays: 14, // Handed to each destination with the record (default: 14)
	rotateAfterMiB: 32, // File size at which a file destination starts a new file (default: 32)
	onWriteError: (err) => console.error('Trace write failed:', err),
},
```

### Destination Resolution (`writeTo`)
* `false` or omitted: nothing is recorded. The turn writes to a sink that discards every record (`noopSink`).
* `string`: the id of a destination registered with `registerTraceDestination`.
* `TraceSink`: an inline writer with `write(record, context)` and an optional `onError(err)`.

`onWriteError` is called when a record cannot be built or written, unless the sink has its own `onError`. A trace failure never fails the turn.

### Deterministic Sampling (`sampleRate`)
Sampling rates range from `0` (drop all) to `1` (keep all). A value outside that range throws a `config` error. Sampling follows OpenTelemetry's `TraceIdRatioBased` rule and reads the lowest 32 bits of the trace ID. The decision comes from the trace ID, not from each span. So every record of one trace (a turn, its specialists, a Live session's responses, a host's cutout) is kept or dropped together.

## Global Destination Registry

Register each destination once, when the application starts:

```ts frame=statements
import { registerTraceDestination } from '@theoremjs/agents';
import { jsonlSink } from '@theoremjs/agents/observability/jsonl';

// Write JSONL files to local disk
registerTraceDestination('audit-jsonl', jsonlSink('/var/log/theorem/traces'));

// Send each record to an OTLP collector
registerTraceDestination('production-collector', {
	async write(record) {
		// ...
	},
	onError(err) {
		// ...
	},
});
```

Profiles refer to a registered destination by its id (`writeTo: 'audit-jsonl'`). If the id is not registered, the turn throws a `config` error: `Trace destination '<id>' is not registered`.

## Trace Exporters & Sinks

Theorem gives you three ways to write records:

### 1. OTLP HTTP / JSON Collector (`toOtlpJson`)
`toOtlpJson` turns a list of `TraceRecord`s into an OpenTelemetry `ExportTraceServiceRequest` in JSON, the body of `POST /v1/traces`. Each record becomes one resource, and stored content is put back inline. Send it to OpenTelemetry collectors, Datadog, Honeycomb or Grafana Tempo. For a backend that takes only protobuf, send it through an OpenTelemetry Collector.

```ts
import { type TraceSink, toOtlpJson } from '@theoremjs/agents';

export function otlpHttpSink(endpoint: string): TraceSink {
	return {
		async write(record) {
			await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(toOtlpJson([record])),
			});
			// ...
		},
	};
}
```

### 2. Local File Logging (`jsonlSink`)
`jsonlSink` writes each record as one JSON line to files on local disk. It has its own entry point, `@theoremjs/agents/observability/jsonl`, so browser bundles and Workers never load the file system.

```ts
import { registerTraceDestination } from '@theoremjs/agents';
import { jsonlSink } from '@theoremjs/agents/observability/jsonl';

registerTraceDestination('disk', jsonlSink('/var/log/theorem'));
```

* The directory must be absolute and outside the project checkout. Otherwise `jsonlSink` throws a `config` error.
* Files are named `turns-YYYY-MM-DD.jsonl`, one set per day. When a file reaches the profile's `rotateAfterMiB`, a new file starts.
* Each write removes day files older than the profile's `retainForDays`. A value `<= 0` keeps every file.
* The directory and files are readable by the host's user only.

### 3. In-Memory Sinks for Testing (`memorySink`)
`memorySink` adds each record to an array you give it. It does no file or network I/O. Pass it as the third argument of `runTurn` to override the profile's `writeTo` for that call. An override always records and ignores `sampleRate`, so tests get the same result each time.

```ts frame=statements
import { memorySink, runTurn, type TraceRecord } from '@theoremjs/agents';
import { recordRoot } from '@theoremjs/agents/observability';

const records: TraceRecord[] = [];

for await (const event of runTurn(
	{ profile: 'research.scout', input: { text: 'Find recent papers on episodic memory.' } },
	{},
	memorySink(records),
)) {
	// ...
}

const [record] = records;
if (record) console.log(recordRoot(record)?.name); // 'invoke_agent research.scout'
```

The record is written before the turn's event stream ends, so `records` holds it after the loop.

## Phoenix

Phoenix reads some views only from OpenInference attribute names, and reads eval results over REST, not OTLP. Two pure helpers build what it needs. The host sends them.

```ts
import { type TraceRecord, toOtlpJson } from '@theoremjs/agents';
import { withOpenInference } from '@theoremjs/agents/observability/openinference';
import { phoenixAnnotations } from '@theoremjs/agents/observability/phoenix';

export function phoenixBodies(records: TraceRecord[]) {
	return {
		// POST /v1/traces
		traces: toOtlpJson(withOpenInference(records)),
		// POST /v1/span_annotations
		annotations: { data: phoenixAnnotations(records) },
	};
}
```

* `withOpenInference` copies OpenInference names (`openinference.span.kind`) beside the semantic-convention names. It does not change the input records.
* `phoenixAnnotations` turns eval results into Phoenix span annotations. Each lands on the root span the trial judged. A judge's result is `LLM`, a code grader's is `CODE`. Phoenix keeps one annotation per span and name, so grading a record again replaces them.

## Data Scrubbing & Sanitization

Telemetry must never send API credentials, personal data or canary tokens to an outside provider.

Theorem cleans each record before it reaches a trace sink:

1. **Sensitive data (`scrub.sensitive`)**: The `ids`, `financial`, `network` and `credentials` detectors, and the host's own, clean the stored text. They clean the trace even when the turn sets them to `ignore`.
2. **Injection (`scrub.injection`)**: The `injection` and `tool_instructions` detectors clean the stored text.
3. **Canary (`scrub.canary`)**: The canary token is never stored. It is replaced with `[omitted - canary]`.

Set a switch to `{ theorem: false }` or `{ host: false }` to turn off one side: Theorem's patterns or the host's.

## Related Guides

* **[Trace Spans & Semantic Conventions](/docs/observability)**: OpenTelemetry GenAI attributes, span topology, and content interning.
* **[Evaluations & Benchmarks](/docs/observability/evals)**: Grader suites and automated evaluation against trace records.
* **[Network Safety & Secret Masking](/docs/guardrails/network)**: Boundary detectors and sanitization rules for outbound requests.
* **[Kernel Labels & Errors](/docs/profiles/labels)**: Overriding error strings and telemetry diagnostic copy.
