import type { DocArticleDef } from '../schema';

export const guardrails: DocArticleDef = {
	slug: 'guardrails',
	updated: '2026-10-05',
	title: 'Setting guardrails',
	entry: 'src/guardrails/mod.ts',
	covers: ['src/guardrails'],
	summary:
		'Choose which checks run on a turn: input cleaning, the system-prompt canary, reply checks, tool limits and a daily quota.',
	cover: {
		src: '/imagery/th30_obsidianshores.png',
		alt: 'Black rocks where the surf meets the shore',
		position: '100% 0%',
	},
	questions: [
		{ question: 'Which guardrails run when I set nothing?' },
		{ question: 'How do I check a reply before the user sees it?' },
		{ question: 'How do I protect the system prompt?' },
		{ question: 'How do I limit what tools can read and reach?' },
		{ question: 'How do I limit the turns per day?' },
		{ question: 'Which guardrails does each agent type take?' },
	],
	blocks: [
		{
			id: 'lede',
			kind: 'lede',
			text: 'Guardrails keep injected instructions, secrets and leaks out of a turn. Each guardrail is a field under `guardrails` on the profile. Four run when you set nothing: `sanitizeInput`, `redactSensitive`, `canary` and `promptEcho`. The reply check, `egress`, runs only when you set it.',
		},
		{
			id: 'defaults-table',
			kind: 'table',
			title: 'Know the defaults',
			text: 'Guardrail | Without a setting | What it does\n--- | --- | ---\n`sanitizeInput` | On | Replaces injection phrasing in what goes in\n`redactSensitive` | On, every group | Replaces credentials and personal data in what goes in\n`canary` | On | Catches a reply that repeats a secret token from the system prompt\n`promptEcho` | On | Catches a reply that repeats 12 words in a row from the system prompt\n`egress` | No check | Checks each reply before the user sees it\n`network` | `https` only, no private addresses | Limits what HTTP and MCP tools reach\n`taint` | `off` | Limits tool calls after a remote read\n`quota` | No limit | Limits turns per day\n`disclosure` | No check | Checks decision state before it goes to the model',
		},
		{
			id: 'check-reply',
			kind: 'prose',
			title: 'Check the reply',
			text: 'Set `egress` to check each reply before the user sees it. `checks: true` runs the bundled checks at their defaults. `onBlock` says what happens when a check stops a reply.',
		},
		{
			id: 'egress-example',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				frame: 'profile:text',
				code: [
					'guardrails: {',
					"\tegress: { checks: true, onBlock: 'refuse_to_user' },",
					'},',
				].join('\n'),
			},
		},
		{
			id: 'on-block',
			kind: 'prose',
			title: 'Choose what happens when a check stops a reply',
			text: [
				'With `refuse_to_user`, the user reads the `egress.refusal` line in place of the reply, and the turn ends.',
				'With `reject_to_agent`, the model reads why and writes the reply again. If you omit `onBlock`, Theorem uses `reject_to_agent`.',
				'For `reject_to_agent`, `maxRetries` sets how many times the model may rewrite. If you omit it, the value is 0. Theorem then withholds the reply, and the user reads the `error.safety` line.',
			].join('\n\n'),
		},
		{
			id: 'pick-checks',
			kind: 'prose',
			title: 'Pick the bundled checks',
			text: 'Pass an object to `checks` to switch single checks. A check you leave out keeps its default. All checks run by default except `links`.',
		},
		{
			id: 'checks-example',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				frame: 'guardrails',
				code: [
					'egress: {',
					"\tchecks: { links: true, images: { hosts: ['cdn.example.com'] } },",
					'},',
				].join('\n'),
			},
		},
		{
			id: 'checks-detail',
			kind: 'prose',
			title: 'What each check stops',
			text: [
				'`sensitive` stops credentials and personal data in the reply, by group: `ids`, `financial`, `network` and `credentials`. In a reply, `network` is off by default, because replies cite addresses.',
				'`boundary` stops a reply that repeats the markers Theorem puts around user data. `injection` stops injection phrasing.',
				'`images` stops an image that loads a URL the model never saw, because the image can carry data to that server. `links` does the same for links. `hosts` lists hostnames that always pass. A URL that a tool returned counts as given unless you set `fromTools` to `false`.',
				'To write your own check, set `enforce` in place of `checks`. Your function returns `allow`, `flag`, `redact` or `block`. `defineProfile` refuses an `egress` that sets both or neither.',
			].join('\n\n'),
		},
		{
			id: 'own-check',
			kind: 'prose',
			title: 'Write your own egress check',
			text: [
				'Most hosts turn on the bundled checks with `egress.checks`. If your host has rules of its own, start from `standardEgressEnforce` and add your rule after it. Your function sees every outbound payload (streamed text, structured JSON and live transcripts), the stage and the canary. It returns one of four verdicts.',
				'`allow` releases the payload as it is. `flag` releases it with a `guardrail` event for review. `redact` releases your rewritten text in its place. `block` follows `onBlock`: `reject_to_agent` sends the rejection back to the model for up to `maxRetries` repair rounds, and `refuse_to_user` shows the lexicon’s `egress.refusal`. When the retries run out, the turn is withheld.',
				'The checks fail closed. A payload that cannot be scanned, or an enforcer that throws, counts as a block (`egress.enforcer-error`). It never counts as an allow.',
			].join('\n\n'),
		},
		{
			id: 'own-check-example',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				code: [
					"import { type EgressEnforcer, standardEgressEnforce } from '@theoremjs/agents';",
					'',
					'// Standard checks first, then hide internal incident ids from customers.',
					'export const egress: EgressEnforcer = (payload, ctx) => {',
					'\tconst standard = standardEgressEnforce(payload, ctx);',
					"\tif (standard.action !== 'allow') return standard;",
					"\tconst text = payload.text.replace(/\\bINC-\\d{6}\\b/g, '[internal incident]');",
					'\tif (text === payload.text) return standard;',
					"\treturn { action: 'redact', text, hits: [{ rule: 'host.internal-incident-id', severity: 'low' }] };",
					'};',
					'',
					"// guardrails: { egress: { enforce: egress, onBlock: 'reject_to_agent', maxRetries: 2 } }",
				].join('\n'),
			},
		},
		{
			id: 'own-check-compiled',
			kind: 'prose',
			text: 'If your rules only block, use `egressPolicy` in place of a function. It holds them as exactly as the standard checks do. Run `agents egress-compile ./rules.ts --out ./rules.compiled.ts` to compile your regexes at build time. Then run `egressPolicy({ rules, compiled: compiledEgressRules })` beside the standard checks.',
			title: 'Compile rules at build time',
		},
		{
			id: 'streaming-holdback',
			kind: 'prose',
			title: 'What streaming holds back',
			text: [
				'Streaming does not turn the checks off. Theorem releases text only after it clears them. A **progressive yield** window holds back the end of the output, so a secret that arrives in two chunks cannot leave in its first half. The check in use sets how much the window holds.',
				'With the canary only, the window holds a tail of 4 or more characters that could still start a leak. This is usually nothing, so the text streams almost at once. A blocked leak shows at most 3 characters.',
				'With the bundled `egress.checks`, or an `egressPolicy`, the window holds only the text that could still become a match. A blocked match shows none of its characters.',
				'With your own `egress.enforce`, the window holds `egress.holdback` characters. The default is 256, or 96 on a live session, where held transcript also holds its audio.',
				'The verdict at the end of the attempt is final. Text that was held back and then cleared is released, not dropped.',
			].join('\n\n'),
		},
		{
			id: 'thoughts-and-live',
			kind: 'prose',
			title: 'Thoughts and live audio',
			text: [
				'A thought that trips a guardrail is edited, never stopped. Set `outputs.streaming.streamThoughts` to show thoughts to your user. Each thought then arrives with the canary, the system-prompt echo, the user-data markers, and any image or link that the bundled checks would block, swapped for a placeholder. A `guardrail` event at stage `thought` reports the swap. The rest of the thought streams on.',
				'In a live session, the transcript of the spoken reply goes through the same window. A native-audio model sends its transcript after its audio, with no timing. A guarded profile therefore holds each audio chunk until the transcript of its own message has passed, or until the next transcript when the message has none. A profile is guarded when it has a canary or `egress.enforce`.',
				'The held chunk then streams, so its words are read before they are heard. What the user heard before a later hit stays heard. The gate withholds from the hit onward.',
				'A guarded live profile always asks the provider for the output transcript: it forces `live.transcription.output` on. Audio from a reply that has no transcript is dropped, not played. A profile with neither a canary nor `egress.enforce` streams audio as it arrives.',
			].join('\n\n'),
		},
		{
			id: 'system-prompt',
			kind: 'prose',
			title: 'Protect the system prompt',
			text: [
				'`canary` adds a secret token to the end of the system instruction. A reply that repeats the token is a leak. `promptEcho` also counts 12 words in a row from the system instruction as a leak.',
				'Without `egress`, a leak ends the turn, and the user reads the `error.safety` line. With `egress`, `onBlock` decides.',
				'A speech profile has no system prompt, so its canary is always off.',
			].join('\n\n'),
		},
		{
			id: 'clean-input',
			kind: 'prose',
			title: 'Clean what goes in',
			text: [
				'`sanitizeInput` replaces injection phrasing with a marker. `redactSensitive` does the same for credentials and personal data. Both clean the input text, slots, history, the turn’s `system` text and tool results. The turn then continues with the cleaned text.',
				'`identity.system` is your own text, so Theorem does not clean it.',
				'`redactSensitive` takes `true`, `false` or an object that switches single groups. On input, every group is on by default, including `network`.',
			].join('\n\n'),
		},
		{
			id: 'redact-example',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				frame: 'profile:text',
				code: ['guardrails: {', '\tredactSensitive: { network: false },', '},'].join('\n'),
			},
		},
		{
			id: 'tool-results',
			kind: 'prose',
			title: 'Treat remote tool results as data',
			text: [
				'A tool result can be the way an attack gets in. Theorem treats remote content as data, never as an instruction.',
				'**Provenance.** Each result records where it came from (`local`, `builtin`, `http`, `mcp` or `delegated`) and how deep the call chain went.',
				'**Fencing.** Remote results reach the model inside `<tool_data tool="..." origin="...">`. Theorem first strips any forged `tool_data` marker from the body, so content cannot claim a friendlier origin than it has.',
				'**Directive advisory.** Some content names a tool that the model can call, gives the agent orders, or claims authority that it cannot have, and points at an external address or URL. That content gets an `advisory` attribute, a short notice, and your lexicon line `advisory.guidance` ([Describing statuses](/docs/statuses)). The advisory informs the model. It does not block.',
				'**Argument inspection.** Theorem scans the model’s arguments before the tool runs. A credential-shaped value that is about to leave as a parameter raises a `tool_call.sensitive-argument` event. Theorem reports it and does not rewrite it.',
				'**Redaction.** The result, its structured data and its failure messages go through the same detection as user input before the model reads them.',
			].join('\n\n'),
		},
		{
			id: 'network',
			kind: 'prose',
			title: 'Limit what tools can reach',
			text: [
				'`network` sets which addresses your HTTP and MCP tools may reach. By default, Theorem refuses private and loopback addresses and any scheme except `https`. It checks each redirect too.',
				'For local development, set `allowPrivateNetworks: true`. Tools may then reach local addresses over `http` or `https`. `allowedHosts` names hosts that may resolve to a private address. `allowedSchemes` replaces the list of schemes.',
			].join('\n\n'),
		},
		{
			id: 'taint',
			kind: 'prose',
			title: 'Limit tools after a remote read',
			text: [
				'The result of an HTTP tool, an MCP tool or another agent can hold text that tries to steer the agent. Set `taint.afterRemoteRead` to refuse risky tool calls after such a read.',
				"`destructive` refuses calls to tools with `access: 'destructive'`. `write` also refuses `read-write` tools. The default, `off`, only records the call. A refused call returns the failure code `tainted_turn`.",
			].join('\n\n'),
		},
		{
			id: 'quota',
			kind: 'prose',
			title: 'Limit turns per day',
			text: [
				'`quota.perDay` sets how many turns each client IP may run on one profile per UTC day. `runTurn` does not count turns ([Running a turn](/docs/runner)). Your server middleware calls `takeSlot(profile, ip, now)` before a turn and `releaseSlot(profile, ip)` after it.',
				'`takeSlot` returns `ok`, `busy`, `quota` or `not_configured`. `busy` means that the client has a turn running on this profile. `quota` means that the day\u2019s turns are used. For `quota`, `quotaExhausted(profile)` returns a `rate_limit` error that carries the `quota.exhausted` line. `releaseSlot` frees the slot but does not give the turn back.',
			].join('\n\n'),
		},
		{
			id: 'disclosure',
			kind: 'prose',
			title: 'Check state before a decision',
			text: 'A decision profile sets `disclosure.enforce`. `runDecision` calls it before it sends the state to the model. Your function returns `allow` or `block`. On `block`, `runDecision` fails with the code `disclosure_blocked`.',
		},
		{
			id: 'which-profiles',
			kind: 'table',
			title: 'Which profiles take which guardrail',
			text: 'Guardrail | `text`, `image` | `live` | `speech` | `host` | `decision`\n--- | --- | --- | --- | --- | ---\n`sanitizeInput`, `redactSensitive` | Yes | Yes | Yes | Yes | No\n`canary`, `promptEcho` | Yes | Yes | Off only | No | No\n`egress`, `taint` | Yes | Yes | No | No | No\n`network` | Yes | Yes | No | Yes | No\n`quota` | Yes | Yes | Yes | No | No\n`disclosure` | No | No | No | No | Yes',
		},
		{
			id: 'which-note',
			kind: 'prose',
			title: 'Know what defineProfile refuses',
			text: '`defineProfile` refuses any other field with a `config` error. A speech profile has no system prompt, so it takes `canary: false` only.',
		},
		{
			id: 'try-without-model',
			kind: 'prose',
			title: 'Try the input checks without a model',
			text: 'Pass a string to `detectText` to see what the input checks do. It returns the cleaned `text` and the `hits`. For `Ignore all previous instructions.`, `text` is `[omitted - injection].` and the hit rule is `sanitize.injection`. The `@theoremjs/agents/guardrails/testing` entry exports Theorem’s attack corpus and fuzz runners.',
		},
	],
};
