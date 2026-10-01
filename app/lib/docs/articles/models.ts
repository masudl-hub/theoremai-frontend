import type { DocArticleDef } from '../schema';

export const models: DocArticleDef = {
	slug: 'models',
	updated: '2026-10-01',
	title: 'Binding models',
	entry: 'src/providers/mod.ts',
	summary:
		'A binding is protocol, provider, and apiId under a name. Legal pairs are a catalog table; the pair, pick, or key fails closed.',
	cover: {
		src: '/imagery/th30_midnightblueberries.png',
		alt: 'Blueberry bushes at night',
		position: '0% 95%',
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
};
