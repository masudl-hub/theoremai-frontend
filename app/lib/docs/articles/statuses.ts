import type { DocArticleDef } from '../schema';

export const statuses: DocArticleDef = {
	slug: 'statuses',
	updated: '2026-10-01',
	title: 'Describing statuses',
	entry: 'src/guardrails/lexicon.ts',
	summary:
		'Override person-facing status lines under lexicon. The copy a person reads changes \u2014 not whether a check runs or a tool pauses.',
	cover: {
		src: '/imagery/th30_corals.png',
		alt: 'Coral reefs in turquoise water',
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
				code: ['overrideLexicon({', "\t'egress.refusal': 'I cannot share that.',", '})'].join('\n'),
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
};
