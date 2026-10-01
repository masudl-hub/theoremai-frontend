import type { DocArticleDef } from '../schema';

export const guardrails: DocArticleDef = {
	slug: 'guardrails',
	updated: '2026-10-01',
	title: 'Setting guardrails',
	entry: 'src/guardrails/mod.ts',
	summary:
		'Inbound sanitisation, canary tokens, and egress checks are profile policy. Three switches resolve on when omitted \u2014 the kernel ships the mechanism.',
	cover: {
		src: '/imagery/th30_obsidianshores.png',
		alt: 'Black rocks where the surf meets the shore',
		position: '100% 0%',
	},
	questions: [
		{ question: 'What boundaries does Theorem put on a turn?' },
		{
			question: 'At each boundary, which built-in runs, and what happens when it finds something?',
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
};
