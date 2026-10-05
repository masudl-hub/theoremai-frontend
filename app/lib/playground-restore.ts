/**
 * Reading the playground's workspace back from this tab's sessionStorage. A kept workspace that no
 * longer fits the current shape is set aside, and a draft kept by the one-agent playground opens as
 * a workspace holding it.
 */
import {
	agentDraft,
	createBlankDraft,
	PLAYGROUND_WORKSPACE_VERSION,
	type PlaygroundDraft,
	type PlaygroundWorkspace,
	workspaceFromDraft,
} from '@theoremjs/playground';
import {
	CHAT_PREFIX,
	isRecord,
	type RestoredPlayground,
	type StoredWorkspace,
	session,
	WORKSPACE_KEY,
} from './playground-session';

const V1_DRAFT_KEY = 'theorem.playground.v1';
const V1_CHAT_KEY = 'theorem.playground.v1.chat';

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
