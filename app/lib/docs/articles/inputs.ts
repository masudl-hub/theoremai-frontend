import type { DocArticleDef } from '../schema';

export const inputs: DocArticleDef = {
	slug: 'inputs',
	updated: '2026-10-05',
	title: 'Declaring inputs',
	entry: 'src/kernel/registry/profiles.ts',
	summary:
		'Declare what a turn may send: text, files, voice or choices. Theorem refuses any turn that sends more than the profile declares.',
	cover: {
		src: '/imagery/th30_cobaltwaves.png',
		alt: 'Cobalt waves on a black beach',
		position: '0% 81%',
	},
	questions: [
		{ question: 'How do I let a turn send text, files or voice?' },
		{ question: 'How do I limit the size and the number of files?' },
		{ question: 'How do I make a turn pick from a fixed list?' },
		{ question: 'How do live, speech and decision agents take input?' },
		{ question: 'Why did Theorem refuse a turn, and what do I change?' },
	],
	blocks: [
		{
			id: 'lede',
			kind: 'lede',
			text: 'Use `inputs` to declare what one turn of a `text` or `image` agent may send. A turn that sends more than the profile declares is refused. This profile accepts text, PDF and image files, and nothing else.',
		},
		{
			id: 'inputs-config',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				frame: 'profile:text',
				code: [
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
			id: 'text',
			kind: 'prose',
			title: 'Accept text',
			text: [
				'A `text` or `image` profile must set `inputs`. A profile that leaves `inputs.text` out accepts text.',
				'Set `inputs.text` to `false` to refuse text.',
			].join('\n\n'),
		},
		{
			id: 'files',
			kind: 'prose',
			title: 'Accept files',
			text: [
				'Set `inputs.attachments.accept` to the file types a turn may send. A file type is a MIME type, such as `application/pdf`. A type such as `image/*` matches a whole family.',
				'A profile without `attachments` accepts no files.',
				'A profile with `attachments` or `voice` must also set `maxFiles`, `maxBytes` and `maxTurnBytes`. Each is a positive whole number. Theorem refuses to register the profile without them.',
				'`maxFiles` counts files and voice clips together. `maxBytes` caps one file. `maxTurnBytes` caps all files and clips in one turn.',
				'To give one file type its own cap, set `limitsByMime`. Its keys are MIME types or families such as `video/*`. Each value replaces `maxBytes` for those files.',
				'The byte caps apply to files sent inline. Theorem checks a file sent by reference, with a `uri`, for type and count only.',
				'An `image` profile accepts images, video and PDF only. It takes no voice.',
				'A file must be a media type that Theorem knows: an image, audio, video or document type. Any other type is refused, even when `accept` lists it.',
			].join('\n\n'),
		},
		{
			id: 'send-file',
			kind: 'code',
			title: 'Send a file',
			source: {
				from: 'literal',
				lang: 'ts',
				frame: 'request',
				code: [
					'input: {',
					"\ttext: 'Is this container on hold?',",
					'\tattachments: [',
					"\t\t{ mimeType: 'application/pdf', data: manifestBase64, name: 'manifest.pdf' },",
					'\t],',
					'},',
				].join('\n'),
			},
		},
		{
			id: 'send-file-note',
			kind: 'lede',
			text: [
				'`data` is the file as base64 text. `name` only tells the user which file Theorem refused. Theorem never sends it to the model.',
				'Theorem cleans a `text/plain`, `text/markdown` or `text/csv` file before the model reads it. It replaces injection text and sensitive data with an omitted marker. In a CSV file, it adds an apostrophe before a cell that starts like a formula.',
			].join('\n\n'),
		},
		{
			id: 'voice',
			kind: 'prose',
			title: 'Accept voice',
			text: 'Only a `text` profile takes voice clips. Set `inputs.voice.accept` to the audio types a clip may be. The same three caps apply. A turn sends clips in `input.voice`.',
		},
		{
			id: 'voice-config',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				frame: 'profile:text',
				code: [
					'inputs: {',
					"\tvoice: { accept: ['audio/*'] },",
					'\tmaxFiles: 1,',
					'\tmaxBytes: 2_000_000,',
					'\tmaxTurnBytes: 2_000_000,',
					'},',
				].join('\n'),
			},
		},
		{
			id: 'slots',
			kind: 'prose',
			title: 'Offer choices',
			text: [
				'Use `inputs.slots` when a turn must pick from a fixed list, such as a language. Each key is a slot name. Its value lists the choices.',
				'A turn passes its pick in `input.slots`. A profile can also use the pick to choose its reply schema. [Declaring outputs](/docs/outputs).',
			].join('\n\n'),
		},
		{
			id: 'slots-config',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				frame: 'profile:text',
				code: ['inputs: {', "\tslots: { channel: ['email', 'chat'] },", '},'].join('\n'),
			},
		},
		{
			id: 'other-types',
			kind: 'prose',
			title: 'Other agent types',
			text: [
				'A `speech` profile has no `inputs`. The text of the turn is the transcript.',
				'A `host` profile runs tools and takes no turn, so it has no `inputs`.',
				'A `live` profile sets its channels in `live.ingress`. A `decision` profile reads JSON state in `inputs`. [Choosing a modality](/docs/modalities).',
			].join('\n\n'),
		},
		{
			id: 'live-ingress',
			kind: 'prose',
			title: 'Open live channels',
			text: 'A live session takes audio, video and text on separate channels. Audio and video are on when you leave them out. Text is off when you leave it out. At least one channel must be on.',
		},
		{
			id: 'live-ingress-config',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				frame: 'profile:live',
				code: ['live: {', '\tingress: { audio: true, video: true, text: false },', '},'].join('\n'),
			},
		},
		{
			id: 'decision-state',
			kind: 'prose',
			title: 'Cap decision state',
			text: 'A decision call sends JSON state. The state must not be `null`. Set `inputs.maxStateBytes` to a positive whole number to cap its size. Without it, the state has no cap.',
		},
		{
			id: 'decision-inputs',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				frame: 'profile:decision',
				code: ["inputs: { state: 'json', maxStateBytes: 65_536 },"].join('\n'),
			},
		},
		{
			id: 'refusals',
			kind: 'prose',
			title: 'Read a refused turn',
			text: '`runTurn` throws a `TheoremError` when a turn breaks the profile. A file error lists one code for each problem. `runDecision` throws when the state is over `maxStateBytes`.',
		},
		{
			id: 'refusal-table',
			kind: 'table',
			title: 'Fix a refused turn',
			text: 'Error | Cause | Fix\n--- | --- | ---\nKind `input`, `attachments_not_accepted` | The turn sent a file, and the profile has no `attachments` | Add `inputs.attachments`\nKind `input`, `voice_not_accepted` | The turn sent a clip, and the profile has no `voice` | Add `inputs.voice` to a `text` profile\nKind `input`, `mime_not_allowed` | The file type is not in `accept` | Add the type to `accept`, or send another file\nKind `input`, `too_many_files` | The turn sent more than `maxFiles` | Send fewer files, or raise `maxFiles`\nKind `input`, `file_too_large` | One inline file is over its cap | Send a smaller file, or raise `maxBytes` or `limitsByMime`\nKind `input`, `turn_too_large` | The files together are over `maxTurnBytes` | Send fewer files, or raise `maxTurnBytes`\nKind `request` | The turn sent text, and `inputs.text` is `false` | Remove the text, or set `inputs.text` to `true`\nKind `request` | A slot is not declared, or its value is not in the list | Declare the slot, or send a listed value\nKind `request` | A `speech` turn has empty text | Send the text to speak\nKind `request` | A `continueFrom` turn sent `input.text` | Remove the text: Theorem sends the continue instruction',
		},
	],
};
