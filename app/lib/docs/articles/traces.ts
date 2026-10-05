import type { DocArticleDef } from '../schema';

export const traces: DocArticleDef = {
	slug: 'traces',
	updated: '2026-10-05',
	title: 'Recording traces',
	entry: 'src/observability/mod.ts',
	covers: ['src/observability'],
	summary:
		'Record what each run did: register a destination, point writeTo at it, then choose what a trace record keeps and scrubs.',
	cover: {
		src: '/imagery/th30_siennadunes.png',
		alt: 'Sienna dunes',
		position: '0% 0%',
	},
	questions: [
		{ question: 'How do I turn recording on so I can see what a turn did?' },
		{ question: 'How do I record one call, for a test?' },
		{ question: 'What does a record keep, and how do I change that?' },
		{ question: 'How do I send records to a viewer such as Phoenix?' },
		{ question: 'Why did no record appear, and what do I change?' },
	],
	blocks: [
		{
			id: 'lede',
			kind: 'lede',
			text: [
				'Add an `observability` block to the profile and point `writeTo` at a destination. Each recorded run then becomes one `TraceRecord`: the timed steps of the run and the text they used.',
				'Recording is off by default. If the profile has no `observability` block, or `writeTo` is `false` or missing, Theorem stores nothing.',
			].join('\n\n'),
		},
		{
			id: 'register-destination',
			kind: 'code',
			title: 'Register a destination',
			source: {
				from: 'literal',
				lang: 'ts',
				code: [
					"import { registerTraceDestination } from '@theoremjs/agents';",
					"import { jsonlSink } from '@theoremjs/agents/observability/jsonl';",
					'',
					"registerTraceDestination('jsonl.local', jsonlSink('/var/log/theorem'));",
				].join('\n'),
			},
		},
		{
			id: 'observability-config',
			kind: 'code',
			title: 'Point the profile at it',
			source: {
				from: 'literal',
				lang: 'ts',
				frame: 'profile:text',
				code: [
					"type: 'text',",
					'observability: {',
					"\twriteTo: 'jsonl.local',",
					'\tsampleRate: 1,',
					'},',
				].join('\n'),
			},
		},
		{
			id: 'destinations',
			kind: 'prose',
			title: 'Choose where records go',
			text: [
				'`writeTo` is `false`, the id of a registered destination, or a `TraceSink`. A `TraceSink` has a `write(record, context)` method and an optional `onError`.',
				'`jsonlSink(dir)` writes JSONL files, at least one for each day. The directory must be an absolute path outside the project folder, or `jsonlSink` throws a `config` error. It deletes day files older than `retainForDays` (14 by default). It starts a new file at `rotateAfterMiB` (32 by default).',
				'`sampleRate` is a number from 0 to 1. The default is 1. Theorem decides by trace id, so one trace is kept or dropped as a whole.',
				'A failed write never fails the run. Theorem passes the error to `onWriteError` or to the sink’s `onError`.',
			].join('\n\n'),
		},
		{
			id: 'sink-override',
			kind: 'prose',
			title: 'Record one call to a sink',
			text: [
				'To capture a single call, for a test or a one-off check, pass a sink to that call. It replaces `writeTo` for the call, always records and ignores `sampleRate`.',
				'`runTurn`, `runSession`, `compactHistory` and `invokeTool` take the sink as the last argument ([Running a turn](/docs/runner)). `runDecision` takes it as `options.sink`.',
			].join('\n\n'),
		},
		{
			id: 'include-and-scrub',
			kind: 'prose',
			title: 'Choose what a record keeps',
			text: [
				'`include` picks the optional content of a record. With an `observability` block, upstream log, usage and guardrail decisions are on. Outbound wire bodies, raw grounding evidence and the matched text of a guardrail hit are off.',
				'`scrub` removes sensitive values, injection text and the canary token from stored text. All three are on by default.',
				'Both settings are independent of `guardrails` ([Setting guardrails](/docs/guardrails)). Scrubbing stays on when `guardrails.redactSensitive` is `false`.',
				'Set `include` to keep less. Set `scrub` to `false` on a key only when you must store that text. Treat the destination like a server log, because records hold conversation content.',
			].join('\n\n'),
		},
		{
			id: 'export',
			kind: 'prose',
			title: 'Export records',
			text: [
				'`toOtlpJson(records)` turns records into an OTLP/JSON request, the body of `POST /v1/traces`. You send the request. Theorem runs no exporter.',
				'To add OpenInference attributes for a viewer such as Phoenix, call `toOtlpJson(withOpenInference(records))`. Import `withOpenInference` from `@theoremjs/agents/observability/openinference`.',
			].join('\n\n'),
		},
		{
			id: 'no-record',
			kind: 'table',
			title: 'Fix a missing record',
			text: 'What you see | Cause | Fix\n--- | --- | ---\nNo record at all | The profile has no `observability` block, or `writeTo` is `false` or missing | Add `observability: { writeTo }`\n`config` error: destination is not registered | `writeTo` names an id that no `registerTraceDestination` call made | Register the destination before the first run\n`config` error: must be a `TraceSink` | The destination has no `write` method | Pass a `TraceSink`\n`config` error: trace directory must be absolute | `jsonlSink` got a relative path | Pass an absolute path\n`config` error: outside the project checkout | The directory is inside the working directory | Choose a directory outside the project\nSome runs have no record | `sampleRate` is below 1 | Set `sampleRate` to 1\nThe run works, but the file is empty | A write failed, and the error was dropped | Set `onWriteError`, or `onError` on the sink, to see the error',
		},
	],
};
