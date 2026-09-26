/**
 * Authored chapter overlays. Catalog rows are injected by compose via
 * FACET_SECTION / UNION_SECTION — do not paste FieldMeta.doc here.
 */

import type { DocArticleDef } from '../schema';

const INSTALL_SHA256 = 'cb5263a5f10e3719cf6689467d6165c2762748c560d6ce544b36b0e2b81e084a';

export const SITE_REDIRECTS = [
	{ from: '/#use', to: '/docs/start', reason: 'home hash retired' },
	{ from: '/#pillars', to: '/docs', reason: 'home hash retired' },
	{ from: '/#overview', to: '/docs', reason: 'home hash retired' },
	{ from: '/#architecture', to: '/docs/host', reason: 'home hash retired' },
	{ from: '/#playground', to: '/docs/playground', reason: 'home hash retired' },
] as const;

export const SITE_ARTICLES: readonly DocArticleDef[] = [
	{
		id: 'start',
		slug: 'start',
		title: 'Start',
		topic: 'start',
		kind: 'tutorial',
		summary:
			'Install the published kernel, compile a first text turn, then open a live session from the same omit-strip path.',
		cover: {
			src: '/imagery/th30_wildflowerroad.png',
			alt: 'A wildflower road',
			kind: 'image',
		},
		suggest: { rank: 1 },
		tree: { order: 10 },
		related: ['runner', 'profiles'],
		actions: [
			{ kind: 'playground', seed: 'firstTurn' },
			{ kind: 'copy', blockId: 'install' },
		],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'Start from the README the package actually ships, then try a turn and a session.',
			},
			{
				id: 'install',
				kind: 'code',
				source: { from: 'readme', heading: 'Install', nth: 0, sha256: INSTALL_SHA256 },
			},
			{
				id: 'first-turn',
				kind: 'prose',
				text: 'A text profile is one request and one stream. Compile it from a playground draft so omit defaults stay off the page.',
			},
			{
				id: 'minimal',
				kind: 'code',
				source: { from: 'seed', seed: 'firstTurn' },
			},
			{
				id: 'first-session',
				kind: 'prose',
				text: 'A live profile is a long-lived session, not a turn with audio bolted on. The door is runSession; pins live under profiles, types, live.',
			},
			{ id: 'try-turn', kind: 'embed.playground', seed: 'firstTurn' },
		],
	},
	{
		id: 'runner',
		slug: 'runner',
		title: 'Runner',
		topic: 'runner',
		kind: 'guide',
		summary:
			'Three doors: a turn, a live session, or a host-side decision. Pick the door first; the profile type follows from it.',
		cover: {
			src: '/imagery/th30_hayss.png',
			alt: 'Hay bales on a hillside',
			kind: 'image',
		},
		tree: { order: 20 },
		related: ['profiles', 'start'],
		actions: [
			{ kind: 'playground', seed: 'liveVoice' },
			{ kind: 'copy', blockId: 'minimal' },
		],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'The kernel runs one of three doors. Pick the door; the profile type follows.',
			},
			{
				id: 'turn',
				kind: 'prose',
				text: 'runTurn is one request, one stream, then done or continue. Tool visibility is turn-local unless the host restores it.',
			},
			{
				id: 'session',
				kind: 'lede',
				text: 'A live profile is not a turn with audio bolted on. It is a long-lived session.',
			},
			{
				id: 'facts',
				kind: 'facts',
				items: [
					{
						id: 'type',
						label: 'Profile type',
						from: 'union',
						union: 'PROFILE_TYPES',
						member: 'live',
					},
					{
						id: 'protocol',
						label: 'Protocol',
						from: 'pairs',
						table: 'PROFILE_TYPE_PROTOCOLS',
						key: 'live',
					},
					{
						id: 'provider',
						label: 'Provider',
						from: 'pairs',
						table: 'PROTOCOL_PROVIDERS',
						key: 'geminiLive',
					},
					{
						id: 'ingress-audio',
						label: 'Ingress audio',
						from: 'field',
						path: 'live.ingress.audio',
						show: 'unset',
					},
					{
						id: 'ingress-video',
						label: 'Ingress video',
						from: 'field',
						path: 'live.ingress.video',
						show: 'unset',
					},
					{
						id: 'ingress-text',
						label: 'Ingress text',
						from: 'field',
						path: 'live.ingress.text',
						show: 'unset',
					},
				],
			},
			{
				id: 't0',
				kind: 'callout',
				tone: 'note',
				text: 'Live wires every allowed tool at session setup. loadTier still describes the catalog; the session does not wait for T1 or T2.',
			},
			{
				id: 'session-setup',
				kind: 'catalog.fields',
				paths: ['tools.allow', 'loadTier'],
			},
			{
				id: 'minimal',
				kind: 'code',
				source: { from: 'seed', seed: 'liveVoice' },
			},
			{ id: 'try', kind: 'embed.playground', seed: 'liveVoice' },
			{
				id: 'decision',
				kind: 'prose',
				text: 'runDecision is a host-side door. It binds no model protocol. The contract and inputs live on the decision type, not here.',
			},
		],
	},
	{
		id: 'profiles',
		slug: 'profiles',
		title: 'Profiles',
		topic: 'profiles',
		kind: 'guide',
		summary:
			'Six profile types share identity and models. Type-scoped pins nest under types; shared anatomy is not a type name.',
		cover: {
			src: '/imagery/th30_steppe.png',
			alt: 'A steppe in low sun',
			kind: 'image',
		},
		suggest: { rank: 2 },
		tree: { order: 30 },
		related: ['runner', 'tools'],
		replaces: { kind: 'catalog.union', union: 'PROFILE_TYPES' },
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'A profile is the whole agent: type, identity, models, tools, and the pins that type is allowed to set.',
			},
			{ id: 'types', kind: 'catalog.union', union: 'PROFILE_TYPES' },
			{
				id: 'identity',
				kind: 'prose',
				text: 'Identity is shared anatomy — handle and system instruction — not a profile type.',
			},
			{
				id: 'models',
				kind: 'prose',
				text: 'Host-named bindings carry protocol, provider, and wire config. Legal pairs live on the providers chapter.',
			},
			{
				id: 'inputs',
				kind: 'prose',
				text: 'Inputs declare what a turn may accept. Decision profiles keep their inputs on the decision facet.',
			},
			{
				id: 'outputs',
				kind: 'prose',
				text: 'Outputs cover structured schemas, validation, and how the stream is delivered.',
			},
			{
				id: 'turn-behaviour',
				kind: 'prose',
				text: 'Turn behaviour is resume and steering for turn-shaped profiles. Live uses session resumption instead.',
			},
		],
	},
	{
		id: 'tools',
		slug: 'tools',
		title: 'Tools',
		topic: 'tools',
		kind: 'guide',
		summary:
			'Register tools once at startup, then allow them by name. Builtins sit on the model binding; custom tools sit on tools.allow.',
		cover: {
			src: '/imagery/th30_tidalmudflats.png',
			alt: 'Tidal mudflats',
			kind: 'image',
		},
		suggest: { rank: 3 },
		tree: { order: 40 },
		related: ['profiles', 'runner'],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'The catalog is process-local. Profiles name what they may call; they do not define handlers.',
			},
			{
				id: 'register',
				kind: 'prose',
				text: 'registerTool is startup registration. loadTier says when the model may see the tool, after allow.',
			},
			{
				id: 'allow',
				kind: 'prose',
				text: 'tools.allow is custom functions only. Provider natives belong on the selected model binding.',
			},
			{
				id: 'builtins',
				kind: 'prose',
				text: 'googleSearch, googleMaps, urlContext, and codeExecution are provider-native. The kernel does not run their handlers.',
			},
		],
	},
	{
		id: 'guardrails',
		slug: 'guardrails',
		title: 'Guardrails',
		topic: 'guardrails',
		kind: 'guide',
		summary:
			'Inbound sanitization, canary tokens, and egress checks are profile policy. The kernel ships the mechanism, not the copy.',
		cover: {
			src: '/imagery/th30_mistyforest.png',
			alt: 'A misty forest',
			kind: 'image',
		},
		suggest: { rank: 4 },
		tree: { order: 50 },
		related: ['observability', 'profiles'],
		replaces: { kind: 'catalog.lexicon' },
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'Guardrails run on every door. Omit stays omit — the resolved policy is not restated here as authored-on.',
			},
			{
				id: 'inbound',
				kind: 'prose',
				text: 'Inbound checks depend on trust. System text you wrote is not scanned the same way as user text or tool results.',
			},
			{
				id: 'egress',
				kind: 'prose',
				text: 'Egress is opt-in. Set enforce on the profile when outbound payloads must be judged before release.',
			},
			{
				id: 'lexicon',
				kind: 'prose',
				text: 'Every user- or model-facing kernel string is a lexicon key. Hosts replace keys; they do not fork the emit sites.',
			},
			{ id: 'lexicon-keys', kind: 'catalog.lexicon' },
		],
	},
	{
		id: 'observability',
		slug: 'observability',
		title: 'Observability',
		topic: 'observability',
		kind: 'guide',
		summary:
			'Traces are a span tree the host stores. THEOREM names the vocabulary and writes the record; it does not own a database.',
		cover: {
			src: '/imagery/th30_reeds.png',
			alt: 'Reeds at the waterline',
			kind: 'image',
		},
		tree: { order: 60 },
		related: ['guardrails', 'host'],
		replaces: { kind: 'catalog.trace' },
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'A profile may sample, scrub, and name a destination. The host registers the sink.',
			},
			{
				id: 'traces',
				kind: 'prose',
				text: 'Viewers should read TRACE_* catalogs instead of inventing labels for span types and attributes.',
			},
			{ id: 'trace-catalog', kind: 'catalog.trace' },
			{
				id: 'sinks',
				kind: 'prose',
				text: 'memorySink, jsonlSink, or a host TraceSink. OTLP export is a projection of a record the host already has.',
			},
		],
	},
	{
		id: 'providers',
		slug: 'providers',
		title: 'Providers',
		topic: 'providers',
		kind: 'guide',
		summary:
			'createProvider is the turn door. Legal protocol and provider pairs are a catalog table, not a suggestion or a host convention.',
		cover: {
			src: '/imagery/th30_orchards.png',
			alt: 'Orchards in rows',
			kind: 'image',
		},
		tree: { order: 70 },
		related: ['runner', 'profiles'],
		replaces: [
			{ kind: 'catalog.union', union: 'PROTOCOLS' },
			{ kind: 'catalog.union', union: 'PROVIDERS' },
		],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'A binding names a protocol and a provider. The pair must exist in the catalog or defineProfile rejects it.',
			},
			{ id: 'pairs', kind: 'catalog.union', union: 'PROTOCOLS' },
			{ id: 'providers-union', kind: 'catalog.union', union: 'PROVIDERS' },
			{
				id: 'google',
				kind: 'prose',
				text: 'Google carries Gemini Interactions and Gemini Live. Live is the only legal protocol for a live profile.',
			},
			{
				id: 'openrouter',
				kind: 'prose',
				text: 'OpenRouter is the openAi protocol through a multi-provider proxy.',
			},
			{
				id: 'local',
				kind: 'prose',
				text: 'Local is an OpenAI-compatible server. Name it on the binding; traces report that name as the provider.',
			},
		],
	},
	{
		id: 'interface',
		slug: 'interface',
		title: 'Interface',
		topic: 'interface',
		kind: 'concept',
		summary:
			'Headless projection of a profile: inputs, tools, and transcript folding. Publish is pending — no install fact yet.',
		cover: {
			src: '/imagery/th30_terracedgarden.png',
			alt: 'A terraced garden',
			kind: 'image',
		},
		tree: { order: 80 },
		related: ['ui', 'playground'],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'The interface package is the product host’s headless layer. It does not replace defineProfile.',
			},
			{
				id: 'from-profile',
				kind: 'prose',
				text: 'interfaceFromProfile maps a registered profile into what a client may render and invoke.',
			},
			{
				id: 'runners',
				kind: 'prose',
				text: 'Turn runners stream events; live runners hold a session. Both read the same interface shape for their type.',
			},
		],
	},
	{
		id: 'ui',
		slug: 'ui',
		title: 'UI',
		topic: 'ui',
		kind: 'concept',
		summary:
			'@theoremai/react is chat and live on Astryx. It publishes with the interface package — no install fact on this page yet.',
		cover: {
			src: '/imagery/th30_cherryblossoms.png',
			alt: 'Cherry blossoms',
			kind: 'image',
		},
		tree: { order: 90 },
		related: ['interface', 'playground'],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'The React package is a projection of the interface, not a second profile language.',
			},
			{
				id: 'chat',
				kind: 'prose',
				text: 'TheoremChat is the turn runner: composer, transcript, gates, and the trace inspector when the profile records.',
			},
			{
				id: 'live',
				kind: 'prose',
				text: 'LiveRunner is the session runner: call controls, captions, and the same gate cards as chat.',
			},
		],
	},
	{
		id: 'playground',
		slug: 'playground',
		title: 'Playground',
		topic: 'playground',
		kind: 'guide',
		summary:
			'A draft compiler for text, image, speech, and live. It does not author host or decision profiles, and it is not a second kernel.',
		cover: {
			src: '/imagery/th30_copperandobsidian.png',
			alt: 'Copper and obsidian ground',
			kind: 'image',
		},
		tree: { order: 100 },
		related: ['profiles', 'ui'],
		actions: [{ kind: 'playground', seed: 'firstTurn' }],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'The playground is a host-owned composer. It projects PROFILE_GRAPH; it does not invent facets.',
			},
			{
				id: 'draft',
				kind: 'prose',
				text: 'A draft holds every section so switching type keeps what you typed. Compile emits only what that type may set.',
			},
			{
				id: 'compile',
				kind: 'prose',
				text: 'compilePlayground validates, then defineProfile has the last word. Empty optionals are omitted, not authored-on.',
			},
			{ id: 'try-draft', kind: 'embed.playground', seed: 'firstTurn' },
		],
	},
	{
		id: 'host',
		slug: 'host',
		title: 'Host',
		topic: 'host',
		kind: 'concept',
		summary:
			'The host owns keys, persistence, sinks, and UI copy. The kernel imports with every permission denied — no ambient authority.',
		cover: {
			src: '/imagery/th30_floodedpaddy.png',
			alt: 'A flooded paddy',
			kind: 'image',
		},
		tree: { order: 110 },
		related: ['cli', 'observability'],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'THEOREM runs the turn. The host decides where traces go, which vault slot is live, and what the user reads.',
			},
			{
				id: 'ceiling',
				kind: 'prose',
				text: 'A host profile is the invokeTool ceiling. It never runs a model. Decision profiles are a different door.',
			},
		],
	},
	{
		id: 'cli',
		slug: 'cli',
		title: 'CLI',
		topic: 'cli',
		kind: 'concept',
		summary:
			'The CLI is a host in the repo: profile inspect, benches, and guardrail fuzz. It is not a second runtime or a public API.',
		cover: {
			src: '/imagery/th30_saltflats.png',
			alt: 'Salt flats',
			kind: 'image',
		},
		tree: { order: 120 },
		related: ['host', 'start'],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'Use the CLI when you want the kernel’s own checks, not a restated catalog in another language.',
			},
			{
				id: 'commands',
				kind: 'prose',
				text: 'profile, bench, and fuzz-guardrails sit on the package. Public /docs does not ship maintainer contracts.',
			},
		],
	},
];
