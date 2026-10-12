import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
	manifestDrift,
	passageHash,
	SEARCH_MODEL,
	type SearchManifest,
} from '../app/lib/docs/search-model.ts';

const manifest: SearchManifest = {
	model: SEARCH_MODEL,
	vectors: 'vectors.test.bin',
	entries: [
		{ key: 'start', hash: 'a' },
		{ key: 'start#models', hash: 'b' },
	],
};

test('fresh vectors report no drift', () => {
	assert.deepEqual(manifestDrift(manifest, manifest.entries), []);
});

test('changed, new, gone and reordered entries are each named', () => {
	const changed = manifestDrift(manifest, [
		{ key: 'start', hash: 'changed' },
		{ key: 'start#models', hash: 'b' },
	]);
	assert.equal(changed.length, 1);
	assert.match(changed[0] ?? '', /start/);

	const grown = manifestDrift(manifest, [...manifest.entries, { key: 'tools', hash: 'c' }]);
	assert.match(grown.join(' '), /tools/);

	const shrunk = manifestDrift(manifest, [{ key: 'start', hash: 'a' }]);
	assert.match(shrunk.join(' '), /start#models/);

	const reordered = manifestDrift(manifest, [...manifest.entries].reverse());
	assert.notDeepEqual(reordered, []);
});

test('vectors made by another model are stale', () => {
	const other = { ...manifest, model: { ...SEARCH_MODEL, revision: 'other' } } as SearchManifest;
	assert.notDeepEqual(manifestDrift(other, manifest.entries), []);
});

test('a passage hashes to the same 64 hex digits every time, and a changed passage does not', async () => {
	const first = await passageHash('Models\nPick one.');
	assert.match(first, /^[0-9a-f]{64}$/);
	assert.equal(await passageHash('Models\nPick one.'), first);
	assert.notEqual(await passageHash('Models\nPick two.'), first);
});

test('the committed vectors file holds one unit-length row per manifest entry', () => {
	const dir = new URL('../public/docs-search/', import.meta.url);
	const committed = JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8')) as SearchManifest;
	const bytes = readFileSync(new URL(committed.vectors, dir));
	assert.equal(bytes.byteLength, committed.entries.length * SEARCH_MODEL.dims * 4);
	const data = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
	for (const row of [0, Math.floor(committed.entries.length / 2), committed.entries.length - 1]) {
		let sum = 0;
		for (let at = 0; at < SEARCH_MODEL.dims; at++)
			sum += (data[row * SEARCH_MODEL.dims + at] ?? 0) ** 2;
		assert.ok(Math.abs(sum - 1) < 0.01, `row ${String(row)} has length ${String(Math.sqrt(sum))}`);
	}
});
