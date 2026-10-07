import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	compilePlayground,
	createExampleDraft,
	type PlaygroundRunPayload,
	setProfileType,
} from '@theoremjs/playground';
import { NO_PAGE_VALUES, pageInputsOf, sentPageValues } from '../app/lib/playground-page';

function payloadOf(draft: ReturnType<typeof createExampleDraft>): PlaygroundRunPayload {
	const compiled = compilePlayground(draft);
	if (!compiled.ok) throw new Error(JSON.stringify(compiled.issues));
	return { agentId: 'agent', profile: compiled.profile, customTools: compiled.customTools };
}

function withPage(type: 'text' | 'live') {
	const draft = setProfileType(createExampleDraft(), type);
	draft.inputs = {
		...draft.inputs,
		slotsJson: '{"language":["en","fr"]}',
		contextFrom: ['client'],
		contextMaxChars: 2000,
	};
	const at = draft.toolSpecs.findIndex((tool) => tool.toolType === 'function');
	draft.toolSpecs = draft.toolSpecs.map((tool, index) =>
		index === at ? { ...tool, answeredBy: 'page' as const } : tool,
	);
	return { payload: payloadOf(draft), toolName: draft.toolSpecs[at]?.toolName };
}

test('an agent that takes nothing from a page has no page inputs', () => {
	assert.deepEqual(pageInputsOf(payloadOf(createExampleDraft())), null);
});

test('a slot sends its first value until one is picked, and a dropped value falls back', () => {
	const inputs = pageInputsOf(withPage('text').payload);
	assert.deepEqual(sentPageValues(inputs, NO_PAGE_VALUES), { slots: { language: 'en' } });
	const picked = { slots: { language: 'fr' }, contextJson: '{"page":"Checkout"}' };
	assert.deepEqual(sentPageValues(inputs, picked), {
		slots: { language: 'fr' },
		context: { page: 'Checkout' },
	});
	assert.deepEqual(sentPageValues(inputs, { slots: { language: 'de' }, contextJson: '{' }), {
		slots: { language: 'en' },
		contextError: 'Context must be JSON.',
	});
});

test('a call and a chat both ask the page to answer a tool', () => {
	for (const type of ['live', 'text'] as const) {
		const agent = withPage(type);
		assert.deepEqual(pageInputsOf(agent.payload)?.pageTools, [agent.toolName]);
	}
});
