import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { TheoremError } from '@theoremjs/agents';
import { SECURITY_HEADERS, withSecurityHeaders } from '../app/lib/.server/security-headers.ts';
import {
	type AllowanceStore,
	DAILY_ALLOWANCES,
	gateStudioRequest,
	spendAllowance,
} from '../app/lib/.server/studio-allowance.ts';

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

test('every studio API request spends one of the day, and other paths spend nothing', async () => {
	const { store, counts } = memoryStore();
	assert.equal(await gateStudioRequest(post('/api/studio/test-key'), store, NOON), null);
	assert.equal(await gateStudioRequest(post('/api/studio/turn/steer'), store, NOON), null);
	assert.equal(await gateStudioRequest(post('/studio'), store, NOON), null);
	assert.equal(await gateStudioRequest(post('/api/kernel'), store, NOON), null);
	assert.equal(counts.get('2026-10-01:request:address:203.0.113.7'), 2);
	assert.equal(counts.get('2026-10-01:request:site'), 2);
});

test("an address past its day gets a 429 until UTC midnight, and others still get in", async () => {
	const { store, counts } = memoryStore();
	counts.set('2026-10-01:request:address:203.0.113.7', perAddress);
	const refused = await gateStudioRequest(post('/api/studio/turn'), store, NOON);
	assert.equal(refused?.status, 429);
	assert.equal(refused?.headers.get('retry-after'), String(12 * 60 * 60));
	const body = (await refused?.json()) as { error: string; errorKind: string };
	assert.equal(body.errorKind, 'rate_limit');
	assert.match(body.error, new RegExp(String(perAddress)));
	assert.equal(counts.get('2026-10-01:request:site'), undefined);
	assert.equal(await gateStudioRequest(post('/api/studio/turn', '198.51.100.2'), store, NOON), null);
	const tomorrow = NOON + 24 * 60 * 60 * 1000;
	assert.equal(await gateStudioRequest(post('/api/studio/turn'), store, tomorrow), null);
});

test("the site's day caps every address together", async () => {
	const { store, counts } = memoryStore();
	counts.set('2026-10-01:request:site', perSite);
	const refused = await gateStudioRequest(post('/api/studio/decide', '198.51.100.9'), store, NOON);
	assert.equal(refused?.status, 429);
});

test('with no store the studio API does not run', async () => {
	const refused = await gateStudioRequest(post('/api/studio/turn'), undefined, NOON);
	assert.equal(refused?.status, 503);
	assert.equal(await gateStudioRequest(post('/docs'), undefined, NOON), null);
});

test("a voice call spends the day's voice calls, and is refused with the cap once they are spent", async () => {
	const { store, counts } = memoryStore();
	const call = post('/api/live/relay');
	const { perAddress: calls } = DAILY_ALLOWANCES.live;
	await spendAllowance(store, 'live', call, NOON);
	assert.equal(counts.get('2026-10-01:live:address:203.0.113.7'), 1);
	counts.set('2026-10-01:live:address:203.0.113.7', calls);
	await assert.rejects(spendAllowance(store, 'live', call, NOON), (err: unknown) => {
		assert.ok(err instanceof TheoremError);
		assert.equal(err.kind, 'rate_limit');
		assert.deepEqual(err.copy, { key: 'quota.exhausted', params: { perDay: calls } });
		return true;
	});
	await assert.rejects(spendAllowance(undefined, 'live', call, NOON), { kind: 'config' });
});

test('every response carries the site headers, and a route keeps one it set itself', () => {
	const plain = withSecurityHeaders(new Response('ok'));
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		assert.equal(plain.headers.get(name), value);
	}
	const own = withSecurityHeaders(
		new Response('ok', { headers: { 'Referrer-Policy': 'no-referrer' } }),
	);
	assert.equal(own.headers.get('Referrer-Policy'), 'no-referrer');
	assert.equal(own.headers.get('X-Content-Type-Options'), 'nosniff');
});

test('the static files carry the same headers as the Worker sets', () => {
	const file = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
	const lines = file.split('\n').filter((line) => line.startsWith('  '));
	assert.deepEqual(
		lines.map((line) => line.trim()),
		Object.entries(SECURITY_HEADERS).map(([name, value]) => `${name}: ${value}`),
	);
});
