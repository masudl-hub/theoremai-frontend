/**
 * What the goals screen says, as plain data with no build-time imports. A goal is one beat or
 * more, and one scroll moves one beat. The screen, llms.txt and the structured data read the
 * same words.
 */
import { GOALS } from './site-pitch';

export type GoalId = (typeof GOALS)[number]['id'];

export type GoalTokenId =
	| 'trip-brief'
	| 'approve-tools'
	| 'file-types'
	| 'file-limits'
	| 'decision'
	| 'host'
	| 'embedding'
	| 'speech'
	| 'providers'
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
	description?: string;
	prompt: string;
	ask?: string;
	attachment?: string;
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
		goal: 'experience',
		lede: GOALS[0].title,
		explainer:
			'You shouldn’t have to implement the same decision twice. Change your agent’s `profile`. The experience follows.',
		controls: [
			{
				label: 'Experience examples',
				tokens: [
					{
						id: 'trip-brief',
						label: 'Turn a research brief into verified findings',
						prompt: 'Find papers on episodic memory for language models.',
						ask: 'Find papers on episodic memory for language models using the attached brief.',
						attachment: '/examples/lisbon-trip-brief.pdf',
						result: 'The same profile shapes the research brief and validates the findings.',
						line: 'inputs:',
					},
					{
						id: 'approve-tools',
						label: 'Require approval before a tool runs',
						prompt: 'Ask to search GitHub repositories.',
						ask: 'Search GitHub for vector-space memory stores for language models.',
						line: 'permission:',
					},
					{
						id: 'file-types',
						label: 'Choose exactly which files are accepted',
						description:
							'Accept PDFs, PNGs, and JPEGs. The picker and validation follow the same MIME rules.',
						prompt: 'Attach a PDF, PNG, or JPEG.',
						line: 'accept:',
					},
					{
						id: 'file-limits',
						label: 'Set an upload budget',
						description:
							'Limit a message to one PDF under 250 KB, including its MIME-specific limit.',
						prompt: 'Attach one PDF under 250 KB.',
						line: 'maxBytes:',
					},
				],
			},
		],
	},
	{
		goal: 'experiment',
		lede: GOALS[1].title,
		explainer:
			'Build agents for any job, without `provider`, `model`, or `modality` lock-in. Same build, one line changed.',
		controls: [
			{
				label: 'Experiment examples',
				tokens: [
					{
						id: 'providers',
						label: 'Compare models across providers',
						prompt: 'Choose a model and ask which benchmarks to check.',
						ask: 'Which papers describe how language models recombine retrieved context?',
						line: 'models:',
					},
					{
						id: 'live-call',
						label: 'Turn the scout into a live voice session',
						prompt: 'Start a call with your research scout.',
						line: 'live:',
					},
					{
						id: 'decision',
						label: 'Make a typed decision',
						description:
							'Ask Jev about a pantry photo using box detection, reference images, and choice criteria.',
						prompt: 'Inspect the pantry state and run the decision.',
						line: 'decision:',
					},
					{
						id: 'host',
						label: 'Run tools without a model',
						description:
							'Open a tool console with typed arguments and guarded results. No model call is needed.',
						prompt: 'Choose a tool and run it directly.',
						line: 'tools:',
					},
					{
						id: 'embedding',
						label: 'Generate embeddings',
						description: 'Encode text or media as vectors with a declared output dimensionality.',
						prompt: 'Add text or a file, then generate its embedding.',
						line: 'outputDimensionality:',
					},
					{
						id: 'speech',
						label: 'Generate a spoken response',
						description: 'Turn a written script into audio with a declared speaking style.',
						prompt: 'Write a short script for the narrator.',
						ask: 'Working memory holds the current turn. Episodic memory stores earlier facts. Vector stores retrieve them by similarity.',
						line: 'speech:',
					},
				],
			},
		],
	},
	{
		goal: 'boundaries',
		lede: GOALS[2].title,
		explainer:
			'Keep sensitive data from escaping and untrusted content from taking control. Your `guardrails` control how each `detector` responds.',
		controls: [
			{
				label: 'Guardrail examples',
				tokens: [
					{
						id: 'block-secret',
						label: 'Stop secrets from leaving the agent',
						description: 'Credential detection catches secrets embedded in URLs, too.',
						prompt: 'An API key hidden in a URL is blocked before the reply leaves.',
						line: 'credentials:',
					},
					{
						id: 'block-injection',
						label: 'Stop outside content taking control',
						description:
							'Injection detection catches instructions disguised with lookalike letters.',
						prompt: 'Disguised instructions in a remote tool result are blocked.',
						line: 'injection:',
					},
					{
						id: 'refuse-after-read',
						label: 'Restrict actions after a remote read',
						description: 'Remote content cannot authorize a write on the user’s behalf.',
						prompt: 'A remote read restricts subsequent writes, even when a page claims approval.',
						line: 'afterRemoteRead:',
					},
					{
						id: 'harmless',
						label: 'Let harmless content through',
						description: 'A documentation placeholder is distinguished from a real credential.',
						prompt: 'A harmless placeholder key passes without blocking the interaction.',
					},
				],
			},
		],
	},
];

/** The number of beats. The goal stage fades out as scroll passes it. */
export const EDITED_BEATS = GOAL_BEATS.length;

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
