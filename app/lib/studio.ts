/**
 * Theorem Studio: the playground opened on a project. A local server
 * (`studio/serve.ts` in the package) hands the page the project's registered
 * profiles and tools as a workspace, and runs each profile's own code.
 */
import type { PlaygroundWorkspace } from '@theoremjs/playground';
import { createContext, useContext } from 'react';

/** Where the local server listens. Only this machine reaches it. */
const STUDIO_ENDPOINT = 'http://127.0.0.1:4983/api/studio';

export interface StudioSession {
	endpoint: string;
	/** The project's name. */
	project: string;
	/** The profiles the page could not show or run, and why. */
	problems: { profile: string; message: string }[];
}

/** Set while the page is a project's studio; `null` on the playground. */
export const StudioContext = createContext<StudioSession | null>(null);

export function useStudio(): StudioSession | null {
	return useContext(StudioContext);
}

/** The studio's session for a project already open: the run page names it in its address. */
export function studioSession(project: string): StudioSession {
	return { endpoint: STUDIO_ENDPOINT, project, problems: [] };
}

/** Where the studio runs the profile with this id. */
export function studioProfileEndpoint(studio: StudioSession, profileId: string): string {
	return `${studio.endpoint}/profiles/${encodeURIComponent(profileId)}`;
}

/** The project the local server has open. Throws when no server answers. */
export async function openStudio(): Promise<{
	studio: StudioSession;
	workspace: PlaygroundWorkspace;
}> {
	const response = await fetch(STUDIO_ENDPOINT);
	if (!response.ok) throw new Error(`The studio server answered ${response.status}.`);
	const { project, workspace, problems } = (await response.json()) as {
		project: string;
		workspace: PlaygroundWorkspace;
		problems: StudioSession['problems'];
	};
	return { studio: { endpoint: STUDIO_ENDPOINT, project, problems }, workspace };
}
