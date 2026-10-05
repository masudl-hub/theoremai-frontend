/**
 * The playground's workspace, kept in this tab's sessionStorage so it outlives a reload or a trip
 * to the docs and back. Every change bumps a revision, so th30 can tell its own edits from the
 * visitor's. Keys never come here: the vault stays in memory, and a tool's URLs and headers are kept
 * with their credentials masked.
 */
import { maskHeaders, maskUrl } from '@theoremjs/agents/surface';
import {
	agentNodeId,
	createBlankDraft,
	libraryDraft,
	PLAYGROUND_WORKSPACE_VERSION,
	type PlaygroundDraft,
	type PlaygroundWorkspace,
	withLibraryDraft,
} from '@theoremjs/playground';
import {
	isRecord,
	type RestoredPlayground,
	type StoredWorkspace,
	session,
	WORKSPACE_KEY,
} from './playground-session';

const WRITE_MS = 300;
const CHANGES_SIZE = 50;

export type DraftAuthor = 'th30' | 'visitor';

/** Which sections one change touched, and who made it. */
export interface DraftChange {
	revision: number;
	by: DraftAuthor;
	sections: string[];
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
