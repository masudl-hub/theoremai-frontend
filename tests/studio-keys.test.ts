import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defineProfile } from '@theoremjs/agents';
import {
	compileStudio,
	compileWorkspace,
	createArchitectWorkspace,
	createConsoleExampleDraft,
	createDecisionExampleDraft,
	createExampleDraft,
	createLiveExampleDraft,
	createNarratorExampleDraft,
	createSpanExampleDraft,
	modelBindingViolation,
	modelRoute,
	newDecisionQuestion,
	type StudioDraft,
	type StudioIssue,
	setProfileType,
	studioNetworkNote,
	studioTaintNote,
} from '@theoremjs/studio';
import { decisionRequestSchema } from '@theoremjs/studio/server';
import { SITE_KEYS } from '../app/lib/studio-keys.ts';
import { ON_SITE as ON_SITE_KEYS } from '../app/lib/studio-supplies.ts';
import { SITE_TOOL_HANDLERS } from '../app/lib/studio-tool-handlers.ts';


/** The decide request the site's keys answer. */
const studioDecisionRequestSchema = decisionRequestSchema(SITE_KEYS.decision);

function issues(draft: StudioDraft): StudioIssue[] {
	const result = compileStudio(draft, ON_SITE_KEYS);
	return result.ok ? [] : result.issues;
}

function withQuestions(
	draft: StudioDraft,
	edit: (questions: StudioDraft['decision']['questions']) => StudioDraft['decision']['questions'],
): StudioDraft {
	return { ...draft, decision: { ...draft.decision, questions: edit(draft.decision.questions) } };
}

function spanRoute() {
	const span = createSpanExampleDraft();
	const [binding] = span.modelBindings;
	assert(binding);
	return modelRoute(span.providers, 'decision', binding);
}

test("the site's keys hold text to their Gemini list and OpenRouter's free router", () => {
	const draft = setProfileType(createExampleDraft(), 'text', SITE_KEYS);
	const [first] = draft.modelBindings;
	assert(first);
	const violation = (changes: { provider?: string; apiId?: string; builtInTools?: string[] }) => {
		const binding = { ...first, ...changes };
		return modelBindingViolation(
			{ ...modelRoute(draft.providers, 'text', binding), builtInTools: binding.builtInTools },
			ON_SITE_KEYS,
		);
	};
	assert.equal(violation({}), null);
	assert.equal(violation({ apiId: 'gemini-3-pro' })?.field, 'apiId');
	assert.equal(violation({ provider: 'openrouter', apiId: 'openai/gpt-5' })?.field, 'apiId');
	assert.equal(violation({ provider: 'openrouter', apiId: 'openrouter/free' }), null);
	assert.equal(violation({ builtInTools: ['urlContext'] }), null);
});

test('switching type on the site starts on the first Gemini model the keys list for it', () => {
	for (const type of ['image', 'speech', 'live', 'embedding'] as const) {
		const draft = setProfileType(createExampleDraft(), type, SITE_KEYS);
		assert.deepEqual(
			draft.modelBindings.map((binding) => binding.apiId),
			[SITE_KEYS.models(type, 'gemini')[0]?.id],
		);
	}
});

test('the site policy handles embedding routes without an undefined model list', () => {
	assert.deepEqual(
		SITE_KEYS.models('embedding', 'gemini').map((model) => model.id),
		['gemini-embedding-2-preview', 'gemini-embedding-001'],
	);
	assert.equal(SITE_KEYS.runs('embedding', 'gemini'), true);
	assert.equal(SITE_KEYS.runs('embedding', 'openrouter'), true);
	assert.equal(SITE_KEYS.runs('embedding', 'typesafe'), false);
});

test('decisions on the site run on TypeSafe or Span only', () => {
	const draft = createSpanExampleDraft();
	const [binding] = draft.modelBindings;
	assert(binding);
	for (const apiId of ['jaredpalmer/kev-4b', '~typesafe/jev-latest', 'respan/span-01']) {
		const modelBindings = [{ ...binding, provider: 'openrouter' as const, apiId }];
		assert(issues({ ...draft, modelBindings }).some((issue) => issue.field === 'apiId'));
	}
	assert.deepEqual(
		issues({
			...draft,
			modelBindings: [{ ...binding, provider: 'typesafe', apiId: 'jev-latest' }],
		}),
		[],
	);
});

test('Span asks Number questions with true and false described', () => {
	const span = createSpanExampleDraft();
	assert.deepEqual(issues(span), []);
	const [question] = span.decision.questions;
	assert(question);
	const choice = withQuestions(span, () => [{ ...question, type: 'choice' }]);
	assert(issues(choice).some((issue) => issue.message.includes('Span accepts Number')));
	const bare = withQuestions(span, () => [
		{ ...newDecisionQuestion(span, 'noul'), instructions: 'Is it safe?' },
	]);
	assert(issues(bare).some((issue) => issue.message.includes('true and false criteria')));
});

