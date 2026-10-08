import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveSitePath } from '../app/lib/site-path.ts';

const known = (slug: string) => slug === 'start';

test('resolveSitePath opens site pages and a known docs chapter', () => {
	assert.deepEqual(resolveSitePath('/studio', known), {
		ok: true,
		href: '/studio',
		hash: undefined,
	});
	assert.deepEqual(resolveSitePath('/docs/start#live.vad', known), {
		ok: true,
		href: '/docs/start#live.vad',
		hash: 'live.vad',
	});
	assert.deepEqual(resolveSitePath('overview', known), {
		ok: true,
		href: '/overview',
		hash: undefined,
	});
});

test('resolveSitePath refuses another origin and an unknown chapter', () => {
	assert.equal(resolveSitePath('https://example.com', known).ok, false);
	assert.equal(resolveSitePath('//example.com', known).ok, false);
	assert.equal(resolveSitePath('/docs/../studio', known).ok, false);
	assert.equal(resolveSitePath('/docs/missing', known).ok, false);
	assert.equal(resolveSitePath('/api/kernel', known).ok, false);
});
