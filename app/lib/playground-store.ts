/**
 * The playground's workspace, kept in this tab's sessionStorage so it outlives a reload or a trip
 * to the docs and back. Every change bumps a revision, so th30 can tell its own edits from the
 * visitor's. Keys never come here: the vault stays in memory, and a tool's URLs and headers are kept
 * with their credentials masked. A draft kept by the one-agent playground opens as a workspace
 * holding it.
 */
import { maskHeaders, maskUrl } from '@theoremjs/agents/surface';
import {
	agentDraft,
	agentNodeId,
	createBlankDraft,
	libraryDraft,
	PLAYGROUND_WORKSPACE_VERSION,
	type PlaygroundDraft,
	type PlaygroundWorkspace,
	withLibraryDraft,
	workspaceFromDraft,
} from '@theoremjs/playground';
import type { TheoremChat } from '@theoremjs/react/ui';
import type { ComponentProps } from 'react';

/** A chat conversation as TheoremChat reports and resumes it: the transcript and the model's memory. */
export type ChatSnapshot = NonNullable<ComponentProps<typeof TheoremChat>['initialChat']>;

const WORKSPACE_KEY = 'theorem.playground.v2';
/** One conversation per agent, under this and the agent's key. */
const CHAT_PREFIX = 'theorem.playground.v2.chat:';
const V1_DRAFT_KEY = 'theorem.playground.v1';
const V1_CHAT_KEY = 'theorem.playground.v1.chat';
const WRITE_MS = 300;
const CHANGES_SIZE = 50;
/** Past this, a stored conversation drops its media, then its oldest turns. */
const CHAT_BUDGET = 2_000_000;

export type DraftAuthor = 'th30' | 'visitor';

/** Which sections one change touched, and who made it. */
export interface DraftChange {
	revision: number;
	by: DraftAuthor;
	sections: string[];
}

/** A kept workspace, read back with its revision. */
export interface RestoredPlayground {
	workspace: PlaygroundWorkspace;
	revision: number;
}

/** What sessionStorage holds. */
interface StoredWorkspace extends RestoredPlayground {
	v: typeof PLAYGROUND_WORKSPACE_VERSION;
}