test("Span's state is text, or input and output messages", () => {
	const route = spanRoute();
	assert.equal(SITE_KEYS.stateViolation(route, 'request text'), null);
	assert.equal(SITE_KEYS.stateViolation(route, { input: 'request', output: 'response' }), null);
	assert.equal(
		SITE_KEYS.stateViolation(route, {
			input: [{ role: 'user', content: 'request' }],
			output: { role: 'assistant', content: 'response' },
		}),
		null,
	);
	for (const state of [
		{},
		{ unrelated: true },
		{ input: null },
		{ output: 123 },
		{ input: [] },
		{ input: [{}] },
		{ output: { role: 'assistant', content: 4 } },
	])
		assert.match(SITE_KEYS.stateViolation(route, state) ?? '', /Span state/);
	// Jev takes any JSON state.
	const jev = { ...route, adapter: 'typesafe', apiId: 'jev-latest' };
	assert.equal(SITE_KEYS.stateViolation(jev, { unrelated: true }), null);
});

test('a decision that compiles on the site passes the decide request; one over its limits does not compile', () => {
	const span = createSpanExampleDraft();
	const [binding] = span.modelBindings;
	const [question] = span.decision.questions;
	assert(binding && question);
	const limits = SITE_KEYS.decision;
	for (const over of [
		{ ...span, modelBindings: [{ ...binding, timeoutMs: limits.timeoutMs + 1 }] },
		{ ...span, decision: { ...span.decision, contract: 'c'.repeat(limits.idChars + 1) } },
		withQuestions(span, () => [{ ...question, id: 'q'.repeat(limits.nameChars + 1) }]),
	])
		assert(issues(over).length > 0);
	for (const draft of [span, setProfileType(createExampleDraft(), 'decision', SITE_KEYS)]) {
		const compiled = compileStudio(draft, ON_SITE_KEYS);
		assert(compiled.ok, JSON.stringify(!compiled.ok && compiled.issues));
		const { profile, questions } = compiled;
		assert(studioDecisionRequestSchema.safeParse({ profile, questions, state: 'test' }).success);
	}
});

test('the decide request keeps the key slots the draft chose, and refuses a slot that is not one', () => {
	const draft = setProfileType(createExampleDraft(), 'decision', SITE_KEYS);
	const [binding] = draft.modelBindings;
	assert(binding);
	const compiled = compileStudio(
		{
			...draft,
			models: { ...draft.models, key: 'house' },
			modelBindings: [{ ...binding, keySlot: 'openrouter' }],
		},
		ON_SITE_KEYS,
	);
	assert(compiled.ok);
	const { profile, questions } = compiled;
	const parsed = studioDecisionRequestSchema.parse({ profile, questions, state: 'test' });
	assert.equal('key' in parsed.profile, false);
	assert.equal(Object.values(parsed.profile.models)[0]?.keySlot, 'openrouter');
	defineProfile(parsed.profile as typeof profile);
	const refused = studioDecisionRequestSchema.safeParse({
		profile: {
			...profile,
			models: { decision: { provider: 'openrouter', apiId: 'test', keySlot: 'not a slot' } },
		},
		questions,
		state: 'test',
	});
	assert.equal(refused.success, false);
});

test("the site's handlers answer its example tools", () => {
	const convert = SITE_TOOL_HANDLERS.convert_units;
	assert(convert);
	assert.equal(typeof convert({ value: 32, from: 'f', to: 'c' }).result, 'number');
});

test("runs on the site's keys reach public hosts only, and refuse destructive calls after a remote read", () => {
	assert.equal(studioNetworkNote(ON_SITE_KEYS), "This page's keys reach public hosts only.");
	assert.equal(
		studioTaintNote(ON_SITE_KEYS),
		"This page's keys refuse destructive calls after a remote read. Stricter settings hold.",
	);
});

test("every worked example the studio offers runs on the site's keys as it opens", () => {
	const drafts = {
		travel: createExampleDraft(),
		live: createLiveExampleDraft(),
		narrator: createNarratorExampleDraft(),
		console: createConsoleExampleDraft(),
		decision: createDecisionExampleDraft(),
		span: createSpanExampleDraft(),
	};
	for (const [name, draft] of Object.entries(drafts)) {
		assert.deepEqual(issues(draft), [], name);
	}
	const architect = compileWorkspace(createArchitectWorkspace(), ON_SITE_KEYS);
	assert.deepEqual(architect.ok ? [] : architect.issues, [], 'architect');
});
