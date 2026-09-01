export type ArchSpec = [label: string, value: string];

export type ArchNode = {
	id: string;
	title: string;
	type: string;
	usage: string;
	desc: string;
	/** Labeled facts from the public API / types — not a tag cloud. */
	specs: ArchSpec[];
	copyable?: boolean;
};

/**
 * Architecture map for theorum@0.1.15.
 * copyable = real CLI string or package import a host should use.
 * Non-copyable nodes are internals — shipped, but not on public barrels.
 */
export const architectureMap: Record<string, ArchNode> = {
	cli: {
		id: 'cli',
		title: 'CLI',
		type: 'TOOLING',
		usage: 'npx theorum --help',
		desc: 'Command-line tools for your app. Inspect profiles, run a turn by hand, or stress-test without building a custom harness.',
		specs: [
			['entry', 'theorum/cli'],
			['export', 'main'],
			['bin', 'theorum'],
			['cmds', 'run · test · profile · bench · fuzz']
		],
		copyable: true
	},
	run: {
		id: 'run',
		title: 'Run',
		type: 'COMMAND',
		usage: 'npx theorum run --profile <id> --prompt "…"',
		desc: 'Send one prompt through a registered profile and watch tokens stream. Use while wiring agents or reproducing a bug.',
		specs: [
			['flags', '--profile · --prompt · --mode'],
			['extra', '--search · --map'],
			['out', 'live stream']
		],
		copyable: true
	},
	test: {
		id: 'test',
		title: 'Test',
		type: 'COMMAND',
		usage: 'npx theorum test --profile <id> --matrix',
		desc: 'Quick connectivity ping or full permutation sweep. Run before shipping a profile change or in CI.',
		specs: [
			['modes', '--lite · --matrix · --all'],
			['flags', '--profile · --mode'],
			['extra', '--search · --map']
		],
		copyable: true
	},
	profile: {
		id: 'profile',
		title: 'Profile',
		type: 'COMMAND',
		usage: 'npx theorum profile show <id>',
		desc: 'List or dump profile blueprints as JSON. Use when you need to see what your app actually registered.',
		specs: [
			['subs', 'list · show <id>'],
			['out', 'JSON blueprint']
		],
		copyable: true
	},
	bench: {
		id: 'bench',
		title: 'Bench',
		type: 'COMMAND',
		usage: 'npx theorum bench',
		desc: 'Measure kernel throughput with synthetic streams. For comparing perf changes, not for testing model quality.',
		specs: [
			['flags', '--chunks · --iterations · --warmup'],
			['target', 'mock stream']
		],
		copyable: true
	},
	fuzz: {
		id: 'fuzz',
		title: 'Fuzz',
		type: 'COMMAND',
		usage: 'npx theorum fuzz',
		desc: 'Throw known injection strings at your guardrails. Use to verify detectors before you expose an endpoint.',
		specs: [
			['target', 'injectionSpans'],
			['corpus', 'adversarial prompts']
		],
		copyable: true
	},
	matrix: {
		id: 'matrix',
		title: 'Matrix',
		type: 'INTERNAL',
		usage: '// Internal — used by: theorum test --matrix',
		desc: 'What `test --matrix` calls under the hood. Builds every valid turn shape so you do not hand-write combos.',
		specs: [
			['path', 'src/cli/matrix/'],
			['via', 'theorum test --matrix'],
			['export', 'none']
		]
	},
	fixtures: {
		id: 'fixtures',
		title: 'Fixtures',
		type: 'INTERNAL',
		usage: '// Internal — src/cli/matrix/fixtures.ts',
		desc: 'Fake images and inputs for matrix runs. Keeps stress tests deterministic instead of depending on real uploads.',
		specs: [
			['path', 'src/cli/matrix/fixtures.ts'],
			['kind', 'synthetic media'],
			['export', 'none']
		]
	},
	synthesizer: {
		id: 'synthesizer',
		title: 'Synthesizer',
		type: 'INTERNAL',
		usage: '// Internal — src/cli/matrix/synthesizer.ts',
		desc: 'Turns a profile into concrete test requests — lite pings, stress cases, or full matrix permutations.',
		specs: [
			['path', 'src/cli/matrix/synthesizer.ts'],
			['builds', 'lite · stress · matrix'],
			['export', 'none']
		]
	},
	kernel: {
		id: 'kernel',
		title: 'Kernel',
		type: 'RUNTIME',
		usage: "import { runTurn, defineProfile } from 'theorum/kernel'",
		desc: 'The runtime without provider wiring. Use when you want profiles, turns, and types but bring your own transport layer.',
		specs: [
			['entry', 'theorum/kernel'],
			['door', 'runTurn'],
			['contract', 'defineProfile · resolveTurn'],
			['events', 'thought · text · tool · done · error']
		],
		copyable: true
	},
	engine: {
		id: 'engine',
		title: 'Engine',
		type: 'INTERNAL',
		usage: '// Internal — src/kernel/engine/',
		desc: 'Where a turn actually moves step by step — streaming, repair, compaction hooks. You feel it through runTurn, not direct imports.',
		specs: [
			['path', 'src/kernel/engine/'],
			['owns', 'boundary · delta · runner · repair'],
			['export', 'none (via runTurn)']
		]
	},
	assert: {
		id: 'assert',
		title: 'Assert',
		type: 'INTERNAL',
		usage: '// Internal',
		desc: 'Small sanity checks inside the engine. When something breaks here, you get a normal Theorum error — not a raw crash.',
		specs: [
			['path', 'src/kernel/engine/assert.ts'],
			['surfaces', 'TheorumError · publicError'],
			['export', 'none']
		]
	},
	boundary: {
		id: 'boundary',
		title: 'Boundary',
		type: 'INTERNAL',
		usage: '// Internal',
		desc: 'Wraps user content before it hits the model — canary tokens and fenced blocks so prompts stay separated from instructions.',
		specs: [
			['path', 'src/kernel/engine/boundary.ts'],
			['does', 'canary · <user_data> fence'],
			['export', 'none']
		]
	},
	compaction: {
		id: 'compaction',
		title: 'Compaction',
		type: 'CORE',
		usage: "import { shouldCompact, splitForCompaction } from 'theorum'",
		desc: 'Helps you trim long chat history before context overflows. Call from your host when threads get too big.',
		specs: [
			['entry', 'theorum · theorum/kernel'],
			['api', 'shouldCompact · splitForCompaction'],
			['also', 'estimateHistoryTokens · compactionMeter']
		],
		copyable: true
	},
	delta: {
		id: 'delta',
		title: 'Delta',
		type: 'INTERNAL',
		usage: '// Internal',
		desc: 'Translates raw provider chunks into the events your app listens for — text, tools, thoughts, done.',
		specs: [
			['path', 'src/kernel/engine/delta.ts'],
			['maps', 'provider chunk → TurnEvent'],
			['export', 'none']
		]
	},
	runner: {
		id: 'runner',
		title: 'Runner',
		type: 'RUNTIME',
		usage: "import { runTurn } from 'theorum'",
		desc: 'The front door for execution. Pass a turn request, async-iterate events until the turn finishes. This is what most apps call.',
		specs: [
			['api', 'runTurn(request, provider, opts?)'],
			['yields', 'AsyncIterable<TurnEvent>'],
			['events', 'thought · text · tool · structured · done']
		],
		copyable: true
	},
	gates: {
		id: 'gates',
		title: 'Gates',
		type: 'INTERNAL',
		usage: '// Internal',
		desc: 'Checks model output against your schemas and retries when structured JSON comes back malformed.',
		specs: [
			['path', 'src/kernel/engine/runner/gates.ts'],
			['does', 'validate · repair loop'],
			['export', 'none']
		]
	},
	state: {
		id: 'state',
		title: 'State',
		type: 'INTERNAL',
		usage: '// Internal',
		desc: 'Remembers where a turn is mid-flight — which step, which repair attempt. Ephemeral; lives only for that turn.',
		specs: [
			['path', 'src/kernel/engine/runner/state.ts'],
			['scope', 'per-turn'],
			['export', 'none']
		]
	},
	stream: {
		id: 'stream',
		title: 'Stream',
		type: 'INTERNAL',
		usage: '// Internal',
		desc: 'Filters and shapes the live token stream — respects profile flags and catches tool calls before they escape.',
		specs: [
			['path', 'src/kernel/engine/runner/stream.ts'],
			['respects', 'outputs.streaming'],
			['export', 'none']
		]
	},
	registry: {
		id: 'registry',
		title: 'Registry',
		type: 'CORE',
		usage: "import { registerProfile, registerStructured } from 'theorum'",
		desc: "Your app's catalog of profiles, tools, and output schemas. Register at startup; the kernel looks everything up from here.",
		specs: [
			['holds', 'profiles · tools · schemas'],
			['api', 'register* · get* · list*'],
			['lifetime', 'host process']
		],
		copyable: true
	},
	catalog: {
		id: 'catalog',
		title: 'Catalog',
		type: 'CORE',
		usage: "import { registerTools, getTool, CATALOG } from 'theorum'",
		desc: 'Directory of tools the kernel knows about — builtins plus whatever your host registers. Enforces MIME and thinking limits.',
		specs: [
			['api', 'registerTools · getTool · CATALOG'],
			['clamps', 'MIME · thinkingLevels'],
			['also', 'requireModelSpec · mimeAllowed']
		],
		copyable: true
	},
	profiles: {
		id: 'profiles',
		title: 'Profiles',
		type: 'CORE',
		usage: "import { defineProfile, registerProfile, getProfile } from 'theorum'",
		desc: 'Define an agent contract once — model, tools, inputs, guardrails — then register it. Every turn references a profile id. The system prompt lives here too.',
		specs: [
			['api', 'defineProfile · registerProfile · getProfile'],
			['fields', 'model · tools · inputs · outputs · guardrails'],
			['also', 'identity.system']
		],
		copyable: true
	},
	resolve: {
		id: 'resolve',
		title: 'Resolve',
		type: 'CORE',
		usage: "import { resolveTurn, projectProfile } from 'theorum'",
		desc: 'Combines a profile with a incoming request into an executable plan. Useful when you need the plan without running yet.',
		specs: [
			['api', 'resolveTurn · projectProfile'],
			['in', 'Profile + TurnRequest'],
			['out', 'ResolvedGeneration']
		],
		copyable: true
	},
	schemas: {
		id: 'schemas',
		title: 'Schemas',
		type: 'CONTRACTS',
		usage: "import { registerStructured, getStructured } from 'theorum'",
		desc: 'Register JSON shapes for structured outputs. The runner validates model replies against them before your app sees data.',
		specs: [
			['api', 'registerStructured · getStructured'],
			['id', 'StructuredSchemaId'],
			['enforced', 'at gates']
		],
		copyable: true
	},
	ingress: {
		id: 'ingress',
		title: 'Ingress',
		type: 'INTERNAL',
		usage: '// Internal',
		desc: 'Normalizes whatever the user sent — text, images, speech — into the shape the profile expects before resolve runs.',
		specs: [
			['path', 'src/kernel/registry/ingress.ts'],
			['handles', 'text · image · voice'],
			['export', 'none']
		]
	},
	stop: {
		id: 'stop',
		title: 'Stop',
		type: 'CORE',
		usage: "import { isResumeableStop, shouldAutoContinue } from 'theorum'",
		desc: 'Tells you why a turn ended and whether to resume or auto-continue. Use in multi-step flows and tool loops.',
		specs: [
			['types', 'TurnStop · TurnStopKind'],
			['api', 'isResumeableStop · shouldAutoContinue'],
			['also', 'turnStopFromOpenAiFinishReason · …']
		],
		copyable: true
	},
	providers: {
		id: 'providers',
		title: 'Providers',
		type: 'INTEGRATION',
		usage: "import { createProvider } from 'theorum/providers'",
		desc: 'Connect profiles to real models. One factory picks OpenRouter, Gemini, local, or speech based on your profile config.',
		specs: [
			['entry', 'theorum/providers'],
			['door', 'createProvider'],
			['protocol', 'openAi · geminiInteractions'],
			['provider', 'google · openrouter · local']
		],
		copyable: true
	},
	create_provider: {
		id: 'create_provider',
		title: 'createProvider',
		type: 'FACTORY',
		usage: 'createProvider(profile, { openAiGateway, gemini, local })',
		desc: 'Wire a profile to API keys and transport. Call once per profile (or cache it) before runTurn.',
		specs: [
			['opts', 'openAiGateway · gemini · local'],
			['returns', 'ModelProvider'],
			['creds', 'host-supplied only']
		],
		copyable: true
	},
	local: {
		id: 'local',
		title: 'Local',
		type: 'PROVIDER',
		usage: "import { createLocalProvider } from 'theorum'",
		desc: 'Talk to Ollama, LM Studio, or any OpenAI-compatible server on your machine. Good for offline dev and fast iteration.',
		specs: [
			['api', 'createLocalProvider'],
			['wire', 'OpenAI /v1/chat/completions'],
			['default', 'http://127.0.0.1:11434']
		],
		copyable: true
	},
	gemini: {
		id: 'gemini',
		title: 'Gemini',
		type: 'PROVIDER',
		usage: "import { createProvider } from 'theorum'\n// createProvider(profile, { gemini: { … } })",
		desc: 'Google Interactions API path. Handles free/paid key rotation when you hit quota limits.',
		specs: [
			['protocol', 'geminiInteractions'],
			['provider', 'google'],
			['vault', 'freeA · freeB · freeC · paid']
		],
		copyable: true
	},
	openrouter: {
		id: 'openrouter',
		title: 'OpenRouter',
		type: 'PROVIDER',
		usage: "import { createProvider } from 'theorum'\n// createProvider(profile, { openAiGateway: { apiKey } })",
		desc: 'Route chat through OpenRouter models. Wire it with createProvider — the adapter loads lazily on the first turn.',
		specs: [
			['protocol', 'openAi'],
			['provider', 'openrouter'],
			['sdk', 'Vercel AI SDK (lazy)']
		],
		copyable: true
	},
	speech: {
		id: 'speech',
		title: 'Speech',
		type: 'PROVIDER',
		usage: "import { createProvider } from 'theorum'",
		desc: 'Text-to-speech when your profile declares a speech output. Picks Google or OpenRouter depending on model config.',
		specs: [
			['via', 'outputs.speech'],
			['google', 'Interactions'],
			['openAi', '/audio/speech']
		],
		copyable: true
	},
	guardrails: {
		id: 'guardrails',
		title: 'Guardrails',
		type: 'SECURITY',
		usage: "import { sanitizeTurnRequest, injectionSpans } from 'theorum/guardrails'",
		desc: 'Inbound safety toolkit — scrub inputs, spot injections and secrets, map errors for clients. Policy stays in your app.',
		specs: [
			['entry', 'theorum/guardrails'],
			['detect', 'injectionSpans · sensitiveSpans'],
			['clean', 'sanitizeTurnRequest'],
			['errors', 'publicError · TheorumError']
		],
		copyable: true
	},
	error: {
		id: 'error',
		title: 'Error',
		type: 'SECURITY',
		usage: "import { publicError, TheorumError } from 'theorum'",
		desc: 'Safe errors for API responses. Full detail goes to your trace sink; users see a clean message.',
		specs: [
			['api', 'publicError · TheorumError'],
			['also', 'toErrorEvent · throwIfAborted'],
			['codes', 'PUBLIC_* constants']
		],
		copyable: true
	},
	injection: {
		id: 'injection',
		title: 'Injection',
		type: 'SECURITY',
		usage: "import { injectionSpans } from 'theorum/guardrails'",
		desc: 'Flags text that looks like prompt injection. Run on inbound messages before you decide to block, warn, or log.',
		specs: [
			['api', 'injectionSpans(text)'],
			['returns', 'span ranges'],
			['policy', 'host-owned']
		],
		copyable: true
	},
	sensitive: {
		id: 'sensitive',
		title: 'Sensitive',
		type: 'SECURITY',
		usage: "import { sensitiveSpans } from 'theorum/guardrails'",
		desc: 'Flags credentials and PII-like patterns. Use to redact or reject before content reaches the model or your logs.',
		specs: [
			['api', 'sensitiveSpans(text)'],
			['returns', 'span ranges'],
			['policy', 'host-owned']
		],
		copyable: true
	},
	quota: {
		id: 'quota',
		title: 'Quota',
		type: 'SECURITY',
		usage: "import { takeSlot, releaseSlot } from 'theorum'",
		desc: 'Simple in-memory daily limits per user or key. Handy for demos; production apps usually swap in their own store.',
		specs: [
			['api', 'takeSlot · releaseSlot · skipQuota'],
			['profile', 'guardrails.quota.perDay'],
			['store', 'in-memory']
		],
		copyable: true
	},
	sanitize: {
		id: 'sanitize',
		title: 'Sanitize',
		type: 'SECURITY',
		usage: "import { sanitizeTurnRequest } from 'theorum'",
		desc: 'Cleans turn input before execution — strips risky fields, normalizes ids, applies text fences. Call early in your request path.',
		specs: [
			['api', 'sanitizeTurnRequest · sanitizeText'],
			['also', 'sanitizeProjectId'],
			['limit', 'PROJECT_ID_MAX']
		],
		copyable: true
	},
	observability: {
		id: 'observability',
		title: 'Observability',
		type: 'TELEMETRY',
		usage: "import { writeTrace, jsonlSink, noopSink } from 'theorum/observability'",
		desc: 'Audit trail you own. Pass a sink into runTurn; the kernel never phones home or writes to a hidden log file.',
		specs: [
			['entry', 'theorum/observability'],
			['write', 'writeTrace'],
			['sinks', 'jsonl · memory · noop · dir'],
			['ambient', 'none']
		],
		copyable: true
	},
	sinks: {
		id: 'sinks',
		title: 'Sinks',
		type: 'TELEMETRY',
		usage: "import { jsonlSink, memorySink, noopSink, sinkFromDir, writeTrace } from 'theorum/observability'",
		desc: 'Where traces land — JSONL file, memory (tests), noop (off), or a directory. Pick one and hand it to runTurn.',
		specs: [
			['api', 'jsonlSink · memorySink · noopSink'],
			['also', 'sinkFromDir · resolveTraceDir'],
			['type', 'TraceSink']
		],
		copyable: true
	},
	trace_record: {
		id: 'trace_record',
		title: 'TraceRecord',
		type: 'TELEMETRY',
		usage: "import type { TraceRecord } from 'theorum/observability'",
		desc: "The shape of one turn's audit entry — timings, usage, stop reason. Type-only import for your analytics pipeline.",
		specs: [
			['kind', 'type-only'],
			['version', 'TraceRecord v2'],
			['holds', 'events · usage · stop']
		],
		copyable: true
	},
	host: {
		id: 'host',
		title: 'Host',
		type: 'HOST',
		usage: "import { json, caughtStatus, flushMintTrace } from 'theorum/host'",
		desc: 'Optional Deno HTTP helpers — JSON responses, status mapping, flushing cutout traces. Skip if you are not on Deno.',
		specs: [
			['entry', 'theorum/host'],
			['http', 'json · caughtStatus · HTTP_*'],
			['trace', 'flushMintTrace'],
			['runtime', 'Deno-oriented']
		],
		copyable: true
	},
	streaming_preview: {
		id: 'streaming_preview',
		title: 'Streaming preview',
		type: 'HOST',
		usage: "import { readStreamingJsonStringField } from 'theorum/host'",
		desc: 'Peek at a string field while JSON is still arriving. Show live previews in UI before the model finishes.',
		specs: [
			['api', 'readStreamingJsonStringField'],
			['entry', 'theorum/host'],
			['use', 'partial structured JSON']
		],
		copyable: true
	},
	presets: {
		id: 'presets',
		title: 'Presets',
		type: 'PRESET',
		usage: "import { registerGooglePreset } from 'theorum/presets'",
		desc: 'Shortcut packs that register common tools and vocab. Optional — only if you want batteries included.',
		specs: [
			['entry', 'theorum/presets'],
			['ships', 'Google pack'],
			['kernel', 'no product opinions']
		],
		copyable: true
	},
	presets_google: {
		id: 'presets_google',
		title: 'Google',
		type: 'PRESET',
		usage: "import { registerGooglePreset, GOOGLE_BUILTIN_TOOLS } from 'theorum/presets/google'",
		desc: 'One call to wire Google Search, Maps, and URL context tools plus image/voice metadata for Gemini profiles.',
		specs: [
			['entry', 'theorum/presets/google'],
			['tools', 'search · maps · urlContext'],
			['vocab', 'image sizes · voice mimes']
		],
		copyable: true
	}
};
