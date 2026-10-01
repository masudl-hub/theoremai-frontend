import type { DocArticleDef } from '../schema';

export const inputs: DocArticleDef = {
	slug: 'inputs',
	updated: '2026-10-01',
	title: 'Declaring inputs',
	entry: 'src/kernel/registry/profiles.ts',
	summary:
		'Declare what a turn may carry \u2014 text, files, voice, or state \u2014 and which channels close by type. Refused means the door said no.',
	cover: {
		src: '/imagery/th30_cobaltwaves.png',
		alt: 'Cobalt waves on a black beach',
		position: '0% 81%',
	},
	questions: [
		{ question: 'What must I declare before a turn can carry text, files, voice, or state?' },
		{ question: 'What gets refused at the door?' },
	],
	blocks: [
		{
			id: 'lede',
			kind: 'lede',
			text: 'On `text` and `image` you declare turn inputs under `inputs`. Other types use a different door.',
		},
		{
			id: 'inputs-config',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				code: [
					"type: 'text',",
					'inputs: {',
					'\ttext: true,',
					"\tattachments: { accept: ['image/*', 'application/pdf'] },",
					'\tmaxFiles: 4,',
					'\tmaxBytes: 5_000_000,',
					'\tmaxTurnBytes: 12_000_000,',
					'},',
				].join('\n'),
			},
		},
		{
			id: 'text-and-attachments',
			kind: 'prose',
			title: 'Text and attachments',
			text: [
				'`inputs` is required on `text`, `image`, and `decision`.',
				'Leave `inputs.text` out and text is accepted. Set it to `false` and a turn with text is refused.',
				'Attachments and voice need an `accept` list and all three size caps: `maxFiles`, `maxBytes`, and `maxTurnBytes`. Omit the media block and that channel is closed. `inputs.voice` exists only on `text`. An `image` profile\u2019s attachments stay inside images, video, and PDF.',
			].join('\n\n'),
		},
		{
			id: 'slots',
			kind: 'prose',
			title: 'Slots',
			text: '`inputs.slots` names turn selectors and their allowed choices. `assertTurnSlots` refuses a turn value outside that list, or a slot the profile did not declare.',
		},
		{
			id: 'other-modalities',
			kind: 'prose',
			title: 'Other modalities',
			text: [
				'`speech` has no `inputs` block. The run\u2019s text is the transcript. Media on that turn is refused.',
				'`live` has no turn `inputs`. Channels sit on `live.ingress`: audio and video are on when omitted; text is off when omitted. At least one channel must be on.',
				'`decision` takes JSON state, not turn input.',
				'`host` takes no turns and no `inputs`. [Choosing a modality](/docs/modalities).',
			].join('\n\n'),
		},
		{
			id: 'live-ingress',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				code: [
					"type: 'live',",
					'live: {',
					'\tingress: { audio: true, video: true, text: false },',
					'},',
				].join('\n'),
			},
		},
		{
			id: 'decision-inputs',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				code: ["type: 'decision',", "inputs: { state: 'json', maxStateBytes: 65_536 },"].join('\n'),
			},
		},
		{
			id: 'refusals',
			kind: 'prose',
			title: 'Refusals',
			text: [
				'A channel that is not declared is refused. MIME outside `accept` is refused. Too many files, a file over `maxBytes`, or a turn over `maxTurnBytes` is refused.',
				'Speech with empty text is refused. A decision call with turn `input` is refused. Live refuses send on a disabled ingress channel. A slot key or choice outside the allowlist is refused.',
				'`role` on the turn picks the identity line. [Setting the identity](/docs/identity).',
			].join('\n\n'),
		},
	],
};
