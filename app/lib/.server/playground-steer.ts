/**
 * The playground's steer inbox: the package's `SteerInbox` contract, stored in
 * the Cache API (`caches.default`) so a steer POST that reaches another isolate
 * than the run still lands. Dev runs in workerd too (the Cloudflare Vite plugin),
 * so there is one store everywhere.
 *
 * Keyed by an id the server picks when a run opens its inbox: a text turn sends
 * it to its browser as the stream's first line, a live call as its session id.
 */

import type { SteerInbox, SteerUnit } from '@theoremai/react/server';

const CACHE_PREFIX = 'https://theorem.local/playground/steer/';
const CACHE_TTL_SECONDS = 60 * 15;

function inboxRequest(inboxId: string): Request {
	return new Request(`${CACHE_PREFIX}${encodeURIComponent(inboxId)}`);
}

/** Workers' shared cache. The DOM lib's `CacheStorage` type hides `default`, so it is narrowed here. */
function sharedCache(): Cache {
	const storage: object = caches;
	if (!('default' in storage) || !(storage.default instanceof Cache)) {
		throw new Error('steer: caches.default is missing; the playground runs in workerd');
	}
	return storage.default;
}

function isSteerUnit(value: unknown): value is SteerUnit {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		typeof value.id === 'string' &&
		'messages' in value &&
		Array.isArray(value.messages)
	);
}

/** The inbox's queue, or `undefined` when no run has it open. */
async function readQueue(inboxId: string): Promise<SteerUnit[] | undefined> {
	const hit = await sharedCache().match(inboxRequest(inboxId));
	if (!hit) return undefined;
	const body: unknown = await hit.json();
	const queue =
		typeof body === 'object' && body !== null && 'queue' in body ? body.queue : undefined;
	if (!Array.isArray(queue) || !queue.every(isSteerUnit)) {
		throw new Error(`steer: inbox ${inboxId} holds a malformed queue`);
	}
	return queue;
}

async function writeQueue(inboxId: string, queue: SteerUnit[]): Promise<void> {
	await sharedCache().put(
		inboxRequest(inboxId),
		new Response(JSON.stringify({ queue }), {
			headers: {
				'content-type': 'application/json',
				'cache-control': `max-age=${String(CACHE_TTL_SECONDS)}`,
			},
		}),
	);
}

export const playgroundSteerInbox: SteerInbox = {
	async open(inboxId) {
		await writeQueue(inboxId, []);
	},
	async enqueue(inboxId, unit) {
		const queue = await readQueue(inboxId);
		if (!queue) return false;
		queue.push(unit);
		await writeQueue(inboxId, queue);
		return true;
	},
	async consume(inboxId) {
		const queue = await readQueue(inboxId);
		const next = queue?.shift();
		if (queue && next) await writeQueue(inboxId, queue);
		return next;
	},
	async close(inboxId) {
		await sharedCache().delete(inboxRequest(inboxId));
	},
};
