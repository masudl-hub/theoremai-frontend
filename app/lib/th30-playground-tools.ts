import { fieldMeta, profileGraphFacet } from '@theoremjs/agents';
import type { TranscriptBlock } from '@theoremjs/agents/interface';
import {
	compilePlayground,
	createBlankDraft,
	createExampleDraft,
	createSpanExampleDraft,
	defaultModelBinding,
	defaultToolSpec,
	draftFacets,
	excludeFacet,
	includableFacets,
	includeFacet,
	type ModelBindingDraft,
	modelBindingViolation,
	newModelBinding,
	newToolSpec,
	PLAYGROUND_PROFILE_TYPES,
	type PlaygroundConnectionMode,
	type PlaygroundDraft,
	type PlaygroundProfileType,
	playgroundNodeRef,
	playgroundTree,
	removeModelBinding,
	setProfileType,
	updateModelBinding,
} from '@theoremjs/playground';
import type { LedgerEntry } from './playground-store';
import type { Th30ToolHandler, Th30ToolSet } from './th30-tools';

export type ExportFormat = 'tsx' | 'copy' | 'llm';

/** What the tools need from the playground; the route supplies it, a test fakes it. */
export interface PlaygroundToolsHost {
	getDraft: () => PlaygroundDraft;
	getRevision: () => number;
	getMode: () => PlaygroundConnectionMode;
	getSelected: () => string;
	/** Replaces the draft as th30's edit: the revision moves, and the visitor's undo stays. */
	update: (next: PlaygroundDraft) => void;
	/** A whole new agent: draft, selection and conversation start over, with an Undo. */
	replaceDraft: (next: PlaygroundDraft, message: string) => void;
	select: (nodeId: string) => void;
	ledger: {
		get: (callId: string) => LedgerEntry | undefined;
		byIntent: (intent: string, withinMs: number) => LedgerEntry | undefined;
		add: (entry: LedgerEntry) => void;
		recent: (count: number) => readonly LedgerEntry[];
	};
	/** Node ids and fields the visitor changed after `revision`. */
	lastChanges: (sinceRevision: number) => string[];
	keysFilled: (slot: string) => boolean;
	openKeys: () => void;
	/** Sends into the preview and waits for the reply; `null` when it can't take a message. */
	send: (text: string) => Promise<{ blocks: readonly TranscriptBlock[] } | null>;
	newConversation: () => void;
	launch: () => void;
	exportAgent: (format: ExportFormat) => Promise<boolean>;
	now?: () => number;
}

const INTENT_WINDOW_MS = 60_000;
const SEND_CAP_MS = 60_000;
const TEXT_CAP = 2000;
const ISSUE_CAP = 12;

type Args = Record<string, unknown>;
type Rejected = { field: string; why: string };

const str = (value: unknown): string | undefined =>
	typeof value === 'string' && value.trim() ? value.trim() : undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** The optional sections a type brings that the old one lacked, switched on. */
function withNewSections(before: PlaygroundDraft, after: PlaygroundDraft): PlaygroundDraft {
	const had = new Set(includableFacets(before));
	return includableFacets(after)
		.filter((facet) => !had.has(facet))
		.reduce(includeFacet, after);
}

function cap(value: unknown): unknown {
	if (typeof value === 'string')
		return value.length > TEXT_CAP ? `${value.slice(0, TEXT_CAP)}…(cut)` : value;
	if (Array.isArray(value)) return value.map(cap);
	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, inner]) => [
				key,
				key === 'data' && typeof inner === 'string' && inner.length > 200 ? '(bytes)' : cap(inner),
			]),
		);
	}
	return value;
}

const FACET_KEY: Record<string, keyof PlaygroundDraft> = {
	identity: 'identity',
	models: 'models',
	tools: 'tools',
	inputs: 'inputs',
	outputs: 'outputs',
	turnBehaviour: 'turnBehaviour',
	guardrails: 'guardrails',
	observability: 'observability',
	image: 'image',
	speech: 'speech',
	live: 'live',
	decision: 'decision',
	wording: 'wording',
};

