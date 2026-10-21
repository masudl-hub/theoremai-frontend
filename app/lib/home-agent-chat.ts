/**
 * The exchanges the landing page's chats open on, written here and not run. The server stores one
 * as the visitor's conversation, so the next message is a follow-up.
 */
import type { TranscriptBlock } from '@theoremjs/agents/interface';

type ToolCall = Extract<TranscriptBlock, { kind: 'tool' }>['tool'];

/** The goals screen's: one turn with the pared concierge. */
export const HOME_EXCHANGE: readonly TranscriptBlock[] = [
	{ id: 'home-ask', kind: 'user-text', text: 'Two days in Lisbon in March. Where should I stay?' },
	{
		id: 'home-reply',
		kind: 'text',
		text: [
			'Stay in Chiado.',
			'',
			'- You can walk to Baixa, Bairro Alto and the river.',
			'- Tram 28 and the Baixa-Chiado metro are a few minutes away.',
			'- It is quieter at night than Bairro Alto.',
			'',
			'Tell me your budget and I will name a hotel.',
		].join('\n'),
	},
	{ id: 'home-done', kind: 'turn-done' },
];

/** When the interface tile's turn ran: a fixed time, so the page draws the same each visit. */
const AT = Date.UTC(2027, 2, 14, 10, 2);

/** A call that ran and came back, as the transcript keeps it. */
function ran(
	callId: string,
	stepId: string,
	name: string,
	args: Record<string, unknown>,
	output: unknown,
	activityPast: string,
	ms: number,
): ToolCall {
	return {
		name,
		callId,
		stepId,
		arguments: args,
		activityPast,
		state: {
			name,
			callId,
			at: AT + ms,
			phase: 'complete',
			output,
			// why: What the model read of the result; history replays the call with it.
			readBack: JSON.stringify(output),
			activityPast,
		},
		startedAt: AT,
		endedAt: AT + ms,
		artifacts: [],
	};
}

/** The interface tile's: one busy turn with the full concierge, a file, a thought, calls, a table and sources. */
export const INTERFACE_EXCHANGE: readonly TranscriptBlock[] = [
	{
		id: 'ui-pass',
		kind: 'user-attachment',
		name: 'TP1350-boarding-pass.pdf',
		mimeType: 'application/pdf',
		sizeBytes: 184_320,
	},
	{
		id: 'ui-ask',
		kind: 'user-text',
		text: 'I land in Lisbon on this flight. Plan my first day, and what should I budget in dollars?',
	},
	{
		id: 'ui-thought',
		kind: 'thought',
		text: 'The pass says TP1350 lands at 09:40 on 14 March. Check the weather, find lunch near the river, then price the day.',
	},
	{
		id: 'ui-weather',
		kind: 'tool',
		tool: ran(
			'ui-weather',
			'ui-step-1',
			'get_weather',
			{ latitude: 38.72, longitude: -9.14 },
			{
				current_weather: {
					temperature: 17.2,
					windspeed: 11.5,
					weathercode: 2,
					time: '2027-03-14T10:00',
				},
			},
			'Currently 17.2°C',
			412,
		),
	},
	{
		id: 'ui-places',
		kind: 'tool',
		tool: ran(
			'ui-places',
			'ui-step-1',
			'search_places',
			{ q: 'Time Out Market Lisboa', limit: 1 },
			[
				{
					display_name: 'Time Out Market Lisboa, Avenida 24 de Julho, Cais do Sodré, Lisboa',
					lat: '38.7070',
					lon: '-9.1458',
				},
			],
			'Searched for Time Out Market Lisboa',
			688,
		),
	},
	{
		id: 'ui-budget',
		kind: 'tool',
		tool: ran(
			'ui-budget',
			'ui-step-2',
			'convert_currency',
			{ from: 'EUR', to: 'USD', amount: 120 },
			{ amount: 120, base: 'EUR', rates: { USD: 130.44 } },
			'Converted 120 EUR to USD',
			295,
		),
	},
	{
		id: 'ui-reply',
		kind: 'text',
		text: [
			'**Drop your bags in Chiado, then eat by the river.** It is 17°C with light cloud, so walk.',
			'',
			'| Time | Stop | Cost |',
			'| --- | --- | --- |',
			'| 11:30 | Lunch at **Time Out Market** | €25 |',
			'| 14:00 | Tram 28 up to Alfama | €3 |',
			'| 17:30 | Sunset at Miradouro da Graça | Free |',
			'| 20:00 | Dinner in Bairro Alto | €45 |',
			'',
			'Budget **€120, about $130**, with room for a drink. Shall I book dinner?',
		].join('\n'),
	},
	{
		id: 'ui-sources',
		kind: 'citation',
		sources: [
			{
				title: 'Time Out Market Lisboa',
				uri: 'https://www.timeoutmarket.com/lisboa/en/',
				type: 'web',
			},
			{ title: 'Carris: tram 28', uri: 'https://www.carris.pt/en/', type: 'web' },
		],
	},
	{
		id: 'ui-done',
		kind: 'turn-done',
		tokens: { input: 4812, output: 386, thinking: 142, total: 5198 },
		workedMs: 6400,
		endedAt: AT + 6400,
	},
];

/** What the interface tile's composer holds, as if the visitor were about to answer: text, a file, and two messages set aside. */
export const INTERFACE_COMPOSER = {
	text: 'Yes, a table for two at 20:00.',
	files: [{ name: 'bairro-alto-menu.pdf', type: 'application/pdf', bytes: 96_256 }],
	queued: 'And a taxi back to Chiado after.',
	stashed: 'Find a fado bar for Saturday.',
} as const;
