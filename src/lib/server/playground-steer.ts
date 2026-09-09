/**
 * In-process steer inbox for playground turns.
 *
 * Local `vite dev` shares this map across the turn stream and steer POSTs.
 * Cloudflare isolates may not share memory — Durable Object / KV would be
 * needed for reliable production steers on Pages.
 */

import type { TurnHistoryMessage } from 'theorum';

type SteerUnit = TurnHistoryMessage[];

const inboxes = new Map<string, SteerUnit[]>();

export function openPlaygroundSteerInbox(turnId: string): void {
	if (!inboxes.has(turnId)) inboxes.set(turnId, []);
}

export function enqueuePlaygroundSteer(turnId: string, inject: TurnHistoryMessage[]): void {
	if (!inject.length) return;
	const queue = inboxes.get(turnId) ?? [];
	queue.push(inject.map((msg) => structuredClone(msg)));
	inboxes.set(turnId, queue);
}

/** One pending steer unit per barrier (FIFO). */
export function consumePlaygroundSteer(turnId: string): TurnHistoryMessage[] | undefined {
	const queue = inboxes.get(turnId);
	if (!queue?.length) return undefined;
	return queue.shift();
}

export function closePlaygroundSteerInbox(turnId: string): void {
	inboxes.delete(turnId);
}
