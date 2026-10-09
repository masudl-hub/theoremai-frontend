import { useSyncExternalStore } from 'react';

/** The studio's live state, as th30 is told it. */
export type Th30StudioState = {
	agent: string;
	type: string;
	issues: number;
	section?: string;
};

let studioState: Th30StudioState | null = null;
const listeners = new Set<() => void>();

/** The studio reports what is on screen as it changes, and null when it closes. */
export function reportTh30Studio(next: Th30StudioState | null) {
	const same =
		next === studioState ||
		(next !== null &&
			studioState !== null &&
			next.agent === studioState.agent &&
			next.type === studioState.type &&
			next.issues === studioState.issues &&
			next.section === studioState.section);
	if (same) return;
	studioState = next;
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function useTh30StudioState(): Th30StudioState | null {
	return useSyncExternalStore(
		subscribe,
		() => studioState,
		() => null,
	);
}
