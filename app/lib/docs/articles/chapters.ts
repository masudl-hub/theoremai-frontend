/**
 * Authored chapter overlays. Catalog symbols compose into each page's
 * dictionary — do not paste FieldMeta.doc here.
 */

import type { DocArticleDef } from '../schema';

export const SITE_REDIRECTS = [
	{ from: '/#use', to: '/docs/start', reason: 'home hash retired' },
	{ from: '/#pillars', to: '/docs', reason: 'home hash retired' },
	{ from: '/#overview', to: '/docs', reason: 'home hash retired' },
	{ from: '/#architecture', to: '/docs/modalities#host', reason: 'home hash retired' },
	{ from: '/#playground', to: '/playground', reason: 'home hash retired' },
	{
		from: '/docs/profiles',
		to: '/docs/modalities',
		reason: 'profiles remapped to modalities',
	},
	{
		from: '/docs/providers',
		to: '/docs/models',
		reason: 'providers remapped to models',
	},
	{
		from: '/docs/observability',
		to: '/docs/traces',
		reason: 'observability remapped to traces',
	},
	{ from: '/docs/host', to: '/docs/modalities#host', reason: 'host is a modality' },
	{ from: '/docs/cli', to: '/docs/start', reason: 'cli deferred' },
	{ from: '/docs/ui', to: '/docs/interface', reason: 'ui folded into interface' },
	{ from: '/docs/playground', to: '/playground', reason: 'playground chapter retired' },
] as const;

