/**
 * The studio's steer inbox: the package's `SteerInbox` contract, held by a
 * Durable Object — one per inbox id, so a steer or stop POST that reaches
 * another isolate than the run still lands, and two steers sent at once both
 * queue (the object handles one call at a time). Dev runs in workerd too (the
 * Cloudflare Vite plugin), so there is one store everywhere.
 *
 * Keyed by an id the server picks when a text turn opens its inbox and sends
 * to its browser as the stream's first line.
 */

import { DurableObject } from 'cloudflare:workers';
import type { SteerInbox, SteerUnit } from '@theoremjs/react/server';

/** An inbox nobody touches for this long is deleted: a run that died without closing it. */
const IDLE_DELETE_MS = 15 * 60 * 1000;

const QUEUE_KEY = 'queue';
const STOPPED_KEY = 'stopped';

/** One inbox. Its queue lives in the object's own storage, so it outlives eviction. */
export class StudioSteerInbox extends DurableObject {
	/** The run's wait for a stop: held while the run streams, which keeps the object alive. */
	private readonly waiting = new Set<(stopped: boolean) => void>();

	private settle(stopped: boolean): void {
		for (const resolve of this.waiting) resolve(stopped);
		this.waiting.clear();
	}
	/** The queue, or `undefined` when no run has the inbox open. */
	private queue(): SteerUnit[] | undefined {
		return this.ctx.storage.kv.get<SteerUnit[]>(QUEUE_KEY);
	}

	private async save(queue: SteerUnit[]): Promise<void> {
		this.ctx.storage.kv.put(QUEUE_KEY, queue);
		await this.ctx.storage.setAlarm(Date.now() + IDLE_DELETE_MS);
	}

	async open(): Promise<void> {
		await this.save([]);
	}

	/** `false` when no run has the inbox open. */
	async enqueue(unit: SteerUnit): Promise<boolean> {
		const queue = this.queue();
		if (!queue) return false;
		queue.push(unit);
		await this.save(queue);
		return true;
	}

	async consume(): Promise<SteerUnit | undefined> {
		const queue = this.queue();
		if (!queue) return undefined;
		const next = queue.shift();
		await this.save(queue);
		return next;
	}

	/** `false` when no run has the inbox open. */
	stop(): Promise<boolean> {
		if (!this.queue()) return Promise.resolve(false);
		this.ctx.storage.kv.put(STOPPED_KEY, true);
		this.settle(true);
		return Promise.resolve(true);
	}

	/** `true` once the run is stopped, `false` once its inbox closes. */
	stopped(): Promise<boolean> {
		if (!this.queue()) return Promise.resolve(false);
		if (this.ctx.storage.kv.get<boolean>(STOPPED_KEY)) return Promise.resolve(true);
		return new Promise((resolve) => this.waiting.add(resolve));
	}

	async close(): Promise<void> {
		this.settle(false);
		await this.ctx.storage.deleteAll();
	}

	override async alarm(): Promise<void> {
		this.settle(false);
		await this.ctx.storage.deleteAll();
	}
}

/** The `SteerInbox` over the `STEER_INBOX` binding: each inbox id names its own object. */
export function studioSteerInbox(namespace: DurableObjectNamespace<StudioSteerInbox>): SteerInbox {
	// why: the stub type workers derive from the class walks the steer's JSON (a reasoning part's data)
	// past TypeScript's depth limit, so the calls are named from the class instead.
	const inbox = (inboxId: string) =>
		namespace.get(namespace.idFromName(inboxId)) as unknown as Pick<
			StudioSteerInbox,
			'open' | 'enqueue' | 'consume' | 'stop' | 'stopped' | 'close'
		>;
	return {
		open: (inboxId) => inbox(inboxId).open(),
		enqueue: (inboxId, unit) => inbox(inboxId).enqueue(unit),
		consume: (inboxId) => inbox(inboxId).consume(),
		stop: (inboxId) => inbox(inboxId).stop(),
		stopped: (inboxId) => inbox(inboxId).stopped(),
		close: (inboxId) => inbox(inboxId).close(),
	};
}
