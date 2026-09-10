/**
 * Playground mid-turn steer inbox.
 *
 * Prefer the Cache API when available (Cloudflare Pages / Workers share
 * `caches.default` across isolates). Fall back to process memory for local
 * Vite/Node where Cache is absent — same process, Map is correct.
 */

import type { TurnHistoryMessage } from 'theorum';

type SteerUnit = TurnHistoryMessage[];

type CacheLike = {
	match: (request: RequestInfo) => Promise<Response | undefined>;
	put: (request: RequestInfo, response: Response) => Promise<void>;
	delete: (request: RequestInfo) => Promise<boolean>;
};

const MEMORY = new Map<string, SteerUnit[]>();
const CACHE_PREFIX = 'https://theorum.local/playground/steer/';
const CACHE_TTL_SECONDS = 60 * 15;

function steerRequest(turnId: string): Request {
	return new Request(`${CACHE_PREFIX}${encodeURIComponent(turnId)}`);
}

function sharedCache(): CacheLike | null {
	const cachesObj = (globalThis as { caches?: { default?: CacheLike } }).caches;
	const cache = cachesObj?.default;
	if (!cache || typeof cache.match !== 'function') return null;
	return cache;
}

async function readCacheQueue(turnId: string): Promise<SteerUnit[]> {
	const cache = sharedCache();
	if (!cache) return [];
	const hit = await cache.match(steerRequest(turnId));
	if (!hit) return [];
	try {
		const body = (await hit.json()) as { queue?: SteerUnit[] };
		return Array.isArray(body.queue) ? body.queue : [];
	} catch {
		return [];
	}
}

async function writeCacheQueue(turnId: string, queue: SteerUnit[]): Promise<void> {
	const cache = sharedCache();
	if (!cache) return;
	if (queue.length === 0) {
		await cache.delete(steerRequest(turnId));
		return;
	}
	const response = new Response(JSON.stringify({ queue }), {
		headers: {
			'content-type': 'application/json',
			'cache-control': `max-age=${String(CACHE_TTL_SECONDS)}`,
		},
	});
	await cache.put(steerRequest(turnId), response);
}

export async function openPlaygroundSteerInbox(turnId: string): Promise<void> {
	if (!MEMORY.has(turnId)) MEMORY.set(turnId, []);
	if (sharedCache()) {
		const existing = await readCacheQueue(turnId);
		if (existing.length === 0) await writeCacheQueue(turnId, []);
	}
}

export async function enqueuePlaygroundSteer(
	turnId: string,
	inject: TurnHistoryMessage[],
): Promise<void> {
	if (!inject.length) return;
	const unit = inject.map((msg) => structuredClone(msg));

	const memoryQueue = MEMORY.get(turnId) ?? [];
	memoryQueue.push(unit);
	MEMORY.set(turnId, memoryQueue);

	if (sharedCache()) {
		const cacheQueue = await readCacheQueue(turnId);
		cacheQueue.push(unit);
		await writeCacheQueue(turnId, cacheQueue);
	}
}

/** One pending steer unit per barrier (FIFO). */
export async function consumePlaygroundSteer(
	turnId: string,
): Promise<TurnHistoryMessage[] | undefined> {
	const memoryQueue = MEMORY.get(turnId);
	if (memoryQueue?.length) {
		const next = memoryQueue.shift();
		if (sharedCache()) {
			await writeCacheQueue(turnId, memoryQueue);
		}
		return next;
	}

	if (!sharedCache()) return undefined;

	const cacheQueue = await readCacheQueue(turnId);
	if (!cacheQueue.length) return undefined;
	const next = cacheQueue.shift();
	await writeCacheQueue(turnId, cacheQueue);
	return next;
}

/**
 * Barrier consume with a short retry so a steer POST that lands in another
 * isolate just as the barrier fires still delivers.
 */
export async function consumePlaygroundSteerWithRetry(
	turnId: string,
	options: { retries?: number; delayMs?: number } = {},
): Promise<TurnHistoryMessage[] | undefined> {
	const retries = options.retries ?? 1;
	const delayMs = options.delayMs ?? 25;
	for (let attempt = 0; attempt <= retries; attempt += 1) {
		const inject = await consumePlaygroundSteer(turnId);
		if (inject?.length) return inject;
		if (attempt < retries) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}
	return undefined;
}

export async function closePlaygroundSteerInbox(turnId: string): Promise<void> {
	MEMORY.delete(turnId);
	const cache = sharedCache();
	if (cache) {
		await cache.delete(steerRequest(turnId));
	}
}
