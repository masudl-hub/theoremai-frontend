/**
 * What the goals screen says, as plain data with no build-time imports. A goal is one beat or
 * more, and one scroll moves one beat. The screen, llms.txt and the structured data read the
 * same words.
 */
import { GOALS } from './site-pitch';

export type GoalId = (typeof GOALS)[number]['id'];

/** A change to the agent, and what the stage asks the visitor to try after it. */
export type GoalToken = { label: string; prompt: string };

export type GoalControls = { label: string; tokens: readonly GoalToken[] };

export type GoalBeat = {
	goal: GoalId;
	lede: string;
	explainer: string;
	controls: readonly GoalControls[];
};

export const GOAL_BEATS: readonly GoalBeat[] = [
	{
		goal: 'source-of-truth',
		lede: 'One profile. The server enforces it, and the interface reads it.',
		explainer:
			'The profile states what the agent accepts, what it returns and which tools it can call. The server checks each turn against it. The interface gets the same values as data and builds the message box from them.',
		controls: [
			{
				label: 'Change the contract',
				tokens: [
					{
						label: 'Images, not spreadsheets',
						prompt: 'Now attach the photo, then the CSV file.',
					},
					{
						label: 'A size limit for each file type',
						prompt: 'Now attach the large photo, then the PDF of the same size.',
					},
					{
						label: 'A typed choice beside the message',
						prompt: 'Now pick a trip style and ask for a hotel.',
					},
					{
						label: 'A reply with a declared shape',
						prompt: 'Now ask for two days in Lisbon.',
					},
				],
			},
		],
	},
	{
		goal: 'experiment',
		lede: 'The profile names the model. Your application never does.',
		explainer:
			'Your application starts an agent by the name of its profile. The profile holds the model, the provider and the type of reply. Change one line, and the screen for that type of reply comes with it.',
		controls: [
			{
				label: 'Change what runs',
				tokens: [
					{ label: 'A faster model', prompt: 'Now send the same question again.' },
					{ label: 'Another provider', prompt: 'Now send the same question again.' },
					{
						label: 'A picture in place of text',
						prompt: 'Now ask for a postcard of Lisbon at dusk.',
					},
					{
						label: 'A live voice call',
						prompt: 'Now start the call and ask about the weather.',
					},
				],
			},
		],
	},
	{
		goal: 'boundaries',
		lede: 'Text is read at every boundary it crosses.',
		explainer:
			'Text crosses a boundary when a message comes in, a tool result returns, a tool is called or the reply goes out. Each check has its own setting at each boundary: ignore, flag, redact or block. The tester sends one text across one boundary. It calls no model.',
		controls: [
			{
				label: 'Set a boundary',
				tokens: [
					{ label: 'Block a secret in a reply', prompt: 'Now send “API key inside a URL”.' },
					{
						label: 'Redact an injection in a tool result',
						prompt: 'Now send “Injection in lookalike letters”.',
					},
					{
						label: 'Refuse tool calls after a remote read',
						prompt: 'Now send “A page that claims the user already agreed”.',
					},
					{
						label: 'Let a harmless text through',
						prompt: 'Now send “Harmless: a placeholder key from the docs”.',
					},
				],
			},
		],
	},
	{
		goal: 'boundaries',
		lede: 'What it costs, and what it catches.',
		explainer:
			'Each check adds time to a reply. The reply still streams while it is read. A harmless text that is stopped is a failure, the same as an attack that passes.',
		controls: [],
	},
];

export function isGoalId(id: string): id is GoalId {
	return GOALS.some((goal) => goal.id === id);
}

/** A goal's beats as one paragraph, for llms.txt and the structured data. */
export function goalText(id: GoalId): string {
	return GOAL_BEATS.filter(({ goal }) => goal === id)
		.map(({ lede, explainer, controls }) => {
			const changes = controls
				.map(({ label, tokens }) => `${label}: ${tokens.map((token) => token.label).join(', ')}.`)
				.join(' ');
			return [lede, explainer, changes].filter(Boolean).join(' ');
		})
		.join(' ');
}
