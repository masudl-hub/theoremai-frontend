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
	| 'cite-or-fail'
	| 'attach-images'
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
						label: 'Verify findings from a brief',
						prompt: 'Find papers on episodic memory for language models.',
						ask: 'Using the attached research brief, find primary sources and return verified findings with verbatim quotes.',
						attachment: '/examples/research-brief.pdf',
						result:
							'The profile takes the brief (and voice), fills a source-focus slot into the system prompt, and shapes findings.',
						line: 'slots:',
					},
					{
						id: 'approve-tools',
						label: 'Require approval before a tool runs',
						prompt: 'Ask to search GitHub repositories.',
						ask: 'Search GitHub for vector-space memory stores for language models.',
						line: 'permission:',
					},
					{
						id: 'cite-or-fail',
						label: 'Require verbatim quotes',
						description: 'Repair or drop candidates whose quote no tool returned.',
						prompt: 'Ask for findings with verbatim quotes from the sources.',
						ask: 'Find primary sources on episodic memory for language models and return findings with a verbatim quote for each candidate.',
						result:
							'Validation checks each quote against what the tools returned, and repairs or drops the rest.',
						line: 'validation:',
					},
					{
						id: 'attach-images',
						label: 'Accept small images',
						description: 'Accept only PDFs, PNGs, and JPEGs.',
						prompt: 'Attach a small PNG, or try a file over the limit.',
						result: 'The picker and limits follow the same accept list and size budget.',
						line: 'accept:',
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
						label: 'Compare Gemini and OpenRouter',
						prompt: 'Pick a model, then ask which papers to read.',
						ask: 'Which papers describe how language models recombine retrieved context?',
						result:
							'The scout keeps its tools; models now span Gemini and OpenRouter, and the visitor can pick one.',
						line: 'models:',
					},
					{
						id: 'live-call',
						label: 'Talk to the scout live',
						prompt: 'Start a call and ask which paper or repo to investigate.',
						result:
							'The same scout runs as live, with input and output transcription and barge-in.',
						line: 'live:',
					},
					{
						id: 'decision',
						label: 'Decide from a pantry photo',
						description:
							'Jev answers box, yes/no, and brunch-choice questions on a shelf photo and reference images.',
						prompt: 'Open Decide and run the pantry questions on the shelf photo.',
						result: 'A decision profile asks typed questions over images — not a chat turn.',
						line: 'decision:',
					},
					{
						id: 'host',
						label: 'Run a tool with no model',
						description:
							'A tool console with typed arguments and guarded results. No model call runs.',
						prompt: 'Pick a console tool, fill its arguments, and run it.',
						result: 'A host profile invokes tools directly — no model round-trip.',
						line: 'tools:',
					},
					{
						id: 'speech',
						label: 'Narrate a short script',
						description: 'Turn a written script into audio with a declared speaking style.',
						prompt: 'Send the memory script, or write a shorter one, then generate speech.',
						ask: 'Working memory holds the current turn. Episodic memory stores earlier facts. Vector stores retrieve them by similarity.',
						result: 'A speech profile reads the script aloud with the style you set.',
						line: 'speech:',
					},
					{
						id: 'embedding',
						label: 'Embed text at a set size',
						description: 'Encode text or media as vectors with a declared output dimensionality.',
						prompt: 'Paste a short memory sentence or attach a file, then generate the embedding.',
						result:
							'An embedding profile returns vectors at the dimensionality declared on the model.',
						line: 'outputDimensionality:',
					},
				],
			},
		],
	},
	{
		goal: 'boundaries',
		lede: GOALS[2].title,
		explainer:
			'Decide how your agents safeguard sensitive data and untrusted content. Your `guardrails` control how each `detector` responds.',
		controls: [
			{
				label: 'Guardrail examples',
				tokens: [
					{
						id: 'block-secret',
						label: 'Block secrets in replies',
						description: 'Set credentials on the reply boundary to block.',
						prompt:
							'Turn this on, then in the tester send “Credential in the reply”. Expect Blocked.',
						result: 'Credentials on the reply boundary block — a real key never leaves.',
						line: 'credentials:',
					},
					{
						id: 'block-injection',
						label: 'Block injection from remote tools',
						description: 'Set injection on remote HTTP tool output to block.',
						prompt:
							'Turn this on, then in the tester send “Instruction in an HTML comment”. Expect Blocked on the tool-result path.',
						result: 'Injection on remote tool output blocks — a page cannot seize the turn.',
						line: 'injection:',
					},
					{
						id: 'refuse-after-read',
						label: 'Lock writes after a remote read',
						description:
							'After the agent reads a remote page, writes stay refused even if the page claims approval.',
						prompt:
							'Turn this on, then in the tester send “A page that claims the user already agreed”. Expect taint that locks writes.',
						result: 'afterRemoteRead is write — remote content cannot authorize a write.',
						line: 'afterRemoteRead:',
					},
					{
						id: 'harmless',
						label: 'Let a fake key through',
						description: 'A documentation placeholder is not treated as a real credential.',
						prompt:
							'In the tester send “Harmless: a placeholder key from the docs”. Expect Passed.',
						result: 'Detectors spare placeholder keys so docs and help stay usable.',
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
