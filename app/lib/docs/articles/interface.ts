import type { DocArticleDef } from '../schema';

export const interfaceChapter: DocArticleDef = {
	slug: 'interface',
	updated: '2026-09-30',
	title: 'Building the interface',
	entry: 'src/interface/mod.ts',
	summary:
		'A headless projection of a profile, plus the React chat and live runners. The surface loads the same profile the host runs.',
	cover: {
		src: '/imagery/th30_terracedgarden.png',
		alt: 'A terraced garden',
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
};
