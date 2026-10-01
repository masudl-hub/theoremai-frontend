/**
 * The playground's draft, kept in this tab's sessionStorage so it outlives a reload or a trip to
 * the docs and back. Every change bumps a revision, so th30 can tell its own edits from the
 * visitor's. Keys never come here: the vault stays in memory.
 */
import type { PlaygroundDraft } from '@theoremjs/playground';
import type { TheoremChat } from '@theoremjs/react/ui';
import type { ComponentProps } from 'react';

/** A chat conversation as TheoremChat reports and resumes it: the transcript and the model's memory. */
export type ChatSnapshot = NonNullable<ComponentProps<typeof TheoremChat>['initialChat']>;

const DRAFT_KEY = 'theorem.playground.v1';
const CHAT_KEY = 'theorem.playground.v1.chat';
const VERSION = 1;
const WRITE_MS = 300;
const LEDGER_SIZE = 100;
const CHANGES_SIZE = 50;
/** Past this, a stored conversation drops its media, then its oldest turns. */
const CHAT_BUDGET = 2_000_000;

export type DraftAuthor = 'th30' | 'visitor';

/** One th30 call the page answered; a replayed callId gets this back and applies nothing. */
export interface LedgerEntry {
	callId: string;
	tool: string;
	/** th30's own key for a whole-draft call, so a re-issued call under a new id applies once. */
	intent?: string;
	result: unknown;
	revision: number;
	at: number;
}

/** Which sections one change touched, and who made it. */
export interface DraftChange {
	revision: number;
	by: DraftAuthor;
	sections: string[];
}

interface StoredDraft {
	v: typeof VERSION;
	draft: PlaygroundDraft;
	revision: number;
	selectedId: string;
	ledger: LedgerEntry[];
}

export type RestoredPlayground = Omit<StoredDraft, 'v'>;

function session(): Storage | null {
	try {
		return typeof sessionStorage === 'undefined' ? null : sessionStorage;
	} catch {
		return null;
	}
}

function isStoredDraft(value: unknown): value is StoredDraft {
	if (typeof value !== 'object' || value === null) return false;
	const record = value as Partial<StoredDraft>;
	return (
		record.v === VERSION &&
		typeof record.draft === 'object' &&
		typeof record.draft.identity === 'object' &&
		Array.isArray(record.draft.modelBindings) &&
		typeof record.revision === 'number' &&
		typeof record.selectedId === 'string' &&
		Array.isArray(record.ledger)
	);
}

/**
 * The draft this tab last kept. `discarded` when one was there but could not be read back (an
 * older shape after a deploy, or a broken write); it is removed so the next load starts clean.
 */
export function restorePlayground():
	| { kind: 'restored'; value: RestoredPlayground }
	| { kind: 'none' | 'discarded' } {
	const store = session();
	const raw = store?.getItem(DRAFT_KEY);
	if (!store || !raw) return { kind: 'none' };
	try {
		const parsed: unknown = JSON.parse(raw);
		if (isStoredDraft(parsed)) {
			const { draft, revision, selectedId, ledger } = parsed;
			return { kind: 'restored', value: { draft, revision, selectedId, ledger } };
		}
	} catch {
		// Falls through to discard.
	}
	store.removeItem(DRAFT_KEY);
	store.removeItem(CHAT_KEY);
	return { kind: 'discarded' };
}

/** The top-level draft sections that differ; the draft is immutable, so identity is enough. */
function changedSections(before: PlaygroundDraft, after: PlaygroundDraft): string[] {
	const was: Record<string, unknown> = { ...before };
	const now: Record<string, unknown> = { ...after };
	const keys = new Set([...Object.keys(was), ...Object.keys(now)]);
	return [...keys].filter((key) => was[key] !== now[key]);
}

export type PlaygroundStore = ReturnType<typeof createPlaygroundStore>;

/**
 * The draft as an external store. `getDraft()` is current the moment `update` returns, before
 * React renders, so a th30 tool reads what it just did.
 */
