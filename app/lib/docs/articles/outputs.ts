import type { DocArticleDef } from '../schema';

export const outputs: DocArticleDef = {
	slug: 'outputs',
	updated: '2026-09-30',
	title: 'Declaring outputs',
	entry: 'src/kernel/registry/profiles.ts',
	summary:
		'Pin what comes back with outputs, image, or speech. Only one may be active per turn; omit outputs and the reply is free text.',
	cover: {
		src: '/imagery/th30_ambermeadow.png',
		alt: 'An amber meadow',
	},
	questions: [
		{ question: 'How do I pin what comes back?' },
		{ question: 'Where do structured, image, and speech collide?' },
	],
	blocks: [
		{
			id: 'lede',
			kind: 'lede',
			text: 'On `text`, `image`, and `speech` you may set `outputs`. Image and speech also pin their own block. That pin is the output for those types.',
		},
		{
			id: 'outputs-config',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				code: [
					"type: 'text',",
					'outputs: {',
					"\tstructured: 'ticket.reply',",
					"\tstreaming: { mode: 'sse' },",
					'},',
				].join('\n'),
			},
		},
		{
			id: 'image-and-speech',
			kind: 'prose',
			title: 'Image and speech',
			text: [
				'`outputs` is optional. Leave it out on a text profile and the reply is free text on the stream.',
				'`text` may set `outputs` alone. `image` must set `image`, and may set `outputs` for streaming. `speech` must set `speech`, and may set `outputs` for streaming.',
				'Omit a pin field and the provider default applies. Leave `speech.format` unset and none is sent \u2014 the provider picks. Author `pcm` for WAV on both transports; `mp3` needs protocol `openAi`.',
				'`live` has no `outputs`. The session is the output. `decision` and `host` produce no turn output. [Choosing a modality](/docs/modalities).',
			].join('\n\n'),
		},
		{
			id: 'image-config',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				code: [
					"type: 'image',",
					'image: {',
					"\taspectRatio: '1:1',",
					"\tmimeType: 'image/png',",
					'},',
				].join('\n'),
			},
		},
		{
			id: 'speech-config',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				code: ["type: 'speech',", 'speech: {', "\tvoice: 'Kore',", "\tformat: 'pcm',", '},'].join(
					'\n',
				),
			},
		},
		{
			id: 'mutual-exclusion',
			kind: 'prose',
			title: 'Mutual exclusion',
			text: 'Only one of a structured schema, image, or speech may be active on a turn. `assertOutputMode` refuses an image or speech profile with a non-null `outputs.structured` at resolve.',
		},
		{
			id: 'structured-schemas',
			kind: 'prose',
			title: 'Structured schemas',
			text: [
				'`outputs.structured` is a registered schema id, a slot map, or `null` for free text. Register the schema with `registerStructured` before the turn.',
				'The model is held to that JSON Schema on the wire. An unknown id fails when the turn resolves. The run emits a `structured` event when the reply parses as JSON.',
				'`outputs.validation` is host validators on dotted paths into that structured object. It requires a structured schema. Omit `maxRetries` and there are no repair turns after a reject.',
			].join('\n\n'),
		},
		{
			id: 'register-structured',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				code: [
					"registerStructured('ticket.reply', {",
					'\tjsonSchema: {',
					"\t\ttype: 'object',",
					"\t\tproperties: { reply: { type: 'string' } },",
					"\t\trequired: ['reply'],",
					'\t},',
					'})',
				].join('\n'),
			},
		},
		{
			id: 'streaming',
			kind: 'prose',
			title: 'Streaming',
			text: '`outputs.streaming.mode` is `sse` or `buffered`. Omit it and Theorem streams. Set `streamThoughts` to `false` to drop `thought` events. Other events stay on the stream.',
		},
	],
};
