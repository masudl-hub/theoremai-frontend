/**
 * Unit checks for live caption turn folding.
 *
 * Run: npx vite-node tests/interface/live-captions.test.ts
 */
import assert from 'node:assert/strict';
import {
	applyLiveTranscript,
	clearLiveCaptionInterim,
	emptyLiveCaptionState,
} from '../../../theorum/react/src/client/live/live-captions.ts';

function ok(label: string) {
	console.log(`  ✓ ${label}`);
}

let failed = 0;

function test(label: string, fn: () => void) {
	try {
		fn();
		ok(label);
	} catch (err) {
		failed += 1;
		const message = err instanceof Error ? err.message : String(err);
		console.error(`  ✗ ${label}: ${message}`);
	}
}

test('appends final chunks for the same role into one turn', () => {
	let state = emptyLiveCaptionState();
	state = applyLiveTranscript(state, 'Howdy!', false, false);
	state = applyLiveTranscript(state, " I'm", false, false);
	state = applyLiveTranscript(state, ' here', false, false);

	assert.equal(state.turns.length, 1);
	assert.equal(state.turns[0]?.text, "Howdy! I'm here");
});

test('starts a new turn when the role changes', () => {
	let state = emptyLiveCaptionState();
	state = applyLiveTranscript(state, 'Hello', true, false);
	state = applyLiveTranscript(state, 'Hi there', false, false);

	assert.equal(state.turns.length, 2);
	assert.deepEqual(state.turns[0], { role: 'user', text: 'Hello', id: state.turns[0]?.id });
	assert.deepEqual(state.turns[1], { role: 'agent', text: 'Hi there', id: state.turns[1]?.id });
});

test('merges interim text into the first committed chunk for a role', () => {
	let state = emptyLiveCaptionState();
	state = applyLiveTranscript(state, 'hello', true, true);
	assert.equal(state.interimUser, 'hello');
	assert.equal(state.turns.length, 0);

	state = applyLiveTranscript(state, 'hello', true, false);
	assert.equal(state.interimUser, '');
	assert.equal(state.turns.length, 1);
	assert.equal(state.turns[0]?.text, 'hello');
});

test('forceNew commits explicit text sends as their own turn', () => {
	let state = emptyLiveCaptionState();
	state = applyLiveTranscript(state, 'voice hello', true, false);
	state = applyLiveTranscript(state, 'typed follow-up', true, false, { forceNew: true });

	assert.equal(state.turns.length, 2);
	assert.equal(state.turns[0]?.text, 'voice hello');
	assert.equal(state.turns[1]?.text, 'typed follow-up');
});

test('clearLiveCaptionInterim clears partial caption buffers', () => {
	const state = {
		turns: [],
		interimUser: 'partial',
		interimAgent: 'thinking',
	};
	const cleared = clearLiveCaptionInterim(state);
	assert.equal(cleared.interimUser, '');
	assert.equal(cleared.interimAgent, '');
});

if (failed > 0) {
	console.error(`\n${String(failed)} live-captions test(s) failed`);
	process.exit(1);
}

console.log(`\nAll live-captions tests passed.`);
