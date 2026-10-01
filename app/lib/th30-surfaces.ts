/**
 * th30's one way into the page: the surface runtime that answers its `look` and `act` calls.
 * Pages mount surfaces while they are open; the dock answers calls and relays notes.
 */
import { createSurfaceRuntime, type SurfaceLedgerEntry } from '@theoremjs/agents/surface';

const LEDGER_KEY = 'theorem.th30.ledger.v1';

type NoteListener = (line: string) => void;
const noteListeners = new Set<NoteListener>();
let opener: ((surfaceId: string) => void) | null = null;

function session(): Storage | null {
	try {
		return typeof sessionStorage === 'undefined' ? null : sessionStorage;
	} catch {
		return null;
	}
}

/** Answers are scrubbed before they are kept, so the ledger holds no secret. */
const ledger = {
	load(): SurfaceLedgerEntry[] {
		try {
			const parsed: unknown = JSON.parse(session()?.getItem(LEDGER_KEY) ?? '[]');
			return Array.isArray(parsed) ? (parsed as SurfaceLedgerEntry[]) : [];
		} catch {
			return [];
		}
	},
	save(entries: readonly SurfaceLedgerEntry[]) {
		try {
			session()?.setItem(LEDGER_KEY, JSON.stringify(entries));
		} catch {
			// Quota or a blocked store: replay then lasts only this page.
		}
	},
};

export const th30Surfaces = createSurfaceRuntime({
	open: (surfaceId) => opener?.(surfaceId),
	onNote: (line) => {
		for (const listener of noteListeners) listener(line);
	},
	ledger,
});

th30Surfaces.declare('playground', 'Playground, where the person builds an agent');

/** The dock opens a surface's page when th30 asks for one that isn't mounted. */
export function setTh30SurfaceOpener(next: ((surfaceId: string) => void) | null): void {
	opener = next;
}

/** A silent line for th30: what the person changed on the page, or a call's fate after the fact. */
export function onTh30Note(listener: NoteListener): () => void {
	noteListeners.add(listener);
	return () => {
		noteListeners.delete(listener);
	};
}