/** A node's own values, which `editSection` can change. */
function nodeValues(draft: PlaygroundDraft, nodeId: string): Record<string, unknown> | undefined {
	const ref = playgroundNodeRef(draft, nodeId);
	if (!ref) return undefined;
	if (ref.facet === 'modelBinding')
		return { ...draft.modelBindings.find((binding) => binding.key === ref.key) };
	if (ref.facet === 'toolSpec') return { ...draft.toolSpecs.find((tool) => tool.key === ref.key) };
	const key = FACET_KEY[ref.facet];
	return { ...(draft[key] as unknown as Record<string, unknown>) };
}

function nodeFacet(nodeId: string): string {
	return nodeId.split(':', 1)[0] ?? nodeId;
}

function issuesOf(draft: PlaygroundDraft, mode: PlaygroundConnectionMode) {
	const compiled = compilePlayground(draft, mode);
	const issues = compiled.ok
		? []
		: compiled.issues.map(({ nodeId, field, message }) => ({ nodeId, field, message }));
	return { ok: compiled.ok, issues: issues.slice(0, ISSUE_CAP), issueCount: issues.length };
}

/** Where a value may be set: its kind must match the one there; a number field may also be null. */
function kindProblem(current: unknown, blank: unknown, value: unknown): string | undefined {
	if (value === null) return current === null || blank === null ? undefined : 'cannot be empty';
	if (current === null || current === undefined) {
		return typeof value === 'object' && !Array.isArray(value)
			? 'must be a single value'
			: undefined;
	}
	if (Array.isArray(current)) return Array.isArray(value) ? undefined : 'must be a list';
	if (isRecord(current)) return 'is a group; set its fields one by one, like "include.usage"';
	return typeof current === typeof value ? undefined : `must be ${typeof current}`;
}

function setAtPath(
	target: Record<string, unknown>,
	blank: Record<string, unknown> | undefined,
	path: string,
	value: unknown,
): { next: Record<string, unknown> } | { why: string } {
	const [head, ...rest] = path.split('.');
	if (!Object.hasOwn(target, head)) return { why: 'no such setting' };
	if (rest.length === 0) {
		const problem = kindProblem(target[head], blank?.[head], value);
		return problem ? { why: problem } : { next: { ...target, [head]: value } };
	}
	const inner = target[head];
	if (!isRecord(inner)) return { why: 'no such setting' };
	const innerBlank = blank?.[head];
	const set = setAtPath(
		inner,
		isRecord(innerBlank) ? innerBlank : undefined,
		rest.join('.'),
		value,
	);
	return 'why' in set ? set : { next: { ...target, [head]: set.next } };
}

const BLOCKED_FIELDS: Record<string, string> = {
	'identity.profileType': 'use setProfileType',
	'modelBinding.key': 'a model keeps its own key',
	'toolSpec.key': 'a tool keeps its own key',
	'image.references': 'pinned images are added by the visitor',
};

function editNode(
	draft: PlaygroundDraft,
	nodeId: string,
	changes: Record<string, unknown>,
): { next: PlaygroundDraft; rejected: Rejected[] } {
	const ref = playgroundNodeRef(draft, nodeId);
	const rejected: Rejected[] = [];
	if (!ref) return { next: draft, rejected };
	const facet = ref.facet;
	let current = nodeValues(draft, nodeId) ?? {};
	const blank: Record<string, unknown> | undefined =
		facet === 'modelBinding'
			? { ...defaultModelBinding() }
			: facet === 'toolSpec'
				? { ...defaultToolSpec() }
				: (createBlankDraft()[FACET_KEY[facet]] as unknown as Record<string, unknown> | undefined);
	for (const [path, value] of Object.entries(changes)) {
		const blocked = BLOCKED_FIELDS[`${facet}.${path}`];
		if (blocked) {
			rejected.push({ field: path, why: blocked });
			continue;
		}
		if (facet === 'wording') {
			if (!fieldMeta(`lexicon.${path}`)) rejected.push({ field: path, why: 'no such line' });
			else if (typeof value !== 'string') rejected.push({ field: path, why: 'must be text' });
			else current = { ...current, [path]: value };
			continue;
		}
		const set = setAtPath(current, blank, path, value);
		if ('why' in set) rejected.push({ field: path, why: set.why });
		else current = set.next;
	}
	if (rejected.length === Object.keys(changes).length) return { next: draft, rejected };
	if (ref.facet === 'modelBinding') {
		const { key: _key, ...rest } = current;
		return {
			next: updateModelBinding(draft, ref.key, rest),
			rejected,
		};
	}
	if (ref.facet === 'toolSpec') {
		return {
			next: {
				...draft,
				toolSpecs: draft.toolSpecs.map((tool) =>
					tool.key === ref.key ? { ...tool, ...current } : tool,
				),
			},
			rejected,
		};
	}
	const key = FACET_KEY[ref.facet];
	return { next: { ...draft, [key]: current }, rejected };
}

