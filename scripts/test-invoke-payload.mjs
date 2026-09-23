/**
 * Unit checks for playground invoke/turn request builders.
 *
 * Run: npm run test:invoke-payload
 */
import assert from 'node:assert/strict';
import { emptyInterfaceTurnSession } from '@theoremai/agents/interface';
import {
	buildInvokeRequest,
	buildTurnRequest,
	turnInputFromSession,
} from '../../theoremai/react/src/client/turn-client.ts';

import { createTestRunner } from './_test-harness.mjs';

const { test, exit } = createTestRunner();
// The builders only read the model/effort selection fields of the interface.
const ifaceOf = (p) => p.profile;

const payload = {
	profile: {
		type: 'text',
		id: 'demo',
		defaultModel: 'geminiFlash',
		models: {},
	},
	customTools: [],
	structured: undefined,
};

test('turnInputFromSession carries history and token counters', () => {
	const session = {
		...emptyInterfaceTurnSession(),
		history: [{ role: 'user', content: 'hi' }],
		inputTokens: 3,
		historyTokens: 12,
	};
	const input = turnInputFromSession(session, { text: 'next' });
	assert.equal(input.text, 'next');
	assert.deepEqual(input.history, session.history);
	assert.equal(input.inputTokens, 3);
	assert.equal(input.historyTokens, 12);
});

test('buildTurnRequest includes session permissions and interaction id', () => {
	const session = {
		...emptyInterfaceTurnSession(),
		previousInteractionId: 'ix-1',
		sessionPermissions: ['search'],
	};
	const body = buildTurnRequest(ifaceOf(payload), session, { text: 'hello' });
	assert.equal(body.previousInteractionId, 'ix-1');
	assert.deepEqual(body.sessionPermissions, ['search']);
	assert.equal(body.input.text, 'hello');
	assert.equal(body.model, undefined);
});

test('buildTurnRequest forwards selected model when allowModelSelect is set', () => {
	const selectablePayload = {
		...payload,
		profile: {
			...payload.profile,
			allowModelSelect: true,
			models: {
				fast: { protocol: 'gemini', provider: 'google', apiId: 'fast-model' },
				smart: { protocol: 'gemini', provider: 'google', apiId: 'smart-model' },
			},
			defaultModel: 'fast',
		},
	};
	const session = {
		...emptyInterfaceTurnSession(),
		selectedModel: 'smart',
	};
	const body = buildTurnRequest(ifaceOf(selectablePayload), session, { text: 'hello' });
	assert.equal(body.model, 'smart');
});

test('buildTurnRequest forwards selected effort when model allows effort select', () => {
	const selectablePayload = {
		...payload,
		profile: {
			...payload.profile,
			models: {
				fast: {
					protocol: 'gemini',
					provider: 'google',
					apiId: 'fast-model',
					allowEffortSelect: true,
					efforts: { fast: 'minimal', deep: 'high' },
					defaultEffort: 'fast',
				},
			},
			defaultModel: 'fast',
		},
	};
	const session = {
		...emptyInterfaceTurnSession(),
		selectedModel: 'fast',
		selectedEffort: 'deep',
	};
	const body = buildTurnRequest(ifaceOf(selectablePayload), session, { text: 'hello' });
	assert.equal(body.effort, 'deep');
});

test('buildInvokeRequest forwards snapshot, promoted, and model', () => {
	const selectablePayload = {
		...payload,
		profile: {
			...payload.profile,
			allowModelSelect: true,
			models: {
				fast: { protocol: 'gemini', provider: 'google', apiId: 'fast-model' },
				smart: { protocol: 'gemini', provider: 'google', apiId: 'smart-model' },
			},
			defaultModel: 'fast',
		},
	};
	const session = {
		...emptyInterfaceTurnSession(),
		selectedModel: 'smart',
		promotedToolIds: ['search', 'book'],
		toolSnapshot: {
			turnId: 't1',
			tools: [{ name: 'search', phase: 'complete' }],
		},
	};
	const body = buildInvokeRequest(ifaceOf(selectablePayload), session, {
		name: 'search',
		input: { q: 'hotels' },
		resume: { granted: true },
	});
	assert.equal(body.name, 'search');
	assert.deepEqual(body.promoted, ['search', 'book']);
	assert.equal(body.snapshot?.turnId, 't1');
	assert.equal(body.model, 'smart');
	assert.deepEqual(body.turnInput?.history, []);
});

exit();
