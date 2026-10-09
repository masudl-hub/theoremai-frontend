/** The goals screen's agent, kept in this tab for the studio to open on. */
const HOME_AGENT_KEY = 'theorem.home.agent';

/** The studio's address when it opens on the agent the goals screen kept. */
export const HOME_AGENT_STUDIO = '/studio?from=home';

export function keepHomeAgent(draft: object) {
	try {
		sessionStorage.setItem(HOME_AGENT_KEY, JSON.stringify(draft));
	} catch {
		// With no storage, the studio opens on its own example.
	}
}

/** The kept agent, once. `undefined` when none was kept or it cannot be read. */
export function takeHomeAgent(): object | undefined {
	try {
		const kept = sessionStorage.getItem(HOME_AGENT_KEY);
		if (!kept) return undefined;
		sessionStorage.removeItem(HOME_AGENT_KEY);
		const draft: unknown = JSON.parse(kept);
		return draft && typeof draft === 'object' && 'identity' in draft ? draft : undefined;
	} catch {
		return undefined;
	}
}
