import type { DocArticleDef } from '../schema';

export const identity: DocArticleDef = {
	slug: 'identity',
	updated: '2026-10-03',
	title: 'Setting the identity',
	entry: 'src/kernel/registry/profiles.ts',
	summary:
		'Handle is the name a person sees; system is what the model reads. Set both under identity, and use role lines when turns differ.',
	cover: {
		src: '/imagery/th30_amethyst.png',
		alt: 'Amethyst seams in a grey cliff',
		position: '0% 100%',
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
			id: 'private-parts',
			kind: 'prose',
			title: 'Private and shareable parts',
			text: [
				'`system` is a string or a list of parts, sent joined as written. A string, or a list with no `{ private }` part, is private throughout: a reply that repeats 12 words in a row of it is stopped (`guardrails.promptEcho`, on with the canary).',
				'Mark what must not leak as `{ private: text }` and the plain parts beside them become shareable \u2014 a greeting or voice line the agent says word for word no longer stops the reply. Marks hold per source: marking the run-time `system` leaves the profile\u2019s line private. Theorem\u2019s own notes are always private. A paraphrase is not caught, and secrets never belong in the prompt.',
				'In the [playground](/playground) you write the prompt as one text and wrap each private section as `{private: \u2026}`; the exported profile has the parts.',
			].join('\n\n'),
		},
		{
			id: 'private-parts-config',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				code: [
					'system: [',
					'\t\'Greet with: "Thanks for calling Harbor, how can I help?" \',',
					"\t{ private: 'Refunds over $200 need a supervisor code.' },",
					'],',
				].join('\n'),
			},
		},
		{
			id: 'run-time-system',
			kind: 'prose',
			title: 'Run-time system',
			text: 'A `system` on `runTurn` or `runSession` is appended after the profile\u2019s line, with a blank line between. The profile line is author-time. The run line is assembled for that call. The model gets the role-resolved line, then the run-time line.',
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
};
