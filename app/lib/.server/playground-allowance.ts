/**
 * The playground's daily allowances, in one table: how much a visitor address,
 * and the site as a whole, may spend in a UTC day. Every playground API request
 * spends one `request`. Requests that spend the site's own keys or network
 * spend their own kind on top. A builder who wants more brings their own key.
 *
 * The counts live in Durable Objects (`playground-decide-allowance.ts`), so every
 * isolate counts against the same number. This module takes them as a plain
 * counter store, so the policy runs anywhere.
 */

import { errorKind, publicError, TheoremError } from '@theoremjs/agents';

/** Each kind's daily caps, per visitor address and for the whole site however many addresses ask. */
export const DAILY_ALLOWANCES = {
	/** Any request to /api/playground/*. */
	request: { perAddress: 150, perSite: 3000 },
	/** A decision on the site's TypeSafe key. */
	decision: { perAddress: 10, perSite: 200 },
	/** A host tool call, run on the site's network. */
	call: { perAddress: 100, perSite: 2000 },
} as const;

export type AllowanceKind = keyof typeof DAILY_ALLOWANCES;

/** One named day's count. */
export type AllowanceCounter = {
	/** Counts one use; `false` when the day's `limit` is already spent. */
	take(limit: number): Promise<boolean>;
};

/** The counters, by name. */
export type AllowanceStore = (name: string) => AllowanceCounter;

const DAY_MS = 24 * 60 * 60 * 1000;
const PLAYGROUND_API = '/api/playground/';

/** Who is asking, as Cloudflare saw them; `local` in dev. */
export function visitorAddress(request: Request): string {
	return request.headers.get('CF-Connecting-IP') ?? 'local';
}

/** Spends one of today's `kind` for `address`, then one of the site's; the spent day's cap, or `null` when both had room. */
export async function takeAllowance(
	store: AllowanceStore,
	kind: AllowanceKind,
	address: string,
	now = Date.now(),
): Promise<number | null> {
	const { perAddress, perSite } = DAILY_ALLOWANCES[kind];
	const day = new Date(now).toISOString().slice(0, 10);
	if (!(await store(`${day}:${kind}:address:${address}`).take(perAddress))) return perAddress;
	return (await store(`${day}:${kind}:site`).take(perSite)) ? null : perSite;
}

/**
 * Spends one playground request, before any route sees it. `null` lets the
 * request through; otherwise the 429 to send. Other paths pass untouched. With
 * no store, the playground API does not run at all.
 */
export async function gatePlaygroundRequest(
	request: Request,
	store: AllowanceStore | undefined,
	now = Date.now(),
): Promise<Response | null> {
	if (!new URL(request.url).pathname.startsWith(PLAYGROUND_API)) return null;
	if (!store) {
		// lexicon-exempt: developer contract error
		return refusal(new TheoremError('config', 'playground: no allowance store'), 503, now);
	}
	const cap = await takeAllowance(store, 'request', visitorAddress(request), now);
	if (cap === null) return null;
	// lexicon-exempt: internal diagnostic; the user reads quota.exhausted
	const spent = new TheoremError('rate_limit', "playground: today's requests are spent", {
		copy: { key: 'quota.exhausted', params: { perDay: cap } },
	});
	return refusal(spent, 429, now);
}

function refusal(err: TheoremError, status: number, now: number): Response {
	const headers: Record<string, string> = { 'cache-control': 'no-store' };
	if (status === 429) {
		// Seconds until the next UTC midnight, when the day's counts start over.
		headers['retry-after'] = String(Math.ceil((Math.ceil(now / DAY_MS) * DAY_MS - now) / 1000));
	}
	return Response.json({ error: publicError(err), errorKind: errorKind(err) }, { status, headers });
}
