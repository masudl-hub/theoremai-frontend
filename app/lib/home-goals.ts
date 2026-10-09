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
			'A profile is the agent’s contract: what it accepts, what it returns and which tools it may call. The kernel checks every turn against it. The kernel also gives the interface a view of the same profile, with every value resolved, as plain data. The chat builds its composer from that view. So the screen never offers what the server will refuse, and no rule is written twice.',
		controls: [
			{
				label: 'Change the contract',
				tokens: [
					{ label: 'PDF', prompt: 'Now attach the boarding pass.' },
					{ label: 'PNG', prompt: 'Now attach the photo of the ticket.' },
					{ label: '2 MB a file', prompt: 'Now attach the 8 MB scan.' },
					{ label: '1 file a turn', prompt: 'Now attach two files.' },
					{ label: '500 KB for images', prompt: 'Now attach the large photo.' },
					{ label: 'Trip style', prompt: 'Now pick a style and ask again.' },
					{ label: 'Itinerary', prompt: 'Now ask for two days in Lisbon.' },
				],
			},
		],
	},
	{
		goal: 'experiment',
		lede: 'The profile names the model. Your application never does.',
		explainer:
			'Your application runs a profile by its id. Which model answers, which provider serves it and what kind of output comes back are lines in that profile. A provider is registered once, and a model binds to it by name. Each type of profile has its own interface, so when the type changes, the screen changes with it. The call your application makes stays the same.',
		controls: [
			{
				label: 'What it makes',
				tokens: [
					{ label: 'Text', prompt: 'Now ask what to pack for March.' },
					{ label: 'Image', prompt: 'Now ask for a postcard of Lisbon at dusk.' },
					{ label: 'Speech', prompt: 'Now ask it to read tomorrow’s plan.' },
					{ label: 'Live call', prompt: 'Now start the call and ask about the weather.' },
				],
			},
			{
				label: 'What runs it',
				tokens: [
					{ label: 'Google, fast', prompt: 'Now send the same question again.' },
					{ label: 'Google, smart', prompt: 'Now send the same question again.' },
					{ label: 'OpenRouter', prompt: 'Now send the same question again.' },
				],
			},
		],
	},
	{
		goal: 'boundaries',
		lede: 'Text is read at every boundary it crosses.',
		explainer:
			'A turn has boundaries: where a message comes in, where a tool result returns, where arguments go to a tool and where the reply goes out. The kernel reads the text at each one, inside the turn, before the next step sees it. Each detector has an action for each boundary: ignore, flag, redact or block. Those settings are lines in the same profile. The tester sends a text across one boundary on a scripted model, so nothing is called.',
		controls: [
			{
				label: 'Set a boundary',
				tokens: [
					{ label: 'Redact injections', prompt: 'Now send “Injection in lookalike letters”.' },
					{ label: 'Block secrets in a reply', prompt: 'Now send “API key inside a URL”.' },
					{
						label: 'Refuse calls after a remote read',
						prompt: 'Now send “A page that claims the user already agreed”.',
					},
					{
						label: 'Only links it was given',
						prompt: 'Now send a reply with a link it was never given.',
					},
					{
						label: 'Leave harmless text alone',
						prompt: 'Now send “Harmless: quoting an attack to ask about it”.',
					},
				],
			},
		],
	},
	{
		goal: 'boundaries',
		lede: 'What it costs, and what it catches.',
		explainer:
			'Guardrails run inside the turn, so their cost is time added to every reply. A reply still streams while it is read: text is held only while it could be the start of a match. Catches are counted on attack sets. Harmless texts are counted too, because a false alarm is also a failure.',
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
