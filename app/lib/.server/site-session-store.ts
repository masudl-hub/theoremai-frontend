import { createMemorySessionStore, type TheoremSessionStore } from '@theoremjs/react/server';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A session store for the public site: the package's memory store sets no limits of its own. */
export function siteSessionStore(): TheoremSessionStore {
	return createMemorySessionStore({ ttlMs: DAY_MS, maxSessions: 10_000 });
}
