/**
 * Unit checks for shared tool pause/resume helpers.
 *
 * Run: npm run test:tool-resume
 */
import assert from 'node:assert/strict';
import {
	parsePlaygroundLiveToolResult,
	toolInvokeResultFromEvents,
} from '../../theorum/react/src/client/playground-tool-result.ts';
import {
	applyToolDecisionToSessionPermissions,
	buildInvokeToolResume,
	continuePausedToolInvocation,
} from '../../theorum/react/src/client/tool-resume.ts';

import { createTestRunner } from './_test-harness.mjs';

const { test, exit } = createTestRunner();
test('buildInvokeToolResume requires explicit interactive value', () => {
	assert.deepEqual(buildInvokeToolResume('interactive', 'picked'), { value: 'picked' });
	assert.deepEqual(buildInvokeToolResume('interactive', true), { value: true });
	assert.throws(() => buildInvokeToolResume('interactive'), /requires a chosen option/);
});

test('buildInvokeToolResume uses granted for permission pauses', () => {
	assert.deepEqual(buildInvokeToolResume('permission'), { granted: true });
	assert.deepEqual(buildInvokeToolResume('confirmation'), { granted: true });
});

test('applyToolDecisionToSessionPermissions grants session on allow_session', () => {
	const next = applyToolDecisionToSessionPermissions([], 'delete_resource', 'allow_session');
	assert.deepEqual(next, ['delete_resource']);
});

test('applyToolDecisionToSessionPermissions grants one-shot session_consent on allow', () => {
	const next = applyToolDecisionToSessionPermissions(
		[],
		'delete_resource',
		'allow',
		'session_consent',
	);
	assert.deepEqual(next, ['delete_resource']);
});

test('continuePausedToolInvocation denies without resume', () => {
	const result = continuePausedToolInvocation({
		toolName: 'search',
		pause: { kind: 'permission', permission: 'always_confirm' },
		sessionPermissions: [],
		resolution: { action: 'deny' },
	});
	assert.equal(result.kind, 'denied');
});

test('continuePausedToolInvocation resumes interactive tools with value', () => {
	const result = continuePausedToolInvocation({
		toolName: 'ask_user',
		pause: { kind: 'interactive' },
		sessionPermissions: [],
		resolution: { action: 'allow', interactiveValue: 'yes' },
	});
	assert.equal(result.kind, 'continue');
	if (result.kind !== 'continue') return;
	assert.deepEqual(result.resume, { value: 'yes' });
});

test('parsePlaygroundLiveToolResult accepts paused API payloads', () => {
	const result = parsePlaygroundLiveToolResult({
		status: 'paused',
		toolName: 'delete_resource',
		pause: {
			kind: 'permission',
			tool: 'delete_resource',
			permission: 'session_consent',
			input: { id: '1' },
		},
		input: { id: '1' },
	});
	assert.equal(result.status, 'paused');
	if (result.status !== 'paused') return;
	assert.equal(result.pause.kind, 'permission');
});

test('parsePlaygroundLiveToolResult rejects malformed payloads', () => {
	assert.throws(() => parsePlaygroundLiveToolResult({ status: 'paused' }));
	assert.throws(() => parsePlaygroundLiveToolResult(null));
});

test('toolInvokeResultFromEvents maps pause events', () => {
	const result = toolInvokeResultFromEvents(
		[
			{
				type: 'tool',
				tool: {
					name: 'delete_resource',
					phase: 'pause',
					pause: {
						kind: 'permission',
						tool: 'delete_resource',
						permission: 'session_consent',
						input: { id: '1' },
					},
				},
			},
		],
		'delete_resource',
		{ id: '1' },
	);
	assert.equal(result.status, 'paused');
	if (result.status !== 'paused') return;
	assert.equal(result.pause.kind, 'permission');
});

exit();
