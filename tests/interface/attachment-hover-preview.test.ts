/**
 * Unit checks for attachment hover-preview geometry.
 *
 * Run: npx vite-node tests/interface/attachment-hover-preview.test.ts
 */
import assert from 'node:assert/strict';
import {
	clampAttachPreviewLeft,
	formatAttachmentSize,
	resolveAttachPreviewStyle,
} from '../../../theorum/react/src/client/attachment-hover-preview.ts';

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

test('formatAttachmentSize covers B/KB/MB', () => {
	assert.equal(formatAttachmentSize(0), '');
	assert.equal(formatAttachmentSize(512), '512 B');
	assert.equal(formatAttachmentSize(2048), '2.0 KB');
	assert.equal(formatAttachmentSize(2 * 1024 * 1024), '2.0 MB');
});

test('clampAttachPreviewLeft keeps the card on-screen', () => {
	assert.equal(clampAttachPreviewLeft(0, 800), 8);
	assert.equal(clampAttachPreviewLeft(700, 800), 800 - 240 - 8);
	assert.equal(clampAttachPreviewLeft(100, 800), 100);
});

test('resolveAttachPreviewStyle prefers above when there is room', () => {
	const above = resolveAttachPreviewStyle(
		{ left: 40, top: 220, bottom: 250 },
		{ width: 800, height: 600 },
	);
	assert.equal(above.left, 40);
	assert.equal(above.bottom, 600 - 220 + 6);
	assert.equal(above.top, undefined);

	const below = resolveAttachPreviewStyle(
		{ left: 40, top: 40, bottom: 70 },
		{ width: 800, height: 600 },
	);
	assert.equal(below.top, 70 + 6);
	assert.equal(below.bottom, undefined);
});

if (failed > 0) {
	console.error(`\n${String(failed)} failed`);
	process.exit(1);
}

console.log('\nAll attachment-hover-preview checks passed.');