function session(): Storage | null {
	try {
		return typeof sessionStorage === 'undefined' ? null : sessionStorage;
	} catch {
		return null;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * True when `value` has every section `shape` has, all the way down, and lists, text and
 * switches where it has them. A draft kept before the draft changed shape fails it, so it is
 * set aside rather than compiled.
 */
function hasShapeOf(value: unknown, shape: unknown): boolean {
	if (Array.isArray(shape)) return Array.isArray(value);
	if (typeof shape === 'string' || typeof shape === 'boolean') return typeof value === typeof shape;
	if (!isRecord(shape)) return true;
	if (!isRecord(value)) return false;
	return Object.entries(shape).every(([key, part]) => hasShapeOf(value[key], part));
}

function isWorkspace(value: unknown): value is PlaygroundWorkspace {
	if (!isRecord(value) || value.v !== PLAYGROUND_WORKSPACE_VERSION) return false;
	const { agents, toolSpecs, selected, chatWith } = value;
	if (!Array.isArray(agents) || agents.length === 0 || !Array.isArray(toolSpecs)) return false;
	if (typeof selected !== 'string' || typeof chatWith !== 'string') return false;
	const blank = createBlankDraft();
	const workspace = value as unknown as PlaygroundWorkspace;
	return agents.every(
		(agent: unknown) =>
			isRecord(agent) &&
			typeof agent.key === 'string' &&
			isRecord(agent.tools) &&
			Array.isArray(agent.tools.allow) &&
			hasShapeOf(agentDraft(workspace, agent.key), blank),
	);
}

function isStoredWorkspace(value: unknown): value is StoredWorkspace {
	return (
		isRecord(value) &&
		value.v === PLAYGROUND_WORKSPACE_VERSION &&
		isWorkspace(value.workspace) &&
		typeof value.revision === 'number'
	);
}

/** A one-agent draft kept before workspaces, as the playground kept it. */
function isV1Draft(
	value: unknown,
): value is { v: 1; draft: PlaygroundDraft; revision: number; selectedId: string } {
	return (
		isRecord(value) &&
		value.v === 1 &&
		hasShapeOf(value.draft, createBlankDraft()) &&
		typeof value.revision === 'number' &&
		typeof value.selectedId === 'string'
	);
}

function parsed(store: Storage, key: string): unknown {
	const raw = store.getItem(key);
	if (!raw) return undefined;
	try {
		return JSON.parse(raw) as unknown;
	} catch {
		return null;
	}
}

/**
 * A one-agent draft from before workspaces, as a workspace holding it; its conversation becomes
 * that agent's. Either way the old keys go.
 */
function migrateV1(store: Storage): RestoredPlayground | 'discarded' | undefined {
	const kept = parsed(store, V1_DRAFT_KEY);
	if (kept === undefined) return undefined;
	const chat = store.getItem(V1_CHAT_KEY);
	store.removeItem(V1_DRAFT_KEY);
	store.removeItem(V1_CHAT_KEY);
	if (!isV1Draft(kept)) return 'discarded';
	const workspace = workspaceFromDraft(kept.draft, kept.selectedId);
	if (chat) store.setItem(`${CHAT_PREFIX}${workspace.chatWith}`, chat);
	return { workspace, revision: kept.revision };
}

function forgetAll(store: Storage) {
	store.removeItem(WORKSPACE_KEY);
	for (const key of Object.keys(store)) {
		if (key.startsWith(CHAT_PREFIX)) store.removeItem(key);
	}
}

/**
 * The workspace this tab last kept. `discarded` when one was there but could not be read back (an
 * older shape after a deploy, or a broken write); it is removed so the next load starts clean.
 */
export function restorePlayground():
	| { kind: 'restored'; value: RestoredPlayground }
	| { kind: 'none' | 'discarded' } {
	const store = session();
	if (!store) return { kind: 'none' };
	const kept = parsed(store, WORKSPACE_KEY);
	if (kept === undefined) {
		const migrated = migrateV1(store);
		if (migrated === 'discarded') return { kind: 'discarded' };
		return migrated ? { kind: 'restored', value: migrated } : { kind: 'none' };
	}
	if (isStoredWorkspace(kept)) {
		const { workspace, revision } = kept;
		return { kind: 'restored', value: { workspace, revision } };
	}
	forgetAll(store);
	return { kind: 'discarded' };
}

const CREDENTIAL_TEXT = /auth|key|token|secret|passw|cookie|session|signature|credential/i;

/**
 * Headers as kept: unchanged (formatting and all) when nothing in them is a credential, masked when
 * something is. Text that isn't JSON yet is kept unless it looks like it carries one.
 */
function keptHeaders(raw: string): string {
	let parsedHeaders: unknown;
	try {
		parsedHeaders = JSON.parse(raw);
	} catch {
		return CREDENTIAL_TEXT.test(raw) ? '' : raw;
	}
	const masked = maskHeaders(raw);
	return typeof masked === 'string' && masked !== JSON.stringify(parsedHeaders) ? masked : raw;
}

/** The workspace as kept: each tool's URLs and headers with their credentials masked. */
function keptWorkspace(workspace: PlaygroundWorkspace): PlaygroundWorkspace {
	return {
		...workspace,
		toolSpecs: workspace.toolSpecs.map((tool) => ({
			...tool,
			...(tool.endpoint ? { endpoint: maskUrl(tool.endpoint) } : {}),
			...(tool.serverUrl ? { serverUrl: maskUrl(tool.serverUrl) } : {}),
			...(tool.headersJson ? { headersJson: keptHeaders(tool.headersJson) } : {}),
		})),
	};
}

/** True when two values are the same, or records holding the same values. */
function sameSection(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (!isRecord(a) || !isRecord(b)) return false;
	const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
	return [...keys].every((key) => a[key] === b[key]);
}

/**
 * The top-level draft sections that differ. Drafts are immutable, so a section that changed is a new
 * object; the agent's lens rebuilds its tools section on every read, so that one is compared a level in.
 */
function changedSections(
	before: PlaygroundDraft | undefined,
	after: PlaygroundDraft | undefined,
): string[] {
	const was: Record<string, unknown> = { ...before };
	const now: Record<string, unknown> = { ...after };
	const keys = new Set([...Object.keys(was), ...Object.keys(now)]);
	return [...keys].filter((key) => !sameSection(was[key], now[key]));
}

/** The agent whose draft an open node is under; a library tool keeps the one open before it. */
function agentOf(workspace: PlaygroundWorkspace, id: string): string | undefined {
	return workspace.agents.find((agent) => {
		const root = agentNodeId(agent.key);
		return id === root || id.startsWith(`${root}/`);
	})?.key;
}

export type PlaygroundStore = ReturnType<typeof createPlaygroundStore>;

/**
 * The workspace as an external store. `getWorkspace()` is current the moment `update` returns,
 * before React renders, so a th30 tool reads what it just did. th30 and the editor work on one
 * agent at a time, the focused one: `getDraft` and `updateDraft` read and write its draft, with
 * the whole tool library as its tools.
 */
export function createPlaygroundStore(initial: RestoredPlayground) {
	let workspace = initial.workspace;
	let revision = initial.revision;
	let focus = agentOf(workspace, workspace.selected) ?? workspace.chatWith;
	let changes: DraftChange[] = [];
	const listeners = new Set<() => void>();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let view:
		| { agents: unknown; toolSpecs: unknown; focus: string; draft: PlaygroundDraft }
		| undefined;

	const write = () => {
		timer = undefined;
		const record: StoredWorkspace = {
			v: PLAYGROUND_WORKSPACE_VERSION,
			workspace: keptWorkspace(workspace),
			revision,
		};
		try {
			session()?.setItem(WORKSPACE_KEY, JSON.stringify(record));
		} catch {
			// Quota or a blocked store: the page keeps working on what is in memory.
		}
	};
	const schedule = () => {
		timer ??= setTimeout(write, WRITE_MS);
	};
	const notify = () => {
		for (const listener of listeners) listener();
	};
	/** The focused agent: the last one opened, or the first once that one is gone. */
	const getFocus = () =>
		workspace.agents.some((agent) => agent.key === focus)
			? focus
			: (workspace.agents[0]?.key ?? '');
	/** The focused agent's draft; the same object until the workspace or the focus changes. */
	const getDraft = (): PlaygroundDraft => {
		const key = getFocus();
		if (
			view?.agents !== workspace.agents ||
			view.toolSpecs !== workspace.toolSpecs ||
			view.focus !== key
		) {
			view = {
				agents: workspace.agents,
				toolSpecs: workspace.toolSpecs,
				focus: key,
				draft: libraryDraft(workspace, key) ?? createBlankDraft(),
			};
		}
		return view.draft;
	};
	/** Moves to `next`, as the visitor's or th30's change, with the move in the open node. */
	const update = (
		next: PlaygroundWorkspace | ((current: PlaygroundWorkspace) => PlaygroundWorkspace),
		by: DraftAuthor = 'visitor',
	): PlaygroundWorkspace => {
		const value = typeof next === 'function' ? next(workspace) : next;
		if (value === workspace) return workspace;
		const before = getDraft();
		const agentsBefore = workspace.agents.map((agent) => agent.key).join();
		workspace = value;
		focus = agentOf(workspace, workspace.selected) ?? focus;
		const sections = changedSections(before, getDraft());
		if (workspace.agents.map((agent) => agent.key).join() !== agentsBefore) sections.push('agents');
		revision += 1;
		changes = [...changes, { revision, by, sections }].slice(-CHANGES_SIZE);
		schedule();
		notify();
		return workspace;
	};

	return {
		getWorkspace: () => workspace,
		getRevision: () => revision,
		getFocus,
		getDraft,
		update,
		/** Changes the focused agent's draft; a no-op keeps the revision. Returns the draft now held. */
		updateDraft: (
			next: PlaygroundDraft | ((current: PlaygroundDraft) => PlaygroundDraft),
			by: DraftAuthor = 'visitor',
		): PlaygroundDraft => {
			const current = getDraft();
			const value = typeof next === 'function' ? next(current) : next;
			if (value !== current) update(withLibraryDraft(workspace, getFocus(), value), by);
			return getDraft();
		},
		/** Opens a node: not an edit, so the revision stays. An agent's node focuses that agent. */
		select: (id: string) => {
			if (id === workspace.selected) return;
			workspace = { ...workspace, selected: id };
			focus = agentOf(workspace, id) ?? focus;
			schedule();
			notify();
		},
		/** Picks the agent the preview talks to; not an edit either. */
		chatWith: (key: string) => {
			if (key === workspace.chatWith) return;
			workspace = { ...workspace, chatWith: key };
			schedule();
			notify();
		},
		/** Changes after `since`, oldest first; only the last 50 are kept. */
		changesSince: (since: number): DraftChange[] =>
			changes.filter((change) => change.revision > since),
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
 * Keeps an agent's preview conversation (its transcript and what the model remembers): whole while
 * it fits, then without media in either. Too big even then, nothing is kept. Never throws.
 */
export function saveConversation(agentKey: string, snapshot: ChatSnapshot): void {
	const store = session();
	if (!store) return;
	const key = `${CHAT_PREFIX}${agentKey}`;
	const whole = JSON.stringify(snapshot);
	const lean = whole.length <= CHAT_BUDGET ? whole : JSON.stringify(withoutMedia(snapshot));
	try {
		if (lean.length <= CHAT_BUDGET) {
			store.setItem(key, lean);
			return;
		}
	} catch {
		// Over quota: keep nothing rather than half a conversation.
	}
	try {
		store.removeItem(key);
	} catch {
		// Nothing more to do.
	}
}

/** An agent's kept conversation, when there is one in the shape the chat resumes from. */
export function restoreConversation(agentKey: string): ChatSnapshot | undefined {
	try {
		const raw = session()?.getItem(`${CHAT_PREFIX}${agentKey}`);
		if (!raw) return undefined;
		const value: unknown = JSON.parse(raw);
		if (typeof value !== 'object' || value === null) return undefined;
		const { blocks, session: kept } = value as { blocks?: unknown; session?: unknown };
		if (!Array.isArray(blocks) || typeof kept !== 'object' || kept === null) return undefined;
		return value as ChatSnapshot;
	} catch {
		return undefined;
	}
}

/** Forgets one agent's conversation, or every agent's. */
export function clearConversation(agentKey?: string): void {
	try {
		const store = session();
		if (!store) return;
		for (const key of Object.keys(store)) {
			if (
				agentKey === undefined ? key.startsWith(CHAT_PREFIX) : key === `${CHAT_PREFIX}${agentKey}`
			) {
				store.removeItem(key);
			}
		}
	} catch {
		// Nothing to clear.
	}
}
