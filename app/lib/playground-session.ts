/**
 * Where the playground keeps itself: this tab's sessionStorage, under the keys and in the record
 * shape the workspace store, its restore and the kept conversations share.
 */
import type { PLAYGROUND_WORKSPACE_VERSION, PlaygroundWorkspace } from '@theoremjs/playground';

export const WORKSPACE_KEY = 'theorem.playground.v2';
/** One conversation per agent, under this and the agent's key. */
export const CHAT_PREFIX = 'theorem.playground.v2.chat:';

/** A kept workspace, read back with its revision. */
export interface RestoredPlayground {
	workspace: PlaygroundWorkspace;
	revision: number;
}

/** What sessionStorage holds. */
export interface StoredWorkspace extends RestoredPlayground {
	v: typeof PLAYGROUND_WORKSPACE_VERSION;
}

/** This tab's sessionStorage, or null where there is none or it is blocked. */
export function session(): Storage | null {
	try {
		return typeof sessionStorage === 'undefined' ? null : sessionStorage;
	} catch {
		return null;
	}
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
