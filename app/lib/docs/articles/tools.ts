import type { DocArticleDef } from '../schema';

export const tools: DocArticleDef = {
	slug: 'tools',
	updated: '2026-09-30',
	title: 'Registering tools',
	entry: 'src/kernel/tools/mod.ts',
	summary:
		'Register tools once on the scope, then allow them by name on the profile. Builtins sit on the model binding, not the allow list.',
	cover: {
		src: '/imagery/th30_roads.png',
		alt: 'Crossing roads through a field',
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
};