export function createPlaygroundStore(initial: RestoredPlayground) {
	let draft = initial.draft;
	let revision = initial.revision;
	let selectedId = initial.selectedId;
	let ledger = initial.ledger.slice(-LEDGER_SIZE);
	let changes: DraftChange[] = [];
	const listeners = new Set<() => void>();
	let timer: ReturnType<typeof setTimeout> | undefined;

	const write = () => {
		timer = undefined;
		const record: StoredDraft = { v: VERSION, draft, revision, selectedId, ledger };
		try {
			session()?.setItem(DRAFT_KEY, JSON.stringify(record));
		} catch {
			// Quota or a blocked store: the page keeps working on what is in memory.
		}
	};
	const schedule = () => {
		timer ??= setTimeout(write, WRITE_MS);
	};

	return {
		getDraft: () => draft,
		getRevision: () => revision,
		getSelectedId: () => selectedId,
		/** Applies a change; a no-op keeps the revision. Returns the draft now held. */
		update(
			next: PlaygroundDraft | ((current: PlaygroundDraft) => PlaygroundDraft),
			by: DraftAuthor = 'visitor',
		): PlaygroundDraft {
			const value = typeof next === 'function' ? next(draft) : next;
			if (value === draft) return draft;
			const sections = changedSections(draft, value);
			draft = value;
			revision += 1;
			changes = [...changes, { revision, by, sections }].slice(-CHANGES_SIZE);
			schedule();
			for (const listener of listeners) listener();
			return draft;
		},
		select(id: string) {
			if (id === selectedId) return;
			selectedId = id;
			schedule();
		},
		/** Changes after `since`, oldest first; only the last 50 are kept. */
		changesSince: (since: number): DraftChange[] =>
			changes.filter((change) => change.revision > since),
		ledger: {
			get: (callId: string) => ledger.find((entry) => entry.callId === callId),
			byIntent: (intent: string, withinMs: number) =>
				ledger.findLast((entry) => entry.intent === intent && Date.now() - entry.at <= withinMs),
			add(entry: LedgerEntry) {
				ledger = [...ledger.filter((old) => old.callId !== entry.callId), entry].slice(
					-LEDGER_SIZE,
				);
				schedule();
			},
			recent: (count: number) => ledger.slice(-count),
		},
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		/** Writes now if a write is pending; the route calls it on pagehide and unmount. */
		flush() {
			if (timer === undefined) return;
			clearTimeout(timer);
			write();
		},
	};
}

/** Clears what this tab kept, the draft and the conversation. */
export function clearPlaygroundStorage(): void {
	const store = session();
	store?.removeItem(DRAFT_KEY);
	store?.removeItem(CHAT_KEY);
}

/** True for a value that carries media bytes: a long base64 `data` field or a data: URL. */
function isMedia(value: unknown): boolean {
	if (typeof value === 'string') return value.startsWith('data:') && value.length > 1024;
	if (typeof value !== 'object' || value === null) return false;
	const data: unknown = (value as { data?: unknown }).data;
	return typeof data === 'string' && data.length > 1024;
}

/** A copy with each media payload swapped for a note. */
function withoutMedia(value: unknown): unknown {
	if (isMedia(value)) return { omitted: 'media', note: 'Not kept after reload' };
	if (Array.isArray(value)) return value.map(withoutMedia);
	if (typeof value === 'object' && value !== null) {
		return Object.fromEntries(
			Object.entries(value).map(([key, inner]) => [key, withoutMedia(inner)]),
		);
	}
	return value;
}

/**
 * Keeps the preview conversation (its transcript and what the model remembers): whole while it
 * fits, then without media in either. Too big even then, nothing is kept. Never throws.
 */
export function saveConversation(snapshot: ChatSnapshot): void {
	const store = session();
	if (!store) return;
	const whole = JSON.stringify(snapshot);
	const lean = whole.length <= CHAT_BUDGET ? whole : JSON.stringify(withoutMedia(snapshot));
	try {
		if (lean.length <= CHAT_BUDGET) {
			store.setItem(CHAT_KEY, lean);
			return;
		}
	} catch {
		// Over quota: keep nothing rather than half a conversation.
	}
	try {
		store.removeItem(CHAT_KEY);
	} catch {
		// Nothing more to do.
	}
}

/** The kept conversation, when there is one in the shape the chat resumes from. */
export function restoreConversation(): ChatSnapshot | undefined {
	try {
		const raw = session()?.getItem(CHAT_KEY);
		if (!raw) return undefined;
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return undefined;
		const { blocks, session: kept } = parsed as { blocks?: unknown; session?: unknown };
		if (!Array.isArray(blocks) || typeof kept !== 'object' || kept === null) return undefined;
		return parsed as ChatSnapshot;
	} catch {
		return undefined;
	}
}

export function clearConversation(): void {
	try {
		session()?.removeItem(CHAT_KEY);
	} catch {
		// Nothing to clear.
	}
}
