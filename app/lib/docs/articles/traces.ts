import type { DocArticleDef } from '../schema';

export const traces: DocArticleDef = {
	slug: 'traces',
	updated: '2026-10-01',
	title: 'Recording traces',
	entry: 'src/observability/mod.ts',
	summary:
		'Recording is opt-in. Point writeTo at a registered destination and each recorded run becomes a TraceRecord. Omit the block and nothing is stored.',
	cover: {
		src: '/imagery/th30_siennadunes.png',
		alt: 'Sienna dunes',
		position: '0% 0%',
	},
	questions: [
		{ question: 'How do I turn recording on so I can see what a turn did?' },
		{ question: 'What is missing when I leave include or scrub alone?' },
	],
	blocks: [
		{
			id: 'lede',
			kind: 'lede',
			text: [
				'Recording is opt-in. Write under `observability`, point `writeTo` at a registered destination (or an inline sink), and each recorded run becomes a `TraceRecord`. Omit the whole block \u2014 or set `writeTo: false` \u2014 and nothing is stored. That differs from host logs you sprinkle yourself, and from guardrails ([Setting guardrails](/docs/guardrails)).',
				'Authored `observability` without `writeTo` still does not record. Every modality may set the block.',
			].join('\n\n'),
		},
		{
			id: 'observability-config',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
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
			id: 'register-destination',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				code: "registerTraceDestination('jsonl.local', jsonlDestination('./traces'))",
			},
		},
		{
			id: 'sink-override',
			kind: 'prose',
			title: 'Sink override',
			text: 'A single call may pass a sink that overrides the profile for that run (`runTurn`, `runSession`, `invokeTool`, `runDecision`). That override always records; sampling is skipped. `createProvider` is not the tracing door.',
		},
		{
			id: 'include-and-scrub',
			kind: 'prose',
			title: 'Include and scrub',
			text: [
				'Leave `include` alone and you get the package defaults for what payloads stay on the record (upstream log and usage on; outbound wire and evidence raw off, among others). Leave `scrub` alone and sensitive, injection, and canary scrub stay on.',
				'Tighten `include` when you do not need those payloads. Tighten `scrub` when you must store less. Loosen either only when you intend more on disk \u2014 they are independent of `profile.guardrails`.',
				'To reshape for export, use `toOtlpJson` (and optional OpenInference / Phoenix helpers). The package does not run an OTEL exporter for you.',
			].join('\n\n'),
		},
	],
};
