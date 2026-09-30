/**
 * How much of the site's own keys and tools a visitor address, and the site as
 * a whole, may spend in a day: decisions on its provider keys, and host tool calls.
 * Held by a Durable Object — one per kind, address, and UTC day, and one per
 * kind for the site — so every isolate counts against the same number. A
 * builder who wants more brings their own key.
 */

import { DurableObject } from 'cloudflare:workers';

/** Each kind's daily caps: per visitor address, and for the whole site however many addresses ask. */
export const DAILY_ALLOWANCES = {
	decision: { perAddress: 10, perSite: 200 },
	call: { perAddress: 100, perSite: 2000 },
} as const;

export type AllowanceKind = keyof typeof DAILY_ALLOWANCES;

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

/** Spends one of today's `kind` for `address`, then one of the site's; the spent day's cap, or `null` when both had room. */
export async function takeAllowance(
	namespace: DurableObjectNamespace<PlaygroundDecideAllowance>,
	kind: AllowanceKind,
	address: string,
): Promise<number | null> {
	const { perAddress, perSite } = DAILY_ALLOWANCES[kind];
	const day = new Date().toISOString().slice(0, 10);
	const allowance = (name: string) => namespace.get(namespace.idFromName(`${day}:${kind}:${name}`));
	if (!(await allowance(`address:${address}`).take(perAddress))) return perAddress;
	return (await allowance('site').take(perSite)) ? null : perSite;
}