export const SITE_ARTICLES: readonly DocArticleDef[] = [
	/* ------------------------------------------------------------------ */
	/*  start                                                              */
	/* ------------------------------------------------------------------ */
	{
		id: 'start',
		slug: 'start',
		title: 'Getting started',
		topic: 'start',
		entry: 'src/kernel/engine/runner/mod.ts',
		kind: 'tutorial',
		summary:
			'Why a typed profile beats rebuilding the prompt each call, then a Harbor front desk that runs one turn on the wire.',
		cover: {
			src: '/imagery/th30_wildflowerroad.png',
			alt: 'A wildflower road',
			kind: 'image',
		},
		suggest: { rank: 1 },
		actions: [
			{ kind: 'playground', seed: 'firstTurn' },
			{ kind: 'copy', blockId: 'install' },
		],
		questions: [
			{ question: 'Why run an agent this way?' },
			{ question: 'What do I write to get a first turn on the wire?' },
		],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: [
					'Theorem is an intention engine. You describe the agent once, as a profile \u2014 a typed contract Theorem checks when you define it, then runs against on every request. Intention is first class: the host calls a door; the profile is what was meant to run.',
					'A prompt you rebuild each call, or an SDK client that only carries model and tools on the request, does not hold that contract. The profile does \u2014 from the server to the UI when you mount one.',
				].join('\n\n'),
			},
			{
				id: 'install',
				kind: 'code',
				title: 'Install',
				source: {
					from: 'literal',
					lang: 'bash',
					code: 'deno add jsr:@theoremjs/agents',
				},
			},
			{
				id: 'install-npm',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'bash',
					code: 'npm install @theoremjs/agents zod',
				},
			},
			{
				id: 'first-turn',
				kind: 'prose',
				title: 'A first turn',
				text: 'Harbor\u2019s front desk: shippers ask about holds and paperwork. The desk can read a photo or PDF, look up a hold status, measure a road leg, and answer in a fixed JSON shape. Omit `guardrails` and sanitize, redact, and canary still resolve on.',
			},
			{
				id: 'paste',
				kind: 'agent.paste',
				prompt: [
					'Install `@theoremjs/agents` and `zod`.',
					'',
					'Copy the Harbor desk program from the docs fence in full (tools, structured schema, profile, `firstTurn`).',
					'',
					'Run it with an OpenRouter key. Do not invent extra profile fields.',
				].join('\n'),
			},
			{
				id: 'minimal',
				kind: 'code',
				source: { from: 'seed', seed: 'firstTurn' },
			},
			{
				id: 'on-the-wire',
				kind: 'lede',
				text: '`apiId` is the provider\u2019s model id \u2014 swap `openrouter/free` for any OpenRouter id you use. A follow-up is another `runTurn` with `input.history` when you need prior turns.',
			},
			{ id: 'try', kind: 'embed.playground', seed: 'firstTurn' },
		],
	},

	/* ------------------------------------------------------------------ */
	/*  modalities                                                         */
	/* ------------------------------------------------------------------ */
	{
		id: 'modalities',
		slug: 'modalities',
		title: 'Choosing a modality',
		topic: 'modalities',
		entry: 'src/kernel/registry/profiles.ts',
		kind: 'guide',
		summary:
			'The profile type is the modality \u2014 it locks which blocks you may author and which pins you must set. Six types, one contract.',
		cover: {
			src: '/imagery/th30_wideorchard.png',
			alt: 'A wide orchard',
			kind: 'image',
		},
		suggest: { rank: 2 },
		questions: [{ question: 'What does each profile type carry, and what are its limits?' }],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'The profile\u2019s `type` is the modality. It locks which blocks you may author and which pins you must set. Pick the type that matches the agent; the field pages deepen each block.',
			},
			{
				id: 'text',
				kind: 'prose',
				title: 'Text',
				text: [
					'Turn-based agent: identity with system, models, tools, turn inputs, optional outputs and turn behaviour.',
					'Protocols `openAi` or `geminiInteractions`. May set `inputs.voice`, `tools.t1Policy` / `t2Loader`, and model compaction. No `image` / `speech` / `live` / `decision` pins.',
				].join('\n\n'),
			},
			{
				id: 'text-example',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						'const agent = defineProfile({',
						"\ttype: 'text',",
						"\tid: 'harbor.desk',",
						'\tidentity: {',
						"\t\thandle: 'desk',",
						"\t\tsystem: 'You are Harbor front desk for shippers.',",
						'\t},',
						'\tmodels: {',
						'\t\tmain: {',
						"\t\t\tprotocol: 'openAi',",
						"\t\t\tprovider: 'openrouter',",
						"\t\t\tapiId: 'openrouter/free',",
						'\t\t},',
						'\t},',
						"\ttools: { allow: ['harbor.holdStatus'] },",
						'\tinputs: {',
						"\t\tattachments: { accept: ['image/*', 'application/pdf'] },",
						'\t\tmaxFiles: 4,',
						'\t\tmaxBytes: 5_000_000,',
						'\t\tmaxTurnBytes: 12_000_000,',
						'\t},',
						"\toutputs: { structured: 'harbor.desk.reply' },",
						'\tturnBehaviour: { allowSteering: true },',
						'\tguardrails: {',
						'\t\tsanitizeInput: true,',
						'\t\tredactSensitive: true,',
						'\t\tcanary: true,',
						'\t},',
						'})',
					].join('\n'),
				},
			},
			{
				id: 'image',
				kind: 'prose',
				title: 'Image',
				text: [
					'Same spine as text, plus a required `image` pin. Attachments stay in the image accept set; no voice channel; no mid-turn steering.',
					'No `inputs.voice`, no `allowSteering`. `image.*` fields you omit follow the provider default. Protocols `openAi` or `geminiInteractions`.',
				].join('\n\n'),
			},
			{
				id: 'image-example',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						'const illustrator = defineProfile({',
						"\ttype: 'image',",
						"\tid: 'harbor.label',",
						'\tidentity: {',
						"\t\thandle: 'label',",
						"\t\tsystem: 'Compose clear shipping-label art.',",
						'\t},',
						'\tmodels: {',
						'\t\tmain: {',
						"\t\t\tprotocol: 'geminiInteractions',",
						"\t\t\tprovider: 'google',",
						"\t\t\tapiId: 'gemini-3.1-flash-image-preview',",
						"\t\t\tkey: 'slotA',",
						'\t\t},',
						'\t},',
						'\ttools: { allow: [] },',
						'\tinputs: {',
						"\t\tattachments: { accept: ['image/*', 'application/pdf'] },",
						'\t\tmaxFiles: 4,',
						'\t\tmaxBytes: 5_000_000,',
						'\t\tmaxTurnBytes: 12_000_000,',
						'\t},',
						'\timage: {',
						"\t\taspectRatio: '1:1',",
						"\t\tmimeType: 'image/png',",
						'\t},',
						'})',
					].join('\n'),
				},
			},
			{
				id: 'speech',
				kind: 'prose',
				title: 'Speech',
				text: [
					'Transcript in, audio out. Handle only \u2014 no system line, no tools, no `inputs` block. Required `speech` pin. Canary stays off.',
					'No `identity.system`, no `tools`, no `inputs`. Omit `speech.format` and the provider picks; author `pcm` for WAV, `mp3` only with protocol `openAi`. Protocols `openAi` or `geminiInteractions`.',
				].join('\n\n'),
			},
			{
				id: 'speech-example',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						'const announcer = defineProfile({',
						"\ttype: 'speech',",
						"\tid: 'harbor.announce',",
						"\tidentity: { handle: 'announce' },",
						'\tmodels: {',
						'\t\tmain: {',
						"\t\t\tprotocol: 'geminiInteractions',",
						"\t\t\tprovider: 'google',",
						"\t\t\tapiId: 'gemini-3.1-flash-tts-preview',",
						"\t\t\tkey: 'slotA',",
						'\t\t},',
						'\t},',
						'\tspeech: {',
						"\t\tvoice: 'Kore',",
						'\t},',
						'\tguardrails: { canary: false },',
						'})',
					].join('\n'),
				},
			},
			{
				id: 'live',
				kind: 'prose',
				title: 'Live',
				text: [
					'Realtime session. `geminiLive` only. Tools are an allow list (no T1/T2). Ingress lives under `live`; no turn `inputs` or `outputs`. Session resume is `live.sessionResumption`, not `turnBehaviour.resumption`.',
					'Omit a channel and audio/video default on, text off \u2014 at least one channel must end up on. No `outputs`. No `models.*.compaction` (use `live.contextCompression` when you need a window).',
				].join('\n\n'),
			},
			{
				id: 'live-example',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						'const line = defineProfile({',
						"\ttype: 'live',",
						"\tid: 'harbor.line',",
						'\tidentity: {',
						"\t\thandle: 'line',",
						"\t\tsystem: 'You are on a live call with a Harbor shipper.',",
						'\t},',
						'\tmodels: {',
						'\t\tmain: {',
						"\t\t\tprotocol: 'geminiLive',",
						"\t\t\tprovider: 'google',",
						"\t\t\tapiId: 'gemini-3.1-flash-live-preview',",
						"\t\t\tkey: 'slotA',",
						'\t\t},',
						'\t},',
						"\ttools: { allow: ['harbor.holdStatus'] },",
						'\tlive: {',
						'\t\tingress: { audio: true, video: false, text: true },',
						'\t\tsessionResumption: true,',
						'\t},',
						'\tturnBehaviour: { allowSteering: true },',
						'})',
					].join('\n'),
				},
			},
			{
				id: 'decision',
				kind: 'prose',
				title: 'Decision',
				text: [
					"Structured answers over JSON state. One model by `apiId` only (no protocol/provider). Handle only. Required `decision.contract`. `inputs.state: 'json'`.",
					'No tools, no turn outputs, no turn behaviour, no `identity.system`. `decision.contract` is a host span id \u2014 not the prompt. Questions and state ride on the `runDecision` request ([Running a turn](/docs/runner)).',
				].join('\n\n'),
			},
			{
				id: 'decision-example',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						'const router = defineProfile({',
						"\ttype: 'decision',",
						"\tid: 'harbor.route',",
						"\tidentity: { handle: 'route' },",
						'\tmodels: {',
						"\t\tjev: { apiId: 'jev-latest' },",
						'\t},',
						"\tinputs: { state: 'json' },",
						"\tdecision: { contract: 'harbor.route.v1' },",
						'\tguardrails: {',
						'\t\tdisclosure: { enforce: true },',
						'\t},',
						'})',
					].join('\n'),
				},
			},
			{
				id: 'host',
				kind: 'prose',
				title: 'Host',
				text: [
					'Tools only \u2014 no identity, no models, no turn inputs or outputs.',
					'Guardrails here are sanitise, redact, and network only. Call tools with `invokeTool` ([Running a turn](/docs/runner)).',
				].join('\n\n'),
			},
			{
				id: 'host-example',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						'const toolbox = defineProfile({',
						"\ttype: 'host',",
						"\tid: 'harbor.tools',",
						"\ttools: { allow: ['harbor.holdStatus', 'haversine_distance'] },",
						'\tguardrails: {',
						'\t\tsanitizeInput: true,',
						'\t\tredactSensitive: true,',
						'\t},',
						'})',
					].join('\n'),
				},
			},
		],
	},

	/* ------------------------------------------------------------------ */
	/*  identity                                                           */
	/* ------------------------------------------------------------------ */
	{
		id: 'identity',
		slug: 'identity',
		title: 'Setting the identity',
		topic: 'identity',
		entry: 'src/kernel/registry/profiles.ts',
		kind: 'guide',
		summary:
			'Handle is the name a person sees; system is what the model reads. Set both under identity, and use role lines when turns differ.',
		cover: {
			src: '/imagery/th30_peninsula.png',
			alt: 'A peninsula from above',
			kind: 'image',
		},
		questions: [
			{
				question:
					'What do I set so the person sees one name and the model gets the right instruction?',
			},
			{ question: 'Where does a role line fail me?' },
		],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: [
					'`handle` is the name you show a person. `system` is the instruction the model reads each turn. Set both under `identity`. That differs from stuffing role text into the user message, or relying only on a per-request `system` with no stable handle.',
					'`type` decides whether a system line is allowed \u2014 detail on [Choosing a modality](/docs/modalities).',
				].join('\n\n'),
			},
			{
				id: 'identity-config',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						"type: 'text',",
						'identity: {',
						"\thandle: 'support',",
						"\tsystem: 'You help with account questions.',",
						'\tsystemByRole: {',
						"\t\tengineer: 'You help engineers debug account issues.',",
						'\t},',
						'},',
					].join('\n'),
				},
			},
			{
				id: 'handle-and-system',
				kind: 'prose',
				title: 'Handle and system',
				text: [
					'`handle` is required. Leave `system` out and there is no system instruction from the profile. `systemByRole` is optional.',
					'`text`, `image`, and `live` take handle and system. `speech` and `decision` take a handle only. `host` has no identity.',
				].join('\n\n'),
			},
			{
				id: 'role-lines',
				kind: 'prose',
				title: 'Role lines',
				text: [
					'`systemByRole` is a line per role. The run picks with `input.role`.',
					'If `input.role` is a key in that map, that line is used instead of `system`. The model gets the role-specific line. The person still sees the handle.',
					'If `input.role` is missing, or the string is not a key, Theorem uses the handle as the role, then `systemByRole` for that handle, then `system`.',
				].join('\n\n'),
			},
			{
				id: 'role-input',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: "input: { text: 'The export is stuck.', role: 'engineer' }",
				},
			},
			{
				id: 'role-fallback',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: "input: { text: 'The export is stuck.' }",
				},
			},
			{
				id: 'role-failures',
				kind: 'prose',
				title: 'Where a role line fails',
				text: [
					'A role line fails you when you expect an unknown role to keep the default `system` *and* you also authored `systemByRole[handle]` \u2014 the handle key wins for every turn that does not name another key.',
					'A role line also fails you on `speech`: there is no `systemByRole`. Passing `system` on a speech request is refused.',
				].join('\n\n'),
			},
			{
				id: 'run-time-system',
				kind: 'prose',
				title: 'Run-time system',
				text: 'A `system` string on `runTurn` or `runSession` is appended after the profile\u2019s line, with a blank line between. The profile line is author-time. The run line is assembled for that call. The model gets the role-resolved line, then the run-time line.',
			},
			{
				id: 'request-system',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						'{',
						"\tinput: { text: 'The export is stuck.', role: 'engineer' },",
						"\tsystem: 'Cite the ticket id if you have one.',",
						'}',
					].join('\n'),
				},
			},
		],
	},

	/* ------------------------------------------------------------------ */
	/*  models                                                             */
	/* ------------------------------------------------------------------ */
	{
		id: 'models',
		slug: 'models',
		title: 'Binding models',
		topic: 'models',
		entry: 'src/providers/mod.ts',
		kind: 'guide',
		summary:
			'A binding is protocol, provider, and apiId under a name. Legal pairs are a catalog table; the pair, pick, or key fails closed.',
		cover: {
			src: '/imagery/th30_mineralhills.png',
			alt: 'Mineral hills',
			kind: 'image',
		},
		questions: [
			{ question: 'How do I bind a model so a turn can call it?' },
			{ question: 'Where does the pair, the pick, or the key fail?' },
		],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'A binding is one named entry in `models`: protocol, provider, and `apiId` under an id you use later. That differs from passing a bare model string on each request with no profile contract. `type` decides whether you get a full pair, an `apiId` alone (`decision`), or no models (`host`).',
			},
			{
				id: 'binding-config',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						"type: 'text',",
						'models: {',
						'\tmain: {',
						"\t\tprotocol: 'openAi',",
						"\t\tprovider: 'openrouter',",
						"\t\tapiId: 'openrouter/free',",
						'\t},',
						'},',
					].join('\n'),
				},
			},
			{
				id: 'binding-requirements',
				kind: 'prose',
				title: 'Binding requirements',
				text: [
					'`text`, `image`, `speech`, and `live` must declare at least one binding. One key and no `defaultModel` writes that key as the default. Two or more keys require `defaultModel`.',
					'A `decision` profile declares exactly one model, by `apiId` only. A `host` profile has no models.',
					'`apiId` is the provider\u2019s model id. Theorem does not catalog which strings a provider accepts.',
				].join('\n\n'),
			},
			{
				id: 'legal-pairs',
				kind: 'prose',
				title: 'Legal pairs',
				text: [
					'A turn binding pairs a protocol with a provider. The legal pairs are `openAi` with `openrouter`, `openAi` with `local`, `geminiInteractions` with `google`, and `geminiLive` with `google`.',
					'`text`, `image`, and `speech` may use `openAi` or `geminiInteractions`. `live` uses `geminiLive` only. [Choosing a modality](/docs/modalities).',
				].join('\n\n'),
			},
			{
				id: 'local-config',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						"type: 'text',",
						'models: {',
						'\tlocal: {',
						"\t\tprotocol: 'openAi',",
						"\t\tprovider: 'local',",
						"\t\tapiId: 'llama3.2',",
						"\t\tserver: 'ollama',",
						'\t},',
						'},',
					].join('\n'),
				},
			},
			{
				id: 'create-the-provider',
				kind: 'prose',
				title: 'Create the provider',
				text: [
					'`server` is a label for traces. It is not a URL. The host passes the URL when it creates the provider.',
					'`createProvider` takes the `openAi` + `openrouter` pair and the `openAi` + `local` pair (not image). `geminiInteractions` + `google` needs a Gemini transport. `geminiLive` + `google` is a legal pair; the door is `runSession`, not `createProvider`. [Running a turn](/docs/runner).',
				].join('\n\n'),
			},
			{
				id: 'model-selection',
				kind: 'prose',
				title: 'Model selection',
				text: [
					'The turn runs `defaultModel` unless it names another key.',
					'`allowModelSelect` is off when omitted. It requires two or more keys. When it is on, the run may pass `model`.',
				].join('\n\n'),
			},
			{
				id: 'multi-model',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						"type: 'text',",
						'models: {',
						'\tflash: {',
						"\t\tprotocol: 'openAi',",
						"\t\tprovider: 'openrouter',",
						"\t\tapiId: 'openrouter/free',",
						'\t},',
						'\tpro: {',
						"\t\tprotocol: 'openAi',",
						"\t\tprovider: 'openrouter',",
						"\t\tapiId: 'example/other',",
						'\t},',
						'},',
						"defaultModel: 'flash',",
						'allowModelSelect: true,',
					].join('\n'),
				},
			},
			{
				id: 'where-it-fails',
				kind: 'prose',
				title: 'Where it fails',
				text: [
					'The pair, the pick, or the key fails you when: the protocol and provider are not a legal pair; the protocol is illegal for the profile type; you name a `model` that is not a key, or name one when selection is off; `createProvider` is asked for `geminiLive`, or for image + `local`; a live session has no `model` on the request \u2014 it always runs `defaultModel`.',
					'A Google binding has no vault slot (`models.*.key`, else `profile.key`) at resolve. Theorem does not read keys from the environment.',
				].join('\n\n'),
			},
			{
				id: 'provider-calls',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						'createProvider(profile, { openAiGateway: { apiKey } })',
						"createProvider(profile, { local: { baseUrl: 'http://127.0.0.1:11434' } }, 'local')",
						'createProvider(profile, { gemini: { vault } })',
					].join('\n'),
				},
			},
		],
	},

	/* ------------------------------------------------------------------ */
	/*  tools                                                              */
	/* ------------------------------------------------------------------ */
	{
		id: 'tools',
		slug: 'tools',
		title: 'Registering tools',
		topic: 'tools',
		entry: 'src/kernel/tools/mod.ts',
		kind: 'guide',
		summary:
			'Register tools once on the scope, then allow them by name on the profile. Builtins sit on the model binding, not the allow list.',
		cover: {
			src: '/imagery/th30_basaltplanes.png',
			alt: 'Basalt planes',
			kind: 'image',
		},
		questions: [
			{ question: 'How do I register a tool and allow it on the profile?' },
			{ question: 'What goes wrong when the model names one?' },
		],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'Register the tool on the scope, then name it in `tools.allow`. There is no `defineTool`. That differs from builtins, which sit on the model binding ([Binding models](/docs/models)), and from a one-off function you only call from host code.',
			},
			{
				id: 'register-example',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						'registerTool({',
						"\ttype: 'function',",
						"\tname: 'lookup',",
						"\tdescription: 'Look up an account by id.',",
						"\tcategory: 'account',",
						"\taccess: 'read-only',",
						"\tpaths: ['*'],",
						"\tloadTier: 'T0',",
						"\tpermission: 'auto',",
						'\tinput: z.object({ id: z.string() }),',
						'\toutput: z.object({ name: z.string() }),',
						'\thandler: ({ id }) => ({ name: id }),',
						'})',
					].join('\n'),
				},
			},
			{
				id: 'register-and-allow',
				kind: 'prose',
				title: 'Register and allow',
				text: [
					'`name` is the id you put in `allow`. `description` is what the model reads. Registration turns Zod `input` into wire `parameters`. `handler` runs on a model call and on `invokeTool`.',
					'`tools` and `tools.allow` are required where the type takes tools; an empty list is `{ allow: [] }`. [Choosing a modality](/docs/modalities).',
					'An id in `allow` need not be registered yet. At turn time a custom id missing from the registry is dropped from the wire. A builtin listed in `allow` is refused when you define the profile.',
				].join('\n\n'),
			},
			{
				id: 'allow-config',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: ["type: 'text',", "tools: { allow: ['lookup'] },"].join('\n'),
				},
			},
			{
				id: 'when-model-names',
				kind: 'prose',
				title: 'When the model names one',
				text: [
					'Theorem checks the registry, then `allow`, then path and visibility for that turn.',
					'Not registered \u2192 `unknown_tool`. Registered but not in `allow` \u2192 `not_allowed`. In `allow` but not on the path, or not yet visible \u2192 `not_gated` or `not_loaded`.',
					'`invokeTool` is the same execute path without a provider. Permission on the tool (`auto`, `session_consent`, `always_confirm`) can pause before the handler \u2014 surfaces answer that on [Building the interface](/docs/interface). Network and taint checks sit on [Setting guardrails](/docs/guardrails).',
				].join('\n\n'),
			},
		],
	},

	/* ------------------------------------------------------------------ */
	/*  inputs                                                             */
	/* ------------------------------------------------------------------ */
	{
		id: 'inputs',
		slug: 'inputs',
		title: 'Declaring inputs',
		topic: 'inputs',
		entry: 'src/kernel/registry/profiles.ts',
		kind: 'guide',
		summary:
			'Declare what a turn may carry \u2014 text, files, voice, or state \u2014 and which channels close by type. Refused means the door said no.',
		cover: {
			src: '/imagery/th30_tidalpools.png',
			alt: 'Tidal pools',
			kind: 'image',
		},
		questions: [
			{ question: 'What must I declare before a turn can carry text, files, voice, or state?' },
			{ question: 'What gets refused at the door?' },
		],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'On `text` and `image` you declare turn inputs under `inputs`. Other types use a different door.',
			},
			{
				id: 'inputs-config',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						"type: 'text',",
						'inputs: {',
						'\ttext: true,',
						"\tattachments: { accept: ['image/*', 'application/pdf'] },",
						'\tmaxFiles: 4,',
						'\tmaxBytes: 5_000_000,',
						'\tmaxTurnBytes: 12_000_000,',
						'},',
					].join('\n'),
				},
			},
			{
				id: 'text-and-attachments',
				kind: 'prose',
				title: 'Text and attachments',
				text: [
					'`inputs` is required on `text`, `image`, and `decision`.',
					'Leave `inputs.text` out and text is accepted. Set it to `false` and a turn with text is refused.',
					'Attachments and voice need an `accept` list and all three size caps: `maxFiles`, `maxBytes`, and `maxTurnBytes`. Omit the media block and that channel is closed. `inputs.voice` exists only on `text`. An `image` profile\u2019s attachments stay inside images, video, and PDF.',
				].join('\n\n'),
			},
			{
				id: 'slots',
				kind: 'prose',
				title: 'Slots',
				text: '`inputs.slots` names turn selectors and their allowed choices. `assertTurnSlots` refuses a turn value outside that list, or a slot the profile did not declare.',
			},
			{
				id: 'other-modalities',
				kind: 'prose',
				title: 'Other modalities',
				text: [
					'`speech` has no `inputs` block. The run\u2019s text is the transcript. Media on that turn is refused.',
					'`live` has no turn `inputs`. Channels sit on `live.ingress`: audio and video are on when omitted; text is off when omitted. At least one channel must be on.',
					'`decision` takes JSON state, not turn input.',
					'`host` takes no turns and no `inputs`. [Choosing a modality](/docs/modalities).',
				].join('\n\n'),
			},
			{
				id: 'live-ingress',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						"type: 'live',",
						'live: {',
						'\tingress: { audio: true, video: true, text: false },',
						'},',
					].join('\n'),
				},
			},
			{
				id: 'decision-inputs',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: ["type: 'decision',", "inputs: { state: 'json', maxStateBytes: 65_536 },"].join(
						'\n',
					),
				},
			},
			{
				id: 'refusals',
				kind: 'prose',
				title: 'Refusals',
				text: [
					'A channel that is not declared is refused. MIME outside `accept` is refused. Too many files, a file over `maxBytes`, or a turn over `maxTurnBytes` is refused.',
					'Speech with empty text is refused. A decision call with turn `input` is refused. Live refuses send on a disabled ingress channel. A slot key or choice outside the allowlist is refused.',
					'`role` on the turn picks the identity line. [Setting the identity](/docs/identity).',
				].join('\n\n'),
			},
		],
	},

	/* ------------------------------------------------------------------ */
	/*  outputs                                                            */
	/* ------------------------------------------------------------------ */
	{
		id: 'outputs',
		slug: 'outputs',
		title: 'Declaring outputs',
		topic: 'outputs',
		entry: 'src/kernel/registry/profiles.ts',
		kind: 'guide',
		summary:
			'Pin what comes back with outputs, image, or speech. Only one may be active per turn; omit outputs and the reply is free text.',
		cover: {
			src: '/imagery/th30_ambermeadow.png',
			alt: 'An amber meadow',
			kind: 'image',
		},
		questions: [
			{ question: 'How do I pin what comes back?' },
			{ question: 'Where do structured, image, and speech collide?' },
		],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'On `text`, `image`, and `speech` you may set `outputs`. Image and speech also pin their own block. That pin is the output for those types.',
			},
			{
				id: 'outputs-config',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						"type: 'text',",
						'outputs: {',
						"\tstructured: 'ticket.reply',",
						"\tstreaming: { mode: 'sse' },",
						'},',
					].join('\n'),
				},
			},
			{
				id: 'image-and-speech',
				kind: 'prose',
				title: 'Image and speech',
				text: [
					'`outputs` is optional. Leave it out on a text profile and the reply is free text on the stream.',
					'`text` may set `outputs` alone. `image` must set `image`, and may set `outputs` for streaming. `speech` must set `speech`, and may set `outputs` for streaming.',
					'Omit a pin field and the provider default applies. Leave `speech.format` unset and none is sent \u2014 the provider picks. Author `pcm` for WAV on both transports; `mp3` needs protocol `openAi`.',
					'`live` has no `outputs`. The session is the output. `decision` and `host` produce no turn output. [Choosing a modality](/docs/modalities).',
				].join('\n\n'),
			},
			{
				id: 'image-config',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						"type: 'image',",
						'image: {',
						"\taspectRatio: '1:1',",
						"\tmimeType: 'image/png',",
						'},',
					].join('\n'),
				},
			},
			{
				id: 'speech-config',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: ["type: 'speech',", 'speech: {', "\tvoice: 'Kore',", "\tformat: 'pcm',", '},'].join(
						'\n',
					),
				},
			},
			{
				id: 'mutual-exclusion',
				kind: 'prose',
				title: 'Mutual exclusion',
				text: 'Only one of a structured schema, image, or speech may be active on a turn. `assertOutputMode` refuses an image or speech profile with a non-null `outputs.structured` at resolve.',
			},
			{
				id: 'structured-schemas',
				kind: 'prose',
				title: 'Structured schemas',
				text: [
					'`outputs.structured` is a registered schema id, a slot map, or `null` for free text. Register the schema with `registerStructured` before the turn.',
					'The model is held to that JSON Schema on the wire. An unknown id fails when the turn resolves. The run emits a `structured` event when the reply parses as JSON.',
					'`outputs.validation` is host validators on dotted paths into that structured object. It requires a structured schema. Omit `maxRetries` and there are no repair turns after a reject.',
				].join('\n\n'),
			},
			{
				id: 'register-structured',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						"registerStructured('ticket.reply', {",
						'\tjsonSchema: {',
						"\t\ttype: 'object',",
						"\t\tproperties: { reply: { type: 'string' } },",
						"\t\trequired: ['reply'],",
						'\t},',
						'})',
					].join('\n'),
				},
			},
			{
				id: 'streaming',
				kind: 'prose',
				title: 'Streaming',
				text: '`outputs.streaming.mode` is `sse` or `buffered`. Omit it and Theorem streams. Set `streamThoughts` to `false` to drop `thought` events. Other events stay on the stream.',
			},
		],
	},

	/* ------------------------------------------------------------------ */
	/*  turn-behaviour                                                     */
	/* ------------------------------------------------------------------ */
	{
		id: 'turn-behaviour',
		slug: 'turn-behaviour',
		title: 'Setting turn behaviour',
		topic: 'turn-behaviour',
		entry: 'src/kernel/registry/profiles.ts',
		kind: 'guide',
		summary:
			'Continue is a new host turn after a cut stop. Inject is mid-turn host input through onStage. Neither is live session resumption.',
		cover: {
			src: '/imagery/th30_braidedriver.png',
			alt: 'A braided river',
			kind: 'image',
		},
		questions: [
			{ question: 'How do I continue a cut reply, and who may inject while it runs?' },
			{ question: 'Where does continue refuse me?' },
		],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'Continue is a **new host turn** after a cut stop. Inject is **mid-turn** host input through `onStage`. Neither is the model \u201ctrying again\u201d on its own, and neither is live session resumption (`live.sessionResumption` \u2014 [Choosing a modality](/docs/modalities)).',
			},
			{
				id: 'behaviour-config',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: ["type: 'text',", 'turnBehaviour: {', '\tallowSteering: true,', '},'].join('\n'),
				},
			},
			{
				id: 'continue',
				kind: 'prose',
				title: 'Continue',
				text: [
					'The stops that may continue are `length`, `stream_incomplete`, and `provider_error`. Tool, cancelled, completed, and filtered never do. The kernel does not loop \u2014 you send another `runTurn` with `continueFrom`.',
					'Leave `allowContinue` out and all three eligible kinds are allowed. Set it to `[]` for none. Leave `autoContinue` out and the host may continue once on its own for `length` and `stream_incomplete`. Set `autoContinue` to `[]` for none. Those lists guide the host; resolve does not refuse a continue just because the stop kind is off the list.',
					'On `text`, the continue turn takes no `input.text` \u2014 put the cut reply as the last assistant message in `input.history`. On `image` and `speech`, re-send the original request.',
					'`maxContinues` caps how many times one reply may be continued. Omit it and there is no cap. Once set, each continue must carry `continuation`.',
				].join('\n\n'),
			},
			{
				id: 'continue-from',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						'{',
						"\tcontinueFrom: { stop: { kind: 'length' } },",
						'\tcontinuation: 1,',
						'}',
					].join('\n'),
				},
			},
			{
				id: 'inject',
				kind: 'prose',
				title: 'Inject',
				text: 'Inject is mid-turn host input through `onStage` ([Running a turn](/docs/runner)). Leave `allowSteering` out, or set it true, and inject is allowed where the type supports it. Set it `false` and inject is refused.',
			},
			{
				id: 'where-continue-refuses',
				kind: 'prose',
				title: 'Where continue refuses you',
				text: [
					'`continueFrom` on a `live` profile (use `live.sessionResumption`). `maxContinues` set and `continuation` missing, below 1, or above the cap. `text` continue that still carries `input.text`.',
					'The tool-loop ceiling is `maxSteps` on the profile next to models \u2014 not under `turnBehaviour`. [Binding models](/docs/models).',
				].join('\n\n'),
			},
		],
	},

	/* ------------------------------------------------------------------ */
	/*  guardrails                                                         */
	/* ------------------------------------------------------------------ */
	{
		id: 'guardrails',
		slug: 'guardrails',
		title: 'Setting guardrails',
		topic: 'guardrails',
		entry: 'src/guardrails/mod.ts',
		kind: 'guide',
		summary:
			'Inbound sanitisation, canary tokens, and egress checks are profile policy. Three switches resolve on when omitted \u2014 the kernel ships the mechanism.',
		cover: {
			src: '/imagery/th30_copperandobsidian.png',
			alt: 'Copper and obsidian',
			kind: 'image',
		},
		questions: [
			{ question: 'What boundaries does Theorem put on a turn?' },
			{
				question:
					'At each boundary, which built-in runs, and what happens when it finds something?',
			},
		],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'Guardrails are checks Theorem runs on a turn at fixed boundaries \u2014 ingress, system line, egress, tool network and taint, decision disclosure, and (if you wire it) host quota. They differ from model \u201csafety\u201d settings, from app auth, and from a tool\u2019s own permission gate ([Registering tools](/docs/tools)).',
			},
			{
				id: 'guardrails-config',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						"type: 'text',",
						'guardrails: {',
						'\tsanitizeInput: true,',
						'\tredactSensitive: true,',
						'\tcanary: true,',
						'},',
					].join('\n'),
				},
			},
			{
				id: 'ingress',
				kind: 'prose',
				title: 'Ingress',
				text: 'Untrusted text toward the model is cleaned in place. `sanitizeInput` strips injection spans; `redactSensitive` redacts sensitive spans. The turn continues with the cleaned text \u2014 there is no separate refuse path on these two alone. Author-time `identity.system` is trusted and is not stripped.',
			},
			{
				id: 'canary',
				kind: 'prose',
				title: 'System line \u2014 canary',
				text: 'When canary is on, Theorem mints a per-turn token into the system prompt. On the way out, a leak is withheld or redacted. `speech` has no system channel \u2014 canary stays off.',
			},
			{
				id: 'egress',
				kind: 'prose',
				title: 'Egress',
				text: 'Omit `egress` and there is no host enforcer. Set `egress.enforce` and every user-visible release goes through it. `onBlock` chooses repair (`reject_to_agent`) or stop (`refuse_to_user`). Retries follow `maxRetries` (omit \u2192 0). Canary scan can still run outbound when a token was minted, even without a host enforcer.',
			},
			{
				id: 'network-and-taint',
				kind: 'prose',
				title: 'Network and taint',
				text: [
					'`network` gates tool URLs (scheme, private hosts, allowlist). A blocked URL fails the tool call.',
					'`taint.afterRemoteRead` limits how severe a later tool may be after untrusted remote content (`off` / `destructive` / `write`). Omit \u2192 off (report only). A block is `tainted_turn`.',
				].join('\n\n'),
			},
			{
				id: 'decision-and-quota',
				kind: 'prose',
				title: 'Decision and quota',
				text: [
					'`disclosure.enforce` runs only on `decision`, before state is sent. A block stops the decide call.',
					'`quota.perDay` is for host middleware. Exhausted quota is a public error line \u2014 not a `runTurn` refuse.',
				].join('\n\n'),
			},
			{
				id: 'try-without-model',
				kind: 'prose',
				title: 'Try without a model',
				text: 'Pass a sample string through `detectText` / `sanitizeText` (or the helpers under `@theoremjs/agents/guardrails/testing`) and read the cleaned text or hits. A hosted tester UI is not in the package yet.',
			},
		],
	},

	/* ------------------------------------------------------------------ */
	/*  traces                                                             */
	/* ------------------------------------------------------------------ */
	{
		id: 'traces',
		slug: 'traces',
		title: 'Recording traces',
		topic: 'traces',
		entry: 'src/observability/mod.ts',
		kind: 'guide',
		summary:
			'Recording is opt-in. Point writeTo at a registered destination and each recorded run becomes a TraceRecord. Omit the block and nothing is stored.',
		cover: {
			src: '/imagery/th30_mistyforest.png',
			alt: 'A misty forest',
			kind: 'image',
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
	},

	/* ------------------------------------------------------------------ */
	/*  statuses                                                           */
	/* ------------------------------------------------------------------ */
	{
		id: 'statuses',
		slug: 'statuses',
		title: 'Describing statuses',
		topic: 'statuses',
		entry: 'src/guardrails/lexicon.ts',
		kind: 'guide',
		summary:
			'Override person-facing status lines under lexicon. The copy a person reads changes \u2014 not whether a check runs or a tool pauses.',
		cover: {
			src: '/imagery/th30_lilacfog.png',
			alt: 'Lilac fog',
			kind: 'image',
		},
		questions: [
			{ question: 'How do I change the line a person sees when a check fires?' },
			{ question: 'Which overrides never fire for this modality?' },
		],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'Override person-facing status lines under `lexicon` (or once for the process with `overrideLexicon`). That changes the copy \u2014 not whether a check runs. [Setting guardrails](/docs/guardrails).',
			},
			{
				id: 'lexicon-config',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						"type: 'text',",
						'lexicon: {',
						"\t'error.auth': 'Sign in again to continue.',",
						"\t'canary.bind_note': 'Session token: {canary}',",
						'},',
					].join('\n'),
				},
			},
			{
				id: 'override-shape',
				kind: 'prose',
				title: 'Override shape',
				text: [
					'Omit `lexicon` and the package defaults apply. Profile lines win over `overrideLexicon`, which wins over the defaults.',
					'Keys are the closed list `LEXICON_KEYS`. An unknown key is refused at `defineProfile`. Placeholders in curly braces must stay when the default uses them \u2014 today `{canary}` on `canary.bind_note`.',
					'`lexicon` may sit on every modality. A key with no emit path on that type is inert. `continue.instruction` is only read on `text` continues.',
				].join('\n\n'),
			},
			{
				id: 'override-process',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: ['overrideLexicon({', "\t'egress.refusal': 'I cannot share that.',", '})'].join(
						'\n',
					),
				},
			},
			{
				id: 'host-resolution',
				kind: 'prose',
				title: 'Host resolution',
				text: [
					'Hosts resolve user-facing errors with `publicError`. Attachment refusals use `attachmentIssueText`. The browser interface only ships a subset (`CLIENT_LEXICON_KEYS`) \u2014 travel rule on [Building the interface](/docs/interface).',
					'Whether a check runs is on [Setting guardrails](/docs/guardrails). Whether a tool asks consent is on the tool. [Registering tools](/docs/tools). This page only changes the lines.',
				].join('\n\n'),
			},
		],
	},

	/* ------------------------------------------------------------------ */
	/*  runner                                                             */
	/* ------------------------------------------------------------------ */
	{
		id: 'runner',
		slug: 'runner',
		title: 'Running a turn',
		topic: 'runner',
		entry: 'src/kernel/engine/runner/mod.ts',
		kind: 'guide',
		summary:
			'Which door to call, what to pass, what the stream yields, and how a paused tool resumes. Four doors share one event family.',
		cover: {
			src: '/imagery/th30_canyon.png',
			alt: 'A canyon',
			kind: 'image',
		},
		suggest: { rank: 3 },
		questions: [
			{ question: 'Which door do I call, and what must I pass?' },
			{ question: 'What comes back on the stream, and where does a gate show up?' },
		],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: 'You already chose a modality and its door. [Choosing a modality](/docs/modalities). This page is the call itself: what to pass, what the stream yields, and how a paused tool resumes. It is not where you author the profile.',
			},
			{
				id: 'run-turn',
				kind: 'prose',
				title: 'runTurn',
				text: [
					'Pass a `TurnRequest` and a `ModelProvider` from `createProvider`. Optional third argument: a trace sink. [Recording traces](/docs/traces).',
					'Required: `profile` (registered id). For a normal user turn, `input` as the profile\u2019s inputs allow ([Declaring inputs](/docs/inputs)).',
					'Use `onStage` when the host must act at a stage. `pre_turn` may inject or abort. `pre_tool` may abort, deny, confirm, or mutate. `post_tool` may inject, abort, deny, or mutate. `before_end` may inject or abort. `post_turn` is read-only. `confirm` on `pre_tool` opens a gate. `mutate` replaces input or raw output and re-validates. Name an inject with `injectId` when you need it on the landing `stage` event.',
					'Also on the request when you need them: `model` / `effort`, `system`, `host`, `signal`, `credentials` / `resolveHost`, `continueFrom` / `continuation` ([Setting turn behaviour](/docs/turn-behaviour)), and trace fields (`traceparent`, `conversationId`, \u2026).',
				].join('\n\n'),
			},
			{
				id: 'run-turn-example',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						"import { createProvider, runTurn } from '@theoremjs/agents';",
						'',
						'const provider = createProvider(profile, {',
						'\topenAiGateway: { apiKey },',
						'});',
						'',
						'for await (const event of runTurn(',
						'\t{',
						'\t\tprofile: profile.id,',
						"\t\tinput: { text: 'Summarise the brief.' },",
						'\t\tonStage: (ctx) => {',
						"\t\t\tif (ctx.stage === 'pre_tool' && ctx.tool === 'payments.charge') {",
						'\t\t\t\treturn { confirm: true };',
						'\t\t\t}',
						'\t\t},',
						'\t},',
						'\tprovider,',
						')) {',
						"\tif (event.type === 'text') process.stdout.write(event.text);",
						"\tif (event.type === 'done') break;",
						'}',
					].join('\n'),
				},
			},
			{
				id: 'stream-and-gates',
				kind: 'prose',
				title: 'Stream and gates',
				text: [
					'You get `TurnEvent`s until `done` or `error`. Typical path: model output (`text`, `thought`, structured or media), then `tool` / `stage` / `guardrail` as they fire, then `done`.',
					"A gate is not a separate event type. The tool shows phase `gate`, then `done` with `stop.kind: 'gate'`. A normal finish is `completed`. Continue-eligible cuts include `length` and `stream_incomplete` ([Setting turn behaviour](/docs/turn-behaviour)).",
					'Resume with `invokeTool` \u2014 same name and input, the turn\u2019s `callId`, and `resume` when settling. HTTP surfaces that answer gates: [Building the interface](/docs/interface). `guardrail` on the stream is policy, not a stage return \u2014 [Setting guardrails](/docs/guardrails).',
				].join('\n\n'),
			},
			{
				id: 'invoke-resume',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						'for await (const event of invokeTool({',
						'\tprofile: profile.id,',
						"\tname: 'payments.charge',",
						'\tcallId,',
						'\tinput,',
						'\tresume: { granted: true },',
						'})) {',
						"\tif (event.type === 'done') break",
						'}',
					].join('\n'),
				},
			},
			{
				id: 'run-session',
				kind: 'prose',
				title: 'runSession',
				text: [
					'Same event family over a long-lived session. Options carry the Gemini transport; optional sink is the third argument.',
					'Gated tools settle on the session (`executeTool` / answer), not turn `invokeTool`. `onStage` is fixed at open. `gateTtlMs` defaults to thirty minutes. Use `snapshot` when a relay opens with tools resolved elsewhere.',
				].join('\n\n'),
			},
			{
				id: 'run-session-example',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						'const session = await runSession(',
						"\t{ profile: profile.id, system: 'Be brief.' },",
						'\t{ gemini },',
						')',
						'',
						'for await (const event of session.events()) {',
						'\t/* \u2026 */',
						'}',
					].join('\n'),
				},
			},
			{
				id: 'run-decision',
				kind: 'prose',
				title: 'runDecision',
				text: 'State and questions in; answers out. No transcript stream. Key or vault \u2014 and optional sink \u2014 sit on **options**.',
			},
			{
				id: 'run-decision-example',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						'const result = await runDecision(',
						'\t{',
						'\t\tprofile: profile.id,',
						"\t\tstate: { ticket: 'T-1042', priority: 'high' },",
						'\t\tquestions: {',
						'\t\t\troute: {',
						"\t\t\t\ttype: 'choice',",
						"\t\t\t\tinstructions: 'Where should this ticket go?',",
						'\t\t\t\tcriteria: {',
						"\t\t\t\t\tbilling: 'Payment or invoice.',",
						"\t\t\t\t\tsupport: 'Product help.',",
						"\t\t\t\t\tignore: 'Noise; no action.',",
						'\t\t\t\t},',
						'\t\t\t},',
						'\t\t},',
						'\t},',
						'\t{ apiKey },',
						')',
					].join('\n'),
				},
			},
			{
				id: 'invoke-alone',
				kind: 'prose',
				title: 'invokeTool alone',
				text: 'Run a registered tool with no model in front (or resume as above). `onStage` sees `pre_tool` / `post_tool` only.',
			},
			{
				id: 'what-breaks',
				kind: 'prose',
				title: 'What breaks',
				text: [
					'Profile or tools not registered. Empty provider credentials when the run needs them \u2014 [Binding models](/docs/models). A stage action the matrix does not allow. A live gate answered after TTL \u2014 `session.gate_expired`.',
					'Wrong door is a modality mistake \u2014 [Choosing a modality](/docs/modalities).',
				].join('\n\n'),
			},
		],
	},

	/* ------------------------------------------------------------------ */
	/*  interface                                                          */
	/* ------------------------------------------------------------------ */
	{
		id: 'interface',
		slug: 'interface',
		title: 'Building the interface',
		topic: 'interface',
		entry: 'src/interface/mod.ts',
		kind: 'concept',
		summary:
			'A headless projection of a profile, plus the React chat and live runners. The surface loads the same profile the host runs.',
		cover: {
			src: '/imagery/th30_terracedgarden.png',
			alt: 'A terraced garden',
			kind: 'image',
		},
		suggest: { rank: 4 },
		questions: [
			{
				question:
					'What must I mount and pass so turns run from the surface \u2014 and what breaks if the profile is live, tools are missing, or the provider vault is empty?',
			},
			{
				question:
					'When a tool pauses for approval or sign-in, what reaches the browser, and how does the host answer?',
			},
		],
		blocks: [
			{
				id: 'lede',
				kind: 'lede',
				text: [
					'Keep your UI and backend in sync with the Theorem interface. Agent profiles already say what the agent is, what it may take in, which tools and models it may use, and how it should speak when something goes wrong. The interface is that same profile as a surface can load it \u2014 so what the person sees matches what the host runs.',
					'That differs from copying profile fields into the client by hand. `@theoremjs/agents/interface` builds `ProfileInterface`. `@theoremjs/react` is one packaging (transport, hooks, handler, ready-made layouts). React is not the contract. Turn surfaces, live stages, and others you build all load the same idea.',
				].join('\n\n'),
			},
			{
				id: 'before-you-begin',
				kind: 'prose',
				title: 'Before you begin',
				text: 'Profile defined and registered; tools in `allow` registered on the scope. [Registering tools](/docs/tools). The mount below is the **turn** path. Live uses a different door \u2014 [Choosing a modality](/docs/modalities) \u00b7 [Running a turn](/docs/runner).',
			},
			{
				id: 'mount',
				kind: 'prose',
				title: 'Mount a turn surface',
				text: [
					'Mount `createTheoremHandler` on a catch-all route. Point any turn client at that base (default `/api/theorem`).',
					'`GET` returns `{ interface }`. `POST \u2026/turn`, `/invoke`, and `/steer` drive the run. Bind controls to `iface` (inputs, `tools.allow`, models, lexicon, `allowSteering`) \u2014 do not re-author those fields in the client. [Declaring inputs](/docs/inputs) \u00b7 [Describing statuses](/docs/statuses).',
					'A packaged turn layout is one option on the same endpoint (`TheoremChat` from `@theoremjs/react/ui`). Live\u2019s packaged layout is `LiveRunner` \u2014 not this handler. For own auth or several instances, pass `session`, shared `sessionStore` / `credentialStore` / `steerInbox`, and optional `gateTtlMs`.',
				].join('\n\n'),
			},
			{
				id: 'handler-example',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						"import { createTheoremHandler } from '@theoremjs/react/server';",
						'',
						'export const handler = createTheoremHandler({',
						'\tprofile,',
						'\tprovider: { openAiGateway: { apiKey } },',
						'});',
					].join('\n'),
				},
			},
			{
				id: 'client-example',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						"import { createHttpTransport, useTheoremChat, useTheoremInterface } from '@theoremjs/react';",
						'',
						'export function Example() {',
						"\tconst transport = createHttpTransport({ endpoint: '/api/theorem' });",
						'\tconst { iface } = useTheoremInterface(transport);',
						'\tconst session = useTheoremChat({ transport, iface });',
						'\treturn { iface, session };',
						'}',
					].join('\n'),
				},
			},
			{
				id: 'interface-breaks',
				kind: 'prose',
				title: 'What breaks',
				text: [
					'`live` or `host` on this handler \u2014 throws at create. Tools never registered \u2014 allow names never become calls. Empty provider credentials when the turn needs them \u2014 [Binding models](/docs/models).',
					'Session or auth missing \u2014 the person cannot start a turn. Several instances without shared stores \u2014 gates disagree across machines.',
				].join('\n\n'),
			},
			{
				id: 'tool-pauses',
				kind: 'prose',
				title: 'When a tool pauses',
				text: [
					'The stream marks the tool as gated; the surface shows an approval or sign-in ask. The client posts to `/invoke`; the host settles and resumes.',
					'A new message while a gate waits walks that gate away. A late answer after `gateTtlMs` is refused. [Running a turn](/docs/runner).',
				].join('\n\n'),
			},
			{
				id: 'invoke-example',
				kind: 'code',
				source: {
					from: 'literal',
					lang: 'ts',
					code: [
						'await transport.invoke(',
						"\t{ gateId, decision: 'approve' },",
						'\tonEvent,',
						')',
					].join('\n'),
				},
			},
		],
	},
];
