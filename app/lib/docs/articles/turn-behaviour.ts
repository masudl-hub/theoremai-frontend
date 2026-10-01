import type { DocArticleDef } from '../schema';

export const turnBehaviour: DocArticleDef = {
	slug: 'turn-behaviour',
	updated: '2026-10-01',
	title: 'Setting turn behaviour',
	entry: 'src/kernel/registry/profiles.ts',
	summary:
		'Continue is a new host turn after a cut stop. Inject is mid-turn host input through onStage. Neither is live session resumption.',
	cover: {
		src: '/imagery/th30_nightide.png',
		alt: 'A night tide along a wooded shore',
		position: '0% 0%',
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
};
