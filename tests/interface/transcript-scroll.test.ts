/**
 * Unit checks for transcript scroll geometry.
 *
 * Run: npx vite-node tests/interface/transcript-scroll.test.ts
 */
import assert from 'node:assert/strict';
import {
	contentYFromViewport,
	findLastUserTurnEndIndex,
	isTranscriptUserBlockKind,
	resolvePinBottomToTopScrollTop,
	resolveScrollToBottomScrollTop,
	resolveTranscriptRunwayHeight,
} from '../../../theorum/react/src/client/transcript-scroll.ts';

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

test('resolveScrollToBottomScrollTop targets the live edge', () => {
	assert.equal(
		resolveScrollToBottomScrollTop({ scrollHeight: 1400, clientHeight: 600 }),
		800,
	);
	assert.equal(
		resolveScrollToBottomScrollTop({ scrollHeight: 400, clientHeight: 600 }),
		0,
	);
});

test('resolvePinBottomToTopScrollTop aligns anchor bottom to viewport top', () => {
	assert.equal(
		resolvePinBottomToTopScrollTop({ anchorBottom: 420, paddingTop: 0 }),
		420,
	);
	assert.equal(
		resolvePinBottomToTopScrollTop({ anchorBottom: 420, paddingTop: 44 }),
		376,
	);
	assert.equal(resolvePinBottomToTopScrollTop({ anchorBottom: 10, paddingTop: 40 }), 0);
});

test('resolveTranscriptRunwayHeight reserves top padding', () => {
	assert.equal(resolveTranscriptRunwayHeight({ clientHeight: 640 }), 640);
	assert.equal(
		resolveTranscriptRunwayHeight({ clientHeight: 640, reserveTopPx: 48 }),
		592,
	);
});

test('contentYFromViewport maps viewport coords into scroll content space', () => {
	assert.equal(
		contentYFromViewport({ viewportTop: 100, viewportY: 250, scrollTop: 80 }),
		230,
	);
});

test('findLastUserTurnEndIndex finds the trailing user turn', () => {
	assert.equal(findLastUserTurnEndIndex([]), null);
	assert.equal(
		findLastUserTurnEndIndex([
			{ kind: 'user-text' },
			{ kind: 'user-attachment' },
			{ kind: 'text' },
		]),
		1,
	);
	assert.equal(
		findLastUserTurnEndIndex([{ kind: 'user-text' }, { kind: 'user-voice' }]),
		1,
	);
	assert.equal(findLastUserTurnEndIndex([{ kind: 'text' }]), null);
	assert.equal(isTranscriptUserBlockKind('user-attachment'), true);
	assert.equal(isTranscriptUserBlockKind('media'), false);
});

if (failed > 0) {
	console.error(`\n${String(failed)} failed`);
	process.exit(1);
}

console.log('\nAll transcript-scroll checks passed.');
