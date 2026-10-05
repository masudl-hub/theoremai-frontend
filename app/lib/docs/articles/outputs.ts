import type { DocArticleDef } from '../schema';

export const outputs: DocArticleDef = {
	slug: 'outputs',
	updated: '2026-10-05',
	title: 'Declaring outputs',
	entry: 'src/kernel/registry/profiles.ts',
	summary:
		'Make a text agent reply in a fixed JSON shape, check the reply, and choose how it streams. Image and speech agents return media.',
	cover: {
		src: '/imagery/th30_orangecanyon.png',
		alt: 'An orange canyon',
		position: '0% 34%',
	},
	questions: [
		{ question: 'How do I make an agent reply in a fixed JSON shape?' },
		{ question: 'How do I use a different shape for each case?' },
		{ question: 'How do I check the reply and ask for a new one?' },
		{ question: 'How do I choose how the reply streams?' },
		{ question: 'What do image and speech agents return?' },
		{ question: 'Why did an output setting fail, and what do I change?' },
	],
	blocks: [
		{
			id: 'lede',
			kind: 'lede',
			text: 'Use `outputs` to make a `text` agent reply in a fixed JSON shape that your code can read. A profile without `outputs` replies in free text. Register a schema, then name it in the profile.',
		},
		{
			id: 'register-structured',
			kind: 'code',
			title: 'Register the schema',
			source: {
				from: 'literal',
				lang: 'ts',
				code: [
					"registerStructured('harbor.desk.reply', {",
					'\tjsonSchema: {',
					"\t\ttype: 'object',",
					"\t\tproperties: { reply: { type: 'string' }, nextStep: { type: 'string' } },",
					"\t\trequired: ['reply', 'nextStep'],",
					'\t},',
					'})',
				].join('\n'),
			},
		},
		{
			id: 'outputs-config',
			kind: 'code',
			title: 'Name it in the profile',
			source: {
				from: 'literal',
				lang: 'ts',
				code: ['outputs: {', "\tstructured: 'harbor.desk.reply',", '},'].join('\n'),
			},
		},
		{
			id: 'structured-schemas',
			kind: 'prose',
			title: 'Pin the reply to a schema',
			text: [
				'`registerStructured` stores a JSON Schema under an id. Register it before the profile. Theorem refuses to register a profile that names an unknown id.',
				'Theorem sends the schema to the model as its response format. When the reply is valid JSON, the run emits a `structured` event with the parsed value. Otherwise the run emits an `error` event of kind `bad_response`.',
				'Only a `text` profile takes `outputs.structured` and `outputs.validation`. Set `structured` to `null` for free text.',
			].join('\n\n'),
		},
		{
			id: 'structured-by-slot',
			kind: 'prose',
			title: 'Pick the schema by slot',
			text: [
				'Use a slot map when one agent needs a different reply shape for each case. `by` names an input slot. `map` gives a schema id for each choice of that slot. `fallback` is the schema for every choice that `map` leaves out, and for a turn that sends no pick.',
				'`by` must name a slot in `inputs.slots`. Each key of `map` must be a choice of that slot. Theorem refuses to register the profile otherwise. [Declaring inputs](/docs/inputs).',
			].join('\n\n'),
		},
		{
			id: 'structured-by-slot-config',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				code: [
					'outputs: {',
					'\tstructured: {',
					"\t\tby: 'channel',",
					"\t\tmap: { email: 'harbor.desk.email', chat: 'harbor.desk.chat' },",
					"\t\tfallback: 'harbor.desk.chat',",
					'\t},',
					'},',
				].join('\n'),
			},
		},
		{
			id: 'validation',
			kind: 'prose',
			title: 'Check the reply',
			text: [
				'Use `outputs.validation.fields` to run your own checks on the structured reply. Each key is a dotted path into the reply, such as `diagram.mermaid`. Each value is a function.',
				'The function receives that part of the reply and the turn’s slots. It returns `{ isValid, error? }`.',
				'Checks in `fields` need a `structured` schema. Every path must reach a property through object properties. Theorem refuses to register the profile otherwise.',
				'When a check fails, Theorem sends its `error` to the model and asks for a new reply. `maxRetries` sets how many times it asks. Without it, no retry happens, and the reply goes out as it is.',
				'`guardrails.egress.maxRetries` also sets retries. Theorem uses the larger of the two numbers. `maxRetries` must be a whole number of 0 or more.',
			].join('\n\n'),
		},
		{
			id: 'validation-config',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				code: [
					'outputs: {',
					"\tstructured: 'harbor.desk.reply',",
					'\tvalidation: {',
					'\t\tfields: {',
					'\t\t\tnextStep: (value) => ({',
					"\t\t\t\tisValid: typeof value === 'string' && value.length <= 140,",
					"\t\t\t\terror: 'nextStep must be 140 characters or fewer.',",
					'\t\t\t}),',
					'\t\t},',
					'\t\tmaxRetries: 2,',
					'\t},',
					'},',
				].join('\n'),
			},
		},
		{
			id: 'streaming',
			kind: 'prose',
			title: 'Choose how the reply streams',
			text: [
				'`outputs.streaming.mode` is `sse` or `buffered`. Without it, the mode is `sse`.',
				'In `sse`, events arrive while the model writes. A reply that fails `validation` has then streamed already when Theorem asks for a new one.',
				'In `buffered`, Theorem makes one non-streaming call. Its events arrive together. With `validation`, they arrive after the reply passes or the retries run out. Thinking still streams.',
				'Set `streamThoughts` to `false` to drop `thought` events from the stream. It is on when you leave it out. Other events stay.',
			].join('\n\n'),
		},
		{
			id: 'streaming-config',
			kind: 'code',
			source: {
				from: 'literal',
				lang: 'ts',
				code: [
					'outputs: {',
					"\tstreaming: { mode: 'buffered', streamThoughts: false },",
					'},',
				].join('\n'),
			},
		},
		{
			id: 'image-and-speech',
			kind: 'prose',
			title: 'Return an image or speech',
			text: [
				'An `image` profile sets `image`. A `speech` profile sets `speech`. Each returns `media` events. A `media` event holds `mimeType` and base64 `data`.',
				'`outputs` is optional on both. Only `streaming` applies to them. OpenRouter image and speech calls always answer in one piece.',
				'A pin that you leave out takes the provider default.',
				'`defineProfile` refuses `outputs.structured`, other than `null`, on an `image` or `speech` profile. A turn has one primary output: a schema, an image or speech.',
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
			id: 'speech-format',
			kind: 'prose',
			title: 'Pick the speech format',
			text: '`speech.format` is `pcm` or `mp3`. Theorem returns `pcm` as WAV audio. Gemini speech refuses `mp3`. OpenRouter speech takes it.',
		},
		{
			id: 'no-output',
			kind: 'prose',
			title: 'Skip outputs on other types',
			text: 'A `live` profile has no `outputs`, because the session is the output. A `decision` profile and a `host` profile make no turn output. [Choosing a modality](/docs/modalities).',
		},
		{
			id: 'output-failures',
			kind: 'table',
			title: 'Fix an output setting that fails',
			text: 'Where | What you see | Fix\n--- | --- | ---\nRegistering the profile, kind `config` | `outputs.structured` names an id that no `registerStructured` call made | Register the schema first\nRegistering the profile, kind `config` | `outputs.structured.by` is not a slot in `inputs.slots` | Declare the slot, or name another\nRegistering the profile, kind `config` | A key of `map` is not a choice of the slot | Use only choices that the slot lists\nRegistering the profile, kind `config` | `validation.fields` has a path that no schema reaches | Name a property that the schema declares\nRegistering the profile, kind `config` | `validation.maxRetries` is not a whole number of 0 or more | Use 0, 1, 2 and so on\n`defineProfile`, kind `config` | An `image` or `speech` profile sets `outputs.structured` | Set it to `null`, or use a `text` profile\nA turn, `error` event, kind `bad_response` | The model\u2019s reply is not valid JSON | Tighten the schema and the instruction, then send the turn again\nA turn, kind `config` | `speech.format` is `mp3` on a Gemini model | Use `pcm`, or an OpenRouter model',
		},
	],
};
