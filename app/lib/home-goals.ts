/**
 * What the goals screen says, as plain data with no build-time imports. A goal is one beat or
 * more, and one scroll moves one beat. The screen, llms.txt and the structured data read the
 * same words.
 */
import { GOALS } from './site-pitch';

export type GoalId = (typeof GOALS)[number]['id'];

export type GoalTokenId =
	| 'images-only'
	| 'limit-by-type'
	| 'typed-choice'
	| 'declared-shape'
	| 'openrouter'
	| 'pick-model'
	| 'picture'
	| 'live-call'
	| 'block-secret'
	| 'block-injection'
	| 'refuse-after-read'
	| 'harmless';

/** A change to the agent, and what the stage asks the visitor to try after it. */
/**
 * `ask` is the message the prompt offers to send, when one message is the whole test. `result` is
 * what the reply to it shows, and `line` is text on the line of the file that decided it.
 */
export type GoalToken = {
	id: GoalTokenId;
	label: string;
	prompt: string;
	ask?: string;
	result?: string;
	line?: string;
};

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
						id: 'images-only',
						label: 'Images, not spreadsheets',
						prompt: 'Now attach the photo, then the CSV file.',
					},
					{
						id: 'limit-by-type',
						label: 'A size limit for each file type',
						prompt: 'Now attach the large photo, then the PDF of the same size.',
					},
					{
						id: 'typed-choice',
						label: 'A typed choice beside the message',
						prompt: 'Now pick a trip style and ask for a hotel.',
						ask: 'Find me a hotel in Lisbon.',
						result: 'The style you picked went with the message.',
						line: 'slots:',
					},
					{
						id: 'declared-shape',
						label: 'A reply with a declared shape',
						prompt: 'Now ask for two days in Lisbon.',
						ask: 'Plan two days in Lisbon.',
						result: 'The reply has the shape the profile declares.',
						line: 'outputs:',
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
				label: 'What runs it',
				tokens: [
					{
						id: 'openrouter',
						label: 'Use OpenRouter instead',
						prompt: 'Now ask what to pack for March.',
						ask: 'What should I pack for Lisbon in March?',
						result: 'The default model is on OpenRouter.',
						line: "provider: 'openrouter'",
					},
					{
						id: 'pick-model',
						label: 'Let the visitor pick the model and effort',
						prompt: 'Now pick a model and an effort, and ask what to pack.',
					},
				],
			},
			{
				label: 'What it makes',
				tokens: [
					{
						id: 'picture',
						label: 'A picture in place of text',
						prompt: 'Now ask for a postcard of Lisbon at dusk.',
						ask: 'A postcard of Lisbon at dusk.',
						result: 'The reply is a picture.',
						line: "type: 'image'",
					},
					{
						id: 'live-call',
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
					{
						id: 'block-secret',
						label: 'Block a secret in a reply',
						prompt: 'Now send “API key inside a URL”.',
					},
					{
						id: 'block-injection',
						label: 'Block an injection in a tool result',
						prompt: 'Now send “Injection in lookalike letters”.',
					},
					{
						id: 'refuse-after-read',
						label: 'Refuse tool calls after a remote read',
						prompt: 'Now send “A page that claims the user already agreed”.',
					},
					{
						id: 'harmless',
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
