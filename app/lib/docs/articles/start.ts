import type { DocArticleDef } from '../schema';

export const start: DocArticleDef = {
	slug: 'start',
	updated: '2026-10-05',
	title: 'Getting started',
	entry: 'src/kernel/engine/runner/mod.ts',
	covers: ['mod.ts', 'src/kernel/engine/runner', 'src/kernel/registry/profiles.ts'],
	summary:
		'Run your first agent turn in about 20 lines, see how the guide fits together, then read the full Harbor desk program.',
	cover: {
		src: '/imagery/th30_emeraldriver.png',
		alt: 'A green river through red canyons',
		position: '100% 100%',
	},
	suggest: { rank: 1 },
	questions: [
		{ question: 'Why define a profile instead of writing a prompt?' },
		{ question: 'How do I run my first turn?' },
	],
	blocks: [
		{
			id: 'lede',
			kind: 'lede',
			text: [
				'Use Theorem when your application runs an AI agent and the agent must do the same thing on every turn. You write the agent once, as a **profile**. Theorem checks the profile and runs every request from it.',
				'A profile names the model, the tools, what the agent accepts and what it returns. A prompt that you rebuild on each call can drift from what you meant. A profile cannot drift, because it is the only place that describes the agent.',
			].join('\n\n'),
		},
		{
			id: 'install',
			kind: 'code',
			title: 'Install',
			source: {
				from: 'literal',
				lang: 'bash',
				code: 'npm install @theoremjs/agents zod',
			},
		},
		{
			id: 'install-deno',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'bash',
				code: 'deno add jsr:@theoremjs/agents',
			},
		},
		{
			id: 'first-turn',
			kind: 'prose',
			title: 'Run your first turn',
			text: [
				'This program defines one agent and asks it one question. It needs an OpenRouter key in `OPENROUTER_API_KEY`.',
				'The profile does not hold the key. It names a **key slot**, `openrouter`. You fill the slot in a **vault**, an object that maps slot names to keys. [Binding models](/docs/models) explains why.',
			].join('\n\n'),
		},
		{
			id: 'first-turn-code',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				code: [
					"import { createProvider, defineProfile, registerProfile, runTurn } from '@theoremjs/agents';",
					'',
					'const desk = defineProfile({',
					"\ttype: 'text',",
					"\tid: 'harbor.desk',",
					"\tkey: 'openrouter',",
					"\tidentity: { handle: 'desk', system: 'You are the Harbor front desk. Answer in short sentences.' },",
					'\tmodels: {',
					"\t\tmain: { protocol: 'openAi', provider: 'openrouter', apiId: 'openrouter/free' },",
					'\t},',
					'\ttools: { allow: [] },',
					'\tinputs: { text: true },',
					'});',
					'registerProfile(desk);',
					'',
					'const provider = createProvider(desk, {',
					'\tvault: { openrouter: process.env.OPENROUTER_API_KEY },',
					'});',
					'',
					'for await (const event of runTurn(',
					"\t{ profile: desk.id, input: { text: 'Where do I find hold H-2291?' } },",
					'\tprovider,',
					')) {',
					"\tif (event.type === 'text') process.stdout.write(event.text);",
					'}',
				].join('\n'),
			},
		},
		{
			id: 'first-turn-steps',
			kind: 'prose',
			title: 'What the program does',
			text: [
				'1. `defineProfile` checks the profile. It throws if a field is missing or does not belong to the type.',
				'2. `registerProfile` stores the profile under its `id`, so a request can name it.',
				'3. `createProvider` binds the profile to its model and the vault.',
				'4. `runTurn` runs one turn and yields events. A `text` event carries a piece of the reply.',
			].join('\n'),
		},
		{
			id: 'journey',
			kind: 'prose',
			title: 'How the guide fits together',
			text: 'The guide follows the order in which you build an agent. Each step has one page.',
		},
		{
			id: 'journey-map',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'text',
				code: [
					'┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐\n│ 1. DEFINE         │   │ 2. RUN            │   │ 3. SHOW AND WATCH │\n│ defineProfile     │─► │ createProvider    │─► │ handler and UI    │\n│ one profile says  │   │ runTurn           │   │ statuses          │\n│ what the agent is │   │ events and gates  │   │ traces            │\n└───────────────────┘   └───────────────────┘   └───────────────────┘',
				].join('\n'),
			},
		},
		{
			id: 'harbor',
			kind: 'prose',
			title: 'See a full profile',
			text: [
				'The Harbor desk below uses more of the profile. It reads a photo or PDF, looks up a hold on a shipment, measures a road leg and answers in a fixed JSON shape. Each later page explains one part of it.',
				'The profile sets no `guardrails`, so input cleaning, sensitive-data redaction and the canary stay on.',
			].join('\n\n'),
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
		{ id: 'try', kind: 'embed.playground', seed: 'firstTurn' },
	],
};
