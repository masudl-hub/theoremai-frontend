import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	type AllowanceStore,
	DAILY_ALLOWANCES,
	gatePlaygroundRequest,
} from '../app/lib/.server/playground-allowance.ts';

/** Counters in memory, as the Durable Objects keep them. */
function memoryStore() {
	const counts = new Map<string, number>();
	const store: AllowanceStore = (name) => ({
		take: (limit) => {
			const count = counts.get(name) ?? 0;
			if (count >= limit) return Promise.resolve(false);
			counts.set(name, count + 1);
			return Promise.resolve(true);
		},
	});
	return { store, counts };
}

const NOON = Date.UTC(2026, 9, 1, 12);
const { perAddress, perSite } = DAILY_ALLOWANCES.request;

function post(path: string, address = '203.0.113.7') {
	return new Request(`https://theorem.test${path}`, {
		method: 'POST',
		headers: { 'CF-Connecting-IP': address },
	});
}

test('every playground API request spends one of the day, and other paths spend nothing', async () => {
	const { store, counts } = memoryStore();
	assert.equal(await gatePlaygroundRequest(post('/api/playground/test-key'), store, NOON), null);
	assert.equal(await gatePlaygroundRequest(post('/api/playground/turn/steer'), store, NOON), null);
	assert.equal(await gatePlaygroundRequest(post('/playground'), store, NOON), null);
	assert.equal(await gatePlaygroundRequest(post('/api/kernel'), store, NOON), null);
	assert.equal(counts.get('2026-10-01:request:address:203.0.113.7'), 2);
	assert.equal(counts.get('2026-10-01:request:site'), 2);
});

test("an address past its day gets a 429 until UTC midnight, and others still get in", async () => {
	const { store, counts } = memoryStore();
	counts.set('2026-10-01:request:address:203.0.113.7', perAddress);
	const refused = await gatePlaygroundRequest(post('/api/playground/turn'), store, NOON);
	assert.equal(refused?.status, 429);
	assert.equal(refused?.headers.get('retry-after'), String(12 * 60 * 60));
	const body = (await refused?.json()) as { error: string; errorKind: string };
	assert.equal(body.errorKind, 'rate_limit');
	assert.match(body.error, new RegExp(String(perAddress)));
	assert.equal(counts.get('2026-10-01:request:site'), undefined);
	assert.equal(await gatePlaygroundRequest(post('/api/playground/turn', '198.51.100.2'), store, NOON), null);
	const tomorrow = NOON + 24 * 60 * 60 * 1000;
	assert.equal(await gatePlaygroundRequest(post('/api/playground/turn'), store, tomorrow), null);
});

test("the site's day caps every address together", async () => {
	const { store, counts } = memoryStore();
	counts.set('2026-10-01:request:site', perSite);
	const refused = await gatePlaygroundRequest(post('/api/playground/decide', '198.51.100.9'), store, NOON);
	assert.equal(refused?.status, 429);
});

test('with no store the playground API does not run', async () => {
	const refused = await gatePlaygroundRequest(post('/api/playground/turn'), undefined, NOON);
	assert.equal(refused?.status, 503);
	assert.equal(await gatePlaygroundRequest(post('/docs'), undefined, NOON), null);
});