function describeReply(blocks: readonly TranscriptBlock[]) {
	const reply: string[] = [];
	const media: { mimeType: string }[] = [];
	const tools: { name: string; state?: string }[] = [];
	const errors: string[] = [];
	for (const block of blocks) {
		if (block.kind === 'text') reply.push(block.text);
		else if (block.kind === 'structured') reply.push(JSON.stringify(block.value));
		else if (block.kind === 'media') media.push({ mimeType: block.mimeType });
		else if (block.kind === 'tool')
			tools.push({ name: block.tool.name, state: block.tool.state?.phase });
		else if (block.kind === 'error') errors.push(block.message);
	}
	const text = reply.join('\n');
	return {
		reply: text.length > TEXT_CAP ? `${text.slice(0, TEXT_CAP)}…(cut)` : text,
		media,
		tools,
		errors,
	};
}

/** The handlers th30's playground tools call, over a host the playground (or a test) provides. */
export function createPlaygroundTools(host: PlaygroundToolsHost): Th30ToolSet {
	const now = () => host.now?.() ?? Date.now();

	const keySlots = (draft: PlaygroundDraft) =>
		[
			...new Set(
				[
					draft.models.key,
					draft.models.fallbackKey,
					...draft.modelBindings.flatMap((binding) => [binding.keySlot, binding.fallbackKeySlot]),
				].filter((slot): slot is string => Boolean(slot)),
			),
		].map((slot) => ({ slot, filled: host.keysFilled(slot) }));

	const tree = (draft: PlaygroundDraft) => {
		const nodes: { id: string; label: string }[] = [];
		const walk = (node: ReturnType<typeof playgroundTree>) => {
			nodes.push({ id: node.id, label: node.label });
			for (const child of node.children) walk(child);
		};
		walk(playgroundTree(draft));
		return nodes;
	};

	const snapshot = () => {
		const draft = host.getDraft();
		const compiled = issuesOf(draft, host.getMode());
		return {
			revision: host.getRevision(),
			type: draft.identity.profileType || null,
			handle: draft.identity.handle || null,
			agentId: draft.identity.agentId || null,
			selected: host.getSelected(),
			nodes: tree(draft),
			canAdd: includableFacets(draft),
			keys: keySlots(draft),
			runs: compiled.ok,
			issues: compiled.issues,
			issueCount: compiled.issueCount,
		};
	};

	const nodeSnapshot = (nodeId: string | undefined) => {
		if (!nodeId) return undefined;
		const values = nodeValues(host.getDraft(), nodeId);
		return values ? { id: nodeId, values: cap(values) } : undefined;
	};

	const outcome = (applied: boolean, rejected: Rejected[], nodeId?: string) => {
		const compiled = issuesOf(host.getDraft(), host.getMode());
		return {
			applied,
			revision: host.getRevision(),
			node: nodeSnapshot(nodeId),
			rejected,
			issues: compiled.issues,
			issueCount: compiled.issueCount,
		};
	};

	/** Reads: replayed by call id, so a retried call returns what the first one saw. */
	const read =
		(tool: string, run: (args: Args) => unknown): Th30ToolHandler =>
		async (args, callId) => {
			const seen = host.ledger.get(callId);
			if (seen) return seen.result;
			const result = await run(args);
			host.ledger.add({ callId, tool, result, revision: host.getRevision(), at: now() });
			return result;
		};

	/**
	 * Edits: replayed by call id (and by `intent` for a new agent); one `basedOn` an older revision
	 * applies nothing and says what the visitor changed since.
	 */
	const edit =
		(
			tool: string,
			run: (
				args: Args,
			) => { applied: boolean; rejected?: Rejected[]; nodeId?: string } | Promise<never>,
			options: { intent?: boolean } = {},
		): Th30ToolHandler =>
		async (args, callId) => {
			const seen = host.ledger.get(callId);
			if (seen) return seen.result;
			if (options.intent) {
				const intent = str(args.intent);
				const same = intent ? host.ledger.byIntent(intent, INTENT_WINDOW_MS) : undefined;
				if (same) return same.result;
			}
			const basedOn = typeof args.basedOn === 'number' ? args.basedOn : undefined;
			let result: unknown;
			if (basedOn !== undefined && basedOn !== host.getRevision()) {
				result = {
					applied: false,
					reason: 'changed',
					revision: host.getRevision(),
					changes: host.lastChanges(basedOn),
					node: nodeSnapshot(str(args.nodeId) ?? str(args.section)),
				};
			} else {
				const done = run(args);
				const ran = await done;
				result = outcome(ran.applied, ran.rejected ?? [], ran.nodeId);
			}
			const intent = options.intent ? str(args.intent) : undefined;
			host.ledger.add({
				callId,
				tool,
				...(intent ? { intent } : {}),
				result,
				revision: host.getRevision(),
				at: now(),
			});
			return result;
		};

	const apply = (next: PlaygroundDraft, nodeId?: string) => {
		const before = host.getDraft();
		if (next !== before) host.update(next);
		if (nodeId && playgroundNodeRef(host.getDraft(), nodeId)) host.select(nodeId);
		return next !== before;
	};

	const nodeIdOf = (args: Args) => str(args.nodeId) ?? 'identity';

	const unknownNode = (nodeId: string) => ({
		applied: false,
		rejected: [{ field: nodeId, why: 'no such section; read playgroundState for the ids' }],
	});

	const section = (args: Args): string | undefined => {
		const name = str(args.section);
		return name && profileGraphFacet(name as never) ? name : undefined;
	};

	return {
		playgroundState: read('playgroundState', () => snapshot()),

		playgroundSection: read('playgroundSection', (args) => {
			const draft = host.getDraft();
			const nodeId = nodeIdOf(args);
			const values = nodeValues(draft, nodeId);
			if (!values) {
				return { found: false, nodeId, revision: host.getRevision(), nodes: tree(draft) };
			}
			const facet = nodeFacet(nodeId);
			const fields = Object.keys(values).flatMap((key) => {
				const meta = fieldMeta(`${facet}.${key}`);
				return meta
					? [{ key, type: meta.type, doc: meta.doc, options: meta.options, unset: meta.unset }]
					: [];
			});
			const compiled = issuesOf(draft, host.getMode());
			return {
				found: true,
				nodeId,
				revision: host.getRevision(),
				values: cap(values),
				fields,
				issues: compiled.issues.filter((issue) => issue.nodeId === nodeId),
			};
		}),

		newAgent: edit(
			'newAgent',
			(args) => {
				const type = str(args.type);
				if (!type || !(PLAYGROUND_PROFILE_TYPES as readonly string[]).includes(type)) {
					return {
						applied: false,
						rejected: [{ field: 'type', why: `one of ${PLAYGROUND_PROFILE_TYPES.join(', ')}` }],
					};
				}
				const example = str(args.example);
				const blank = createBlankDraft();
				const typed = setProfileType(blank, type as PlaygroundProfileType);
				const next =
					example === 'travel'
						? createExampleDraft()
						: example === 'span'
							? createSpanExampleDraft()
							: withNewSections(blank, typed);
				host.replaceDraft(next, 'th30 started a new agent.');
				return { applied: true, nodeId: 'identity' };
			},
			{ intent: true },
		),

		setProfileType: edit('setProfileType', (args) => {
			const type = str(args.type);
			if (!type || !(PLAYGROUND_PROFILE_TYPES as readonly string[]).includes(type)) {
				return {
					applied: false,
					rejected: [{ field: 'type', why: `one of ${PLAYGROUND_PROFILE_TYPES.join(', ')}` }],
				};
			}
			const before = host.getDraft();
			const next = withNewSections(before, setProfileType(before, type as PlaygroundProfileType));
			apply(next, 'identity');
			return { applied: true, nodeId: 'identity' };
		}),

		editSection: edit('editSection', (args) => {
			const nodeId = nodeIdOf(args);
			const changes = isRecord(args.changes) ? args.changes : undefined;
			if (!changes || Object.keys(changes).length === 0) {
				return {
					applied: false,
					rejected: [{ field: 'changes', why: 'name the settings to change' }],
				};
			}
			const before = host.getDraft();
			if (!playgroundNodeRef(before, nodeId)) return unknownNode(nodeId);
			const { next, rejected } = editNode(before, nodeId, changes);
			apply(next, nodeId);
			const violation =
				nodeFacet(nodeId) === 'modelBinding'
					? modelBindingViolation(
							host.getDraft().modelBindings.find((binding) => nodeId.endsWith(`:${binding.key}`)) ??
								defaultModelBinding(),
							host.getMode(),
						)
					: null;
			if (violation) rejected.push({ field: violation.field, why: violation.message });
			return { applied: next !== before || rejected.length === 0, rejected, nodeId };
		}),

		includeSection: edit('includeSection', (args) => {
			const name = section(args);
			const draft = host.getDraft();
			if (!name || !includableFacets(draft).includes(name as never)) {
				return {
					applied: false,
					rejected: [
						{
							field: 'section',
							why: `can add: ${includableFacets(draft).join(', ') || 'nothing for this type'}`,
						},
					],
				};
			}
			apply(includeFacet(draft, name as never), name);
			return { applied: true, nodeId: name };
		}),

		excludeSection: edit('excludeSection', (args) => {
			const name = section(args);
			const draft = host.getDraft();
			if (!name || !draft.included.includes(name as never)) {
				return {
					applied: false,
					rejected: [
						{ field: 'section', why: `can remove: ${draft.included.join(', ') || 'nothing'}` },
					],
				};
			}
			apply(excludeFacet(draft, name as never));
			return { applied: true };
		}),

		addModel: edit('addModel', (args) => {
			const draft = host.getDraft();
			if (!draft.identity.profileType) {
				return {
					applied: false,
					rejected: [{ field: 'type', why: 'choose the agent type first' }],
				};
			}
			const added = newModelBinding(draft);
			const overrides: Partial<ModelBindingDraft> = {};
			for (const key of ['modelId', 'provider', 'apiId'] as const) {
				const value = str(args[key]);
				if (value) (overrides as Record<string, string>)[key] = value;
			}
			const binding = { ...added, ...overrides };
			const next: PlaygroundDraft = {
				...draft,
				models: {
					...draft.models,
					defaultModel: draft.models.defaultModel || binding.modelId,
				},
				modelBindings: [...draft.modelBindings, binding],
			};
			apply(next, `modelBinding:${binding.key}`);
			const violation = modelBindingViolation(binding, host.getMode());
			return {
				applied: true,
				rejected: violation ? [{ field: violation.field, why: violation.message }] : [],
				nodeId: `modelBinding:${binding.key}`,
			};
		}),

		removeModel: edit('removeModel', (args) => {
			const draft = host.getDraft();
			const id = str(args.modelId);
			const binding = draft.modelBindings.find((candidate) => candidate.modelId === id);
			if (!binding) {
				return {
					applied: false,
					rejected: [
						{
							field: 'modelId',
							why: `have: ${draft.modelBindings.map((candidate) => candidate.modelId).join(', ') || 'none'}`,
						},
					],
				};
			}
			apply(removeModelBinding(draft, binding.key), 'models');
			return { applied: true, nodeId: 'models' };
		}),

		addTool: edit('addTool', (args) => {
			const draft = host.getDraft();
			if (!draft.identity.profileType) {
				return {
					applied: false,
					rejected: [{ field: 'type', why: 'choose the agent type first' }],
				};
			}
			if (!(draftFacets(draft) as string[]).includes('tools')) {
				return {
					applied: false,
					rejected: [{ field: 'tools', why: 'this agent type takes no tools' }],
				};
			}
			const added = newToolSpec(draft);
			const name = str(args.toolName);
			const description = str(args.description);
			const spec = {
				...added,
				...(name ? { toolName: name } : {}),
				...(description ? { description } : {}),
			};
			apply({ ...draft, toolSpecs: [...draft.toolSpecs, spec] }, `toolSpec:${spec.key}`);
			return { applied: true, nodeId: `toolSpec:${spec.key}` };
		}),

		removeTool: edit('removeTool', (args) => {
			const draft = host.getDraft();
			const name = str(args.toolName);
			const tool = draft.toolSpecs.find((candidate) => candidate.toolName === name);
			if (!tool) {
				return {
					applied: false,
					rejected: [
						{
							field: 'toolName',
							why: `have: ${draft.toolSpecs.map((candidate) => candidate.toolName).join(', ') || 'none'}`,
						},
					],
				};
			}
			apply(
				{ ...draft, toolSpecs: draft.toolSpecs.filter((candidate) => candidate !== tool) },
				'tools',
			);
			return { applied: true, nodeId: 'tools' };
		}),

		openKeys: read('openKeys', () => {
			host.openKeys();
			return { opened: true, revision: host.getRevision(), keys: keySlots(host.getDraft()) };
		}),

		tryAgent: read('tryAgent', async (args) => {
			const message = str(args.message);
			if (!message) return { sent: false, reason: 'no_message' };
			const compiled = issuesOf(host.getDraft(), host.getMode());
			if (!compiled.ok) {
				return {
					sent: false,
					reason: 'issues',
					issues: compiled.issues,
					issueCount: compiled.issueCount,
				};
			}
			const sent = host.send(message);
			const timeout = new Promise<'timeout'>((resolve) => {
				window.setTimeout(() => {
					resolve('timeout');
				}, SEND_CAP_MS);
			});
			const result = await Promise.race([sent, timeout]);
			if (result === 'timeout') {
				return {
					sent: true,
					reason: 'timeout',
					note: 'Still running; the reply will show in the preview.',
				};
			}
			if (!result) {
				return {
					sent: false,
					reason: 'not_ready',
					note: 'The preview cannot take a message: it is busy, or needs keys.',
					keys: keySlots(host.getDraft()),
				};
			}
			return { sent: true, ...describeReply(result.blocks) };
		}),

		newConversation: read('newConversation', () => {
			host.newConversation();
			return { done: true };
		}),

		launchAgent: read('launchAgent', () => {
			const compiled = issuesOf(host.getDraft(), host.getMode());
			if (!compiled.ok) return { launched: false, reason: 'issues', issues: compiled.issues };
			host.launch();
			return { launched: true };
		}),

		exportAgent: read('exportAgent', async (args) => {
			const format = str(args.format);
			if (format !== 'tsx' && format !== 'copy' && format !== 'llm') {
				return { done: false, reason: 'format must be tsx, copy or llm' };
			}
			const compiled = issuesOf(host.getDraft(), host.getMode());
			if (!compiled.ok) return { done: false, reason: 'issues', issues: compiled.issues };
			return { done: await host.exportAgent(format), format };
		}),
	};
}

/** The line a reconnecting call opens with: where the build stands and what th30 last did. */
export function buildStateLine(host: PlaygroundToolsHost): string {
	const draft = host.getDraft();
	const { issueCount } = issuesOf(draft, host.getMode());
	const recent = host.ledger
		.recent(5)
		.map((entry) => entry.tool)
		.join(', ');
	return `(state) r${String(host.getRevision())} — ${draft.identity.profileType || 'no type'}, ${draft.identity.handle || 'unnamed'}, ${String(issueCount)} ${issueCount === 1 ? 'issue' : 'issues'}${recent ? `; last calls: ${recent}` : ''}`;
}
