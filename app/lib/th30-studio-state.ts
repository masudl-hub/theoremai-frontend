import { createSharedValue } from './shared-value';

/** The studio's live state, as th30 is told it. */
export type Th30StudioState = {
	agent: string;
	type: string;
	issues: number;
	section?: string;
};

const studio = createSharedValue<Th30StudioState | null>(null);

/** The studio reports what is on screen as it changes, and null when it closes. */
export function reportTh30Studio(next: Th30StudioState | null) {
	const now = studio.get();
	const same =
		next !== null &&
		now !== null &&
		next.agent === now.agent &&
		next.type === now.type &&
		next.issues === now.issues &&
		next.section === now.section;
	if (!same) studio.set(next);
}

export const useTh30StudioState = studio.use;
