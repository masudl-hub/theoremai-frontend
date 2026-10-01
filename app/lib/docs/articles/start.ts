import type { DocArticleDef } from '../schema';

export const start: DocArticleDef = {
	slug: 'start',
	updated: '2026-09-30',
	title: 'Getting started',
	entry: 'src/kernel/engine/runner/mod.ts',
	summary:
		'Why a typed profile beats rebuilding the prompt each call, then a Harbor front desk that runs one turn on the wire.',
	cover: {
		src: '/imagery/th30_wildflowerroad.png',
		alt: 'A wildflower road',
	},
	suggest: { rank: 1 },
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
};
