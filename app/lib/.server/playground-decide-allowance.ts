/**
 * The Durable Object that holds one day's count of a playground allowance:
 * one object per kind, name and UTC day (`playground-allowance.ts` holds the
 * policy). It deletes itself once the day is over.
 */

import { DurableObject } from 'cloudflare:workers';
import {
	type AllowanceKind,
	type AllowanceStore,
	takeAllowance as takeFrom,
} from './playground-allowance';

const DAY_MS = 24 * 60 * 60 * 1000;
const COUNT_KEY = 'count';

/** One day's count. It deletes itself once the day is over. */
export class PlaygroundDecideAllowance extends DurableObject {
	/** Counts one use; `false` when the day's `limit` is already spent. */
	async take(limit: number): Promise<boolean> {
		const count = this.ctx.storage.kv.get<number>(COUNT_KEY) ?? 0;
		if (count >= limit) return false;
		this.ctx.storage.kv.put(COUNT_KEY, count + 1);
		// Next UTC midnight: the day's count is no use after it.
		if (count === 0) await this.ctx.storage.setAlarm(Math.ceil(Date.now() / DAY_MS) * DAY_MS);
		return true;
	}

	override async alarm(): Promise<void> {
		await this.ctx.storage.deleteAll();
	}
}

/** The allowance counters, one Durable Object per name. */
export function allowanceStore(
	namespace: DurableObjectNamespace<PlaygroundDecideAllowance>,
): AllowanceStore {
	return (name) => namespace.get(namespace.idFromName(name));
}

/** Spends one of today's `kind` for `address`, then one of the site's; the spent day's cap, or `null` when both had room. */
export function takeAllowance(
	namespace: DurableObjectNamespace<PlaygroundDecideAllowance>,
	kind: AllowanceKind,
	address: string,
): Promise<number | null> {
	return takeFrom(allowanceStore(namespace), kind, address);
}
