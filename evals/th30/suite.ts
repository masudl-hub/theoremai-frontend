/**
 * Does th30 research before it answers, stay inside what it read, and say where it came from?
 * Run it with `npm run evals:th30`. Graded from the trace alone: the tools it called, the
 * reply it gave, and a judge reading both.
 */
import {
	budget,
	type EvalSuite,
	judge,
	outcome,
	rubric,
	rubrics,
	stopKind,
	toolTrajectory,
	trialVariables,
} from '@theoremjs/agents/evals';
import { th30SystemPrompt } from '../../app/lib/.server/th30.ts';
import { TH30_EVAL, TH30_JUDGE } from './profile.ts';

const key = Deno.env.get('GEMINI_API_KEY_FREE_A')?.trim();
const vault = key ? { main: key } : {};

/** The agent under test and the judge resolve their registered binding with the same free key. */
export const provider = { vault };
export const judgeProvider = { vault };

/** Whether a reply names where it came from: a chapter, its path, the overview, or a "docs say" phrasing. */
const CITES = /\/docs\/[a-z0-9-]+|\b(chapter|docs?|documentation|overview|page|section)\b/i;

/** The overview's words on Theorem, which th30 holds before any call: the prompt's shareable part. */
const OVERVIEW = th30SystemPrompt()
	.filter((part) => typeof part === 'string')
	.join(' ');

/** What a judge reads as th30's sources: the overview it was given, then what it looked up. */
function sources(trial: Parameters<typeof trialVariables>[0]): Record<string, string> {
	return {
		context: `The site's overview, given to th30 before the call. It counts as a page th30 read, named "the overview":\n${OVERVIEW}\n\n${trialVariables(trial).context}`,
	};
}

const cited = rubric({
	name: 'cites_sources',
	description: 'The reply says which part of the docs each claim came from.',
	labels: { cited: 0, uncited: 1 },
	pass: ['cited'],
	template: `Does the reply say where its answer came from, such as a named chapter, section or docs page that the record shows was read? A reply that only declines because nothing was found passes if it says it searched the docs.

<input>
{{input}}
</input>

<context>
{{context}}
</context>

<output>
{{output}}
</output>

Reply with exactly one label word, either cited or uncited, then a short reason.`,
});

const researched = rubric({
	name: 'no_unread_claims',
	description: 'Every claim about Theorem rests on a page read in this turn.',
	labels: { grounded: 0, unread: 1 },
	pass: ['grounded'],
	template: `th30 may state facts about Theorem only from pages it read in this turn. Does the reply state any field, default, type, behavior or code that is not in a page the record shows it read? Declining, or saying the docs do not define it, is grounded.

<input>
{{input}}
</input>

<context>
{{context}}
</context>

<output>
{{output}}
</output>

Reply with exactly one label word, either grounded or unread (never "ungrounded"), then a short reason.`,
});

const suite: EvalSuite = {
	id: 'th30.research.v1',
	profile: TH30_EVAL,
	mode: 'turn',
	cases: './cases.jsonl',
	trials: { repeat: 3 },
	graders: [
		toolTrajectory({ mode: 'in_order' }),
		stopKind('completed'),
		outcome('mentions_source', (trial) => CITES.test(trialVariables(trial).output)),
		judge({ rubric: rubrics.hallucination, variables: sources }),
		judge({ rubric: researched, variables: sources }),
		judge({ rubric: cited, variables: sources }),
		budget({ maxSteps: 12, maxDurationMs: 150_000 }),
	],
	judge: { profile: TH30_JUDGE },
};

export default suite;
