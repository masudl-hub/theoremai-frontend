import { STUDIO_WORKSPACE_VERSION, type StudioWorkspace } from '@theoremjs/studio';

/** The goals screen's workspace, kept in this tab for the studio to open on. */
const HOME_WORKSPACE_KEY = 'theorem.home.workspace';

/** The studio's address when it opens on the agent the goals screen kept. */
export const HOME_AGENT_STUDIO = '/studio?from=home';

function isHomeWorkspace(value: unknown): value is StudioWorkspace {
	if (!value || typeof value !== 'object') return false;
	const workspace = value as Partial<StudioWorkspace>;
	return (
		workspace.v === STUDIO_WORKSPACE_VERSION &&
		Array.isArray(workspace.agents) &&
		workspace.agents.length > 0 &&
		Array.isArray(workspace.toolSpecs) &&
		typeof workspace.chatWith === 'string' &&
		typeof workspace.selected === 'string'
	);
}

/** Keep the whole Goals workspace (scout + pagereader, shared tools) for Open Studio. */
export function keepHomeAgent(workspace: StudioWorkspace) {
	try {
		sessionStorage.setItem(HOME_WORKSPACE_KEY, JSON.stringify(workspace));
	} catch {
		// With no storage, the studio opens on its own example.
	}
}

/** The kept workspace, once. `undefined` when none was kept or it cannot be read. */
export function takeHomeAgent(): StudioWorkspace | undefined {
	try {
		const kept = sessionStorage.getItem(HOME_WORKSPACE_KEY);
		if (!kept) return undefined;
		sessionStorage.removeItem(HOME_WORKSPACE_KEY);
		const parsed: unknown = JSON.parse(kept);
		return isHomeWorkspace(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}
