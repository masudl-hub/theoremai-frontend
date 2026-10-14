import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defineProfile } from '@theoremjs/agents';
import {
	compileStudio,
	createExampleDraft,
	createSpanExampleDraft,
	modelBindingViolation,
	modelRoute,
	newDecisionQuestion,
	type StudioDraft,
	type StudioIssue,
	setProfileType,
} from '@theoremjs/studio';
import { studioDecisionRequestSchema } from '../app/lib/.server/studio-decision-request.ts';
import { decisionStateViolation, SITE_KEYS } from '../app/lib/studio-keys.ts';

const ON_SITE_KEYS = { mode: 'demo', keys: SITE_KEYS } as const;

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
	for (const type of ['image', 'speech', 'live'] as const) {
		const draft = setProfileType(createExampleDraft(), type, SITE_KEYS);
		assert.deepEqual(
			draft.modelBindings.map((binding) => binding.apiId),
			[SITE_KEYS.models(type, 'google')[0]?.id],
		);
	}
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
	assert.equal(decisionStateViolation(route, 'request text'), null);
	assert.equal(decisionStateViolation(route, { input: 'request', output: 'response' }), null);
	assert.equal(
		decisionStateViolation(route, {
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
		assert.match(decisionStateViolation(route, state) ?? '', /Span state/);
	// Jev takes any JSON state.
	const jev = { ...route, adapter: 'typesafe', apiId: 'jev-latest' };
	assert.equal(decisionStateViolation(jev, { unrelated: true }), null);
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
