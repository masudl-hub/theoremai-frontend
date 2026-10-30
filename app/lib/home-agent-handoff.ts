import type { StudioWorkspace } from '@theoremjs/studio';

/** The studio's address when it opens on the agent the goals screen kept. */
export const HOME_AGENT_STUDIO = '/studio?from=home';

/**
 * The goals screen's workspace, held for the studio to open on.
 * why: Open Studio navigates within the page, so memory carries it; nothing is written to storage.
 */
let kept: StudioWorkspace | undefined;

/** Keep the whole Goals workspace (scout + pagereader, shared tools) for Open Studio. */
export function keepHomeAgent(workspace: StudioWorkspace) {
	kept = workspace;
}

/** The kept workspace, once. `undefined` when none was kept, as after a reload. */
export function takeHomeAgent(): StudioWorkspace | undefined {
	const taken = kept;
	kept = undefined;
	return taken;
}
