import { Button } from '@astryxdesign/core/Button';
import { ButtonGroup } from '@astryxdesign/core/ButtonGroup';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Layout, LayoutContent, LayoutPanel } from '@astryxdesign/core/Layout';
import { ResizeHandle, useResizable } from '@astryxdesign/core/Resizable';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { Section } from '@astryxdesign/core/Section';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Selector } from '@astryxdesign/core/Selector';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { Token } from '@astryxdesign/core/Token';
import { TreeList, type TreeListItemData } from '@astryxdesign/core/TreeList';
import { VStack } from '@astryxdesign/core/VStack';
import {
	IconAdjustmentsHorizontal,
	IconAlertTriangle,
	IconArrowLeft,
	IconChevronDown,
	IconCode,
	IconCopy,
	IconCopyPlus,
	IconDownload,
	IconEraser,
	IconExternalLink,
	IconKey,
	IconMenu2,
	IconPlayerPlay,
	IconPlaylistX,
	IconPlus,
	IconSparkles,
	IconTimeline,
	IconTool,
	IconX,
} from '@tabler/icons-react';
import {
	type ProfileGraphFacetId,
	profileGraphFacet,
	resolveObservabilityPolicy,
} from '@theoremjs/agents';
import {
	addAgent,
	agentNodeId,
	type CompiledPlayground,
	type CompiledWorkspace,
	compileWorkspace,
	createBlankDraft,
	createBlankWorkspace,
	createExampleDraft,
	createPlaygroundRunId,
	createSpanExampleDraft,
	draftFacets,
	duplicateAgent,
	excludeFacet,
	includableFacets,
	includeFacet,
	libraryDraft,
	type PlaygroundDraft,
	type PlaygroundIssue,
	type PlaygroundNodeRef,
	type PlaygroundRunPayload,
	type PlaygroundTreeNode,
	type PlaygroundWorkspace,
	playgroundInterface,
	playgroundNodeRef,
	playgroundSource,
	playgroundTree,
	removeAgent,
	removeLibraryTool,
	sampleToolInput,
	savePlaygroundRunPayload,
	scopedNodeId,
	setToolAllowed,
	toolSpecKeyOf,
	type WorkspaceCompileResult,
	withAgentDraft,
	workspaceFromDraft,
	workspaceNodeRef,
	workspaceRunAgent,
	workspaceTree,
} from '@theoremjs/playground';
import { type PlaygroundSurfaceHost, playgroundSurface } from '@theoremjs/playground/surface';
import { type TheoremChatHandle, useDisclosureMotion } from '@theoremjs/react/ui';
import {
	type CSSProperties,
	type Dispatch,
	type RefObject,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';
import {
	ConnectionMode,
	ISSUE_ROW_ATTRIBUTE,
	ListBadges,
	LocalConnection,
	WorkspaceContext,
} from '../components/inspector-context';
import { PlaygroundKeys, usePlaygroundConnection } from '../components/playground-connection';
import { PlaygroundRunner } from '../components/playground-runner';
import {
	addToolSpec,
	PROFILE_TYPE_ICON,
	ProfileEditor,
	TOOL_TYPE_ICON,
} from '../components/profile-editor';
import { PLAYGROUND_SEED_IDS, type PlaygroundSeedId } from '../lib/docs/schema';
import { docsSeedDraft } from '../lib/docs/seeds';
import { exportBundle, llmBrief } from '../lib/export-agent';
import { FACET_ICON } from '../lib/facet-icons';
import { KERNEL_PACKAGE_VERSION } from '../lib/kernel-version';
import {
	clearConversation,
	createPlaygroundStore,
	type PlaygroundStore,
	type RestoredPlayground,
	restoreConversation,
	restorePlayground,
	saveConversation,
} from '../lib/playground-store';
import { type Th30PageHandle, useReportTh30Playground } from '../lib/th30-page';
import { th30Surfaces } from '../lib/th30-surfaces';
import { toolCredential } from '../lib/tool-credentials';
import { runToolProbe } from '../lib/tool-probe';
import type { Route } from './+types/playground';
import type { ShellHandle } from './shell';

export const handle = {
	isOnBase: true,
	th30Page: () => ({
		title: 'Playground',
		summary:
			"The playground, where the visitor builds an agent without code. On the left are the profile sections, a tree of the agent's settings (type, identity, models, tools, guardrails and more), and a Keys panel for their own API keys. The middle is the editor for the selected section, and the right is a live preview to chat with the agent. Load an example offers ready agents such as Travel concierge and Span decision. Issues the agent must fix before it can run are flagged, with a button to go to the next one. Export downloads the agent as one .tsx, or copies it, or copies it with a brief for an LLM. Launch opens the agent on its own page in a new tab. The docs explain each field, so th30 should search the docs for them.",
	}),
} satisfies ShellHandle & Th30PageHandle;

export function meta() {
	return [{ title: 'Playground · THEOREM' }];
}

function isPlaygroundSeed(value: string | null): value is PlaygroundSeedId {
	return Boolean(value && (PLAYGROUND_SEED_IDS as readonly string[]).includes(value));
}

/**
 * Draft keys are random, so the draft is made in the browser rather than rendered on the server.
 * This tab's kept draft comes back unless a docs seed asks for another; then it waits behind Undo.
 */
export function clientLoader({ request }: Route.ClientLoaderArgs) {
	const seed = new URL(request.url).searchParams.get('seed');
	const kept = restorePlayground();
	const fresh = (draft: PlaygroundDraft): RestoredPlayground => ({
		workspace: workspaceFromDraft(draft),
		revision: kept.kind === 'restored' ? kept.value.revision + 1 : 0,
	});
	if (isPlaygroundSeed(seed)) {
		return {
			start: fresh(docsSeedDraft(seed)),
			displaced: kept.kind === 'restored' ? kept.value.workspace : undefined,
			discarded: kept.kind === 'discarded',
		};
	}
	if (kept.kind === 'restored')
		return { start: kept.value, displaced: undefined, discarded: false };
	return {
		start: fresh(createExampleDraft()),
		displaced: undefined,
		discarded: kept.kind === 'discarded',
	};
}

export function HydrateFallback() {
	return null;
}

/** A node's icon; Identity shows the profile type's once one is picked. */
function nodeIcon(draft: PlaygroundDraft, ref: PlaygroundNodeRef) {
	const type = draft.identity.profileType;
	if (ref.facet === 'identity' && type) return PROFILE_TYPE_ICON[type];
	if (ref.facet !== 'toolSpec') return FACET_ICON[ref.facet];
	const tool = draft.toolSpecs.find((spec) => spec.key === ref.key);
	return tool ? TOOL_TYPE_ICON[tool.toolType] : IconTool;
}

/**
 * What every row of one agent's tree reads: its draft, the selection, and how to change them.
 * Row ids are the draft's own; `scope` gives the workspace's, which the selection is in.
 */
interface TreeState {
	draft: PlaygroundDraft;
	scope: (id: string) => string;
	selectedId: string;
	onSelect: (id: string) => void;
	setDraft: (next: PlaygroundDraft | ((draft: PlaygroundDraft) => PlaygroundDraft)) => void;
}

/** A row's hover action: stops at the button so the row itself isn't selected. */
function actionButton(label: string, icon: IconType, onPress: () => void) {
	return (
		<IconButton
			label={label}
			variant="ghost"
			size="sm"
			icon={<Icon icon={icon} size="sm" />}
			onClick={(event) => {
				event.stopPropagation();
				onPress();
			}}
		/>
	);
}

function rowAction(label: string, icon: IconType, onPress: () => void) {
	return <span className="playground-tree-action">{actionButton(label, icon, onPress)}</span>;
}

function treeItem(tree: TreeState, node: PlaygroundTreeNode, isTop = false): TreeListItemData {
	const { draft, scope, selectedId, onSelect, setDraft } = tree;
	const facet = node.ref.facet;
	const id = scope(node.id);
	const isOptional = isTop && facet !== 'toolSpec' && profileGraphFacet(facet)?.optional === true;
	return {
		id,
		label: node.label,
		startContent: <Icon icon={nodeIcon(draft, node.ref)} size="sm" color="secondary" />,
		endContent: isOptional
			? rowAction(`Remove ${node.label}`, IconX, () => {
					setDraft((current) => excludeFacet(current, facet));
				})
			: undefined,
		className: isOptional ? 'playground-tree-row' : undefined,
		isSelected: id === selectedId,
		isExpanded: node.children.length > 0,
		onClick: () => {
			onSelect(id);
		},
		children: node.children.length
			? node.children.map((child) => treeItem(tree, child))
			: undefined,
	};
}

/** An optional section the type allows but the draft leaves out: dimmed; a click adds it. */
function offItem(
	{ scope, onSelect, setDraft }: TreeState,
	facet: ProfileGraphFacetId,
): TreeListItemData {
	const label = profileGraphFacet(facet)?.label ?? facet;
	const add = () => {
		setDraft((current) => includeFacet(current, facet));
		onSelect(scope(facet));
	};
	return {
		id: scope(facet),
		label: <span className="playground-tree-off">{label}</span>,
		startContent: (
			<Icon icon={FACET_ICON[facet as keyof typeof FACET_ICON]} size="sm" color="disabled" />
		),
		endContent: rowAction(`Add ${label}`, IconPlus, add),
		className: 'playground-tree-row',
		onClick: add,
	};
}

/**
 * One agent: its root row, labelled with its id, holds every section the profile type allows, in
 * catalog order, optional ones left out dimmed. Only the open agent shows its sections. Its tools
 * are picked in its Tools section; the library lists them once for every agent.
 */
function agentItem(
	tree: TreeState,
	isOpen: boolean,
	actions: TreeListItemData['endContent'],
): TreeListItemData {
	const draft = { ...tree.draft, toolSpecs: [] };
	const root = playgroundTree(draft);
	const shown = new Map(root.children.map((node) => [node.id, node]));
	const off = includableFacets(draft);
	const all = draftFacets({ ...draft, included: [...draft.included, ...off] }).filter(
		(facet) => facet !== 'identity',
	);
	const children = all.map((facet) => {
		const node = shown.get(facet);
		return node ? treeItem(tree, node, true) : offItem(tree, facet);
	});
	return {
		...treeItem(tree, { ...root, children: [] }),
		endContent: actions,
		className: 'playground-tree-row',
		isExpanded: isOpen,
		children: isOpen ? children : undefined,
	};
}

/** What the tree reads of the page: the workspace, the open agent, and how to change them. */
interface WorkspaceTreeState {
	workspace: PlaygroundWorkspace;
	focus: string;
	selectedId: string;
	onSelect: (id: string) => void;
	update: (change: (workspace: PlaygroundWorkspace) => PlaygroundWorkspace) => void;
	setDraft: TreeState['setDraft'];
}

function agentItems(state: WorkspaceTreeState): TreeListItemData[] {
	const { workspace, focus, selectedId, onSelect, update, setDraft } = state;
	const isOnly = workspace.agents.length === 1;
	return workspace.agents.map((agent) => {
		const draft = libraryDraft(workspace, agent.key) ?? createBlankDraft();
		const name = agent.identity.agentId || 'this agent';
		return agentItem(
			{
				draft,
				scope: (id) => scopedNodeId(agent.key, id),
				selectedId,
				onSelect,
				setDraft,
			},
			agent.key === focus,
			<span className="playground-tree-action">
				{actionButton(`Duplicate ${name}`, IconCopyPlus, () => {
					update((current) => duplicateAgent(current, agent.key));
				})}
				{!isOnly &&
					actionButton(`Remove ${name}`, IconX, () => {
						update((current) => removeAgent(current, agent.key));
					})}
			</span>,
		);
	});
}

/** The tool library: every agent picks its tools from these. */
function toolItems({ workspace, selectedId, onSelect, update }: WorkspaceTreeState) {
	return workspaceTree(workspace).tools.map((node): TreeListItemData => {
		const tool = workspace.toolSpecs.find((spec) => spec.key === toolSpecKeyOf(node.id));
		return {
			id: node.id,
			label: node.label,
			startContent: (
				<Icon icon={tool ? TOOL_TYPE_ICON[tool.toolType] : IconTool} size="sm" color="secondary" />
			),
			endContent: rowAction(`Remove ${node.label}`, IconX, () => {
				if (tool) update((current) => removeLibraryTool(current, tool.key));
			}),
			className: 'playground-tree-row',
			isSelected: node.id === selectedId,
			onClick: () => {
				onSelect(node.id);
			},
			style: CHEVRON_COLUMN,
		};
	});
}

/** Which of the workspace's lists the sidebar shows. */
type WorkspaceList = 'agents' | 'tools';

/**
 * The workspace's two lists, one at a time: its agents, and the tool library they share. The
 * toggle follows the selection, so opening a tool from elsewhere (an issue, a new tool) shows it.
 */
function WorkspaceTreeLists({
	tree,
	draft,
	onAddAgent,
}: {
	tree: WorkspaceTreeState;
	/** The open agent's draft, which a new tool joins. */
	draft: PlaygroundDraft;
	onAddAgent: (draft: PlaygroundDraft) => void;
}) {
	const listOf = (id: string): WorkspaceList =>
		toolSpecKeyOf(id) === undefined ? 'agents' : 'tools';
	const [list, setList] = useState(() => listOf(tree.selectedId));
	const [shownFor, setShownFor] = useState(tree.selectedId);
	if (shownFor !== tree.selectedId) {
		setShownFor(tree.selectedId);
		setList(listOf(tree.selectedId));
	}
	return (
		<VStack gap={2}>
			<HStack gap={1} vAlign="center">
				<StackItem size="fill">
					<SegmentedControl
						label="Workspace list"
						size="sm"
						layout="fill"
						value={list}
						onChange={(next) => {
							setList(next === 'tools' ? 'tools' : 'agents');
						}}
					>
						<SegmentedControlItem
							value="agents"
							label={`Agents ${String(tree.workspace.agents.length)}`}
						/>
						<SegmentedControlItem
							value="tools"
							label={`Tools ${String(tree.workspace.toolSpecs.length)}`}
						/>
					</SegmentedControl>
				</StackItem>
				{list === 'agents' ? (
					<DropdownMenu
						button={{
							label: 'Add an agent',
							variant: 'ghost',
							size: 'sm',
							isIconOnly: true,
							icon: <Icon icon={IconPlus} size="sm" />,
						}}
						hasChevron={false}
						placement="below"
						alignment="end"
						items={[
							{
								id: 'blank',
								label: 'Blank agent',
								onClick: () => {
									onAddAgent(createBlankDraft());
								},
							},
							{
								id: 'concierge',
								label: 'Travel concierge',
								description: 'A text agent with weather, places and currency tools.',
								onClick: () => {
									onAddAgent(createExampleDraft());
								},
							},
							{
								id: 'span',
								label: 'Span decision',
								description: 'Tool-call safety with the free Span model.',
								onClick: () => {
									onAddAgent(createSpanExampleDraft());
								},
							},
						]}
					/>
				) : (
					<IconButton
						label="Add a tool"
						variant="ghost"
						size="sm"
						icon={<Icon icon={IconPlus} size="sm" />}
						onClick={() => {
							addToolSpec(draft, tree.setDraft, tree.onSelect);
						}}
					/>
				)}
			</HStack>
			{list === 'agents' ? (
				<TreeList density="compact" aria-label="Agents" items={agentItems(tree)} />
			) : (
				<TreeList density="compact" aria-label="Tools" items={toolItems(tree)} />
			)}
		</VStack>
	);
}

/** Which agent the preview chats with, once there is more than one. */
function ChatPicker({
	workspace,
	onChange,
}: {
	workspace: PlaygroundWorkspace;
	onChange: (key: string) => void;
}) {
	if (workspace.agents.length < 2) return null;
	return (
		<Selector
			label="Chat with"
			isLabelHidden
			variant="ghost"
			size="sm"
			value={workspace.chatWith}
			options={workspace.agents.map((agent) => ({
				value: agent.key,
				label: agent.identity.agentId || 'Unnamed agent',
			}))}
			onChange={onChange}
		/>
	);
}

/** A tree group's heading and its add button. */
/** Below the app shell's drawer breakpoint, where the playground shows one pane at a time. */
const PHONE = '(width < 768px)';
function usePhone() {
	return useSyncExternalStore(
		(change) => {
			const query = window.matchMedia(PHONE);
			query.addEventListener('change', change);
			return () => {
				query.removeEventListener('change', change);
			};
		},
		() => window.matchMedia(PHONE).matches,
		() => false,
	);
}

/** The indent TreeList gives a leaf row beside a branch: the chevron's width and its gap. */
const CHEVRON_COLUMN = {
	'--_tree-indent': 'calc(var(--spacing-4) + var(--spacing-2))',
} as CSSProperties;

/** The tree's label for a node, e.g. the agent's id for Identity. */
function nodeLabel(node: PlaygroundTreeNode, id: string): string | undefined {
	if (node.id === id) return node.label;
	for (const child of node.children) {
		const label = nodeLabel(child, id);
		if (label !== undefined) return label;
	}
	return undefined;
}

/**
 * The editor's title: the facet's name, e.g. Identity rather than the agent's id the tree shows;
 * for a model or tool entry, that entry's own name.
 */
function editorTitle(draft: PlaygroundDraft, id: string): string | undefined {
	const ref = playgroundNodeRef(draft, id);
	if (!ref) return undefined;
	if ('key' in ref) return nodeLabel(playgroundTree(draft), id);
	return profileGraphFacet(ref.facet)?.label;
}

/** Waits before compiling after an edit, so typing doesn't recompile on every key. */
const COMPILE_DEBOUNCE_MS = 300;

/** The part of a compile the agent runs from: what the run tab and the preview both take. */
function runPayload({
	agentId,
	profile,
	customTools,
	structured,
	questions,
	dependencies,
}: ReturnType<typeof workspaceRunAgent> & {}): PlaygroundRunPayload {
	return { agentId, profile, customTools, structured, questions, dependencies };
}

/** An agent's id as the workspace names it, for finding its compile. */
function agentIdOf(workspace: PlaygroundWorkspace, key: string): string {
	return workspace.agents.find((agent) => agent.key === key)?.identity.agentId.trim() ?? '';
}

/** One agent's compile, from a workspace that compiled. */
function compiledAgent(
	compiled: CompiledWorkspace,
	workspace: PlaygroundWorkspace,
	key: string,
): CompiledPlayground | undefined {
	const id = agentIdOf(workspace, key);
	return compiled.agents.find((agent) => agent.agentId === id);
}

/**
 * The editor's node id for a workspace one: the open agent's own ids, a library tool's as it is.
 * `undefined` for another agent's.
 */
function innerNodeId(id: string, focus: string): string | undefined {
	if (toolSpecKeyOf(id) !== undefined) return id;
	const root = agentNodeId(focus);
	if (id === root) return 'identity';
	return id.startsWith(`${root}/`) ? id.slice(root.length + 1) : undefined;
}

/** Hands the compiled agent to a new tab through this browser's storage; the run route reads it back. */
function openInNewTab(payload: PlaygroundRunPayload) {
	const runId = createPlaygroundRunId();
	savePlaygroundRunPayload(payload, runId);
	window.open(`/playground/run?run=${encodeURIComponent(runId)}`, '_blank', 'noopener');
}

/** Downloads `text` as `filename`. */
function download(filename: string, text: string) {
	const url = URL.createObjectURL(new Blob([text], { type: 'text/typescript' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

/** `value`, once it has stopped changing for `ms`. */
function useDebounced<T>(value: T, ms: number) {
	const [settled, setSettled] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => {
			setSettled(value);
		}, ms);
		return () => {
			clearTimeout(timer);
		};
	}, [value, ms]);
	return settled;
}

/** Calls `measure` with the node whenever it resizes; a callback ref, so it follows remounts. */
function useMeasure<T>(measure: (node: HTMLElement) => T) {
	const [value, setValue] = useState<T>();
	const ref = useCallback(
		(node: HTMLElement | null) => {
			if (!node) return;
			const observer = new ResizeObserver(() => {
				setValue(measure(node));
			});
			observer.observe(node);
			return () => {
				observer.disconnect();
			};
		},
		[measure],
	);
	return [ref, value] as const;
}

/** The next node with an issue after `selectedId`, wrapping, so repeated clicks walk through them. */
function nextIssueNode(issues: readonly PlaygroundIssue[], selectedId: string): string {
	const nodes = [...new Set(issues.map((issue) => issue.nodeId))];
	return nodes[(nodes.indexOf(selectedId) + 1) % nodes.length] ?? selectedId;
}

/**
 * CodeBlock scrolls its code area through `maxHeight`, and a percentage there resolves against
 * the block's own auto height, so the space under the view switch is measured and passed in
 * pixels, less everything around the code: the wrapper's padding and the block's own chrome.
 * The code area is the block's `role="group"` scroll container.
 */
const measureHeight = (node: HTMLElement) => node.getBoundingClientRect().height;
/** The layout has no padding, so this is the content box Astryx resolves panel percentages on. */
const measureWidth = (node: HTMLElement) => node.clientWidth;

/** The side panel's default share of the layout, the tree beside the editor: the golden split. */
const SIDE_DEFAULT_PERCENT = 38.2;
/** The profile tree's width inside the side panel; the editor takes the rest. */
const TREE_WIDTH = 224;
const measureCodeChrome = (node: HTMLElement) =>
	node.getBoundingClientRect().height -
	(node.querySelector('[role="group"]')?.getBoundingClientRect().height ?? 0);

/** Whether the agent records traces, so the header can offer them. */
function isTraced(payload: PlaygroundRunPayload | null): boolean {
	if (payload === null || payload.profile.type === 'decision') return false;
	if (payload.profile.type === 'host') {
		return resolveObservabilityPolicy(payload.profile.observability).record;
	}
	return playgroundInterface(payload).observability?.record === true;
}

/** What is left of `height` under the code view's chrome. */
function heightBelow(height: number | undefined, chrome: number | undefined): number | undefined {
	return height === undefined ? undefined : height - (chrome ?? 0);
}

/** The frame's class; on a phone it names the sheet open over the editor. */
function frameClass(sheet: 'tree' | 'preview' | null): string {
	return sheet ? `playground-frame playground-${sheet}-open` : 'playground-frame';
}

/** Two badges per list row at the panel's default width or wider; one once it is narrowed. */
function badgesPerRow(panelSize: number, layoutWidth: number | undefined): 1 | 2 {
	if (layoutWidth === undefined) return 2;
	return panelSize >= Math.round((SIDE_DEFAULT_PERCENT / 100) * layoutWidth) ? 2 : 1;
}

/** A workspace and what it compiled to. */
interface Compile {
	workspace: PlaygroundWorkspace;
	result: WorkspaceCompileResult;
}

/** The last workspace that compiled; it holds while the current one has issues. */
function useLastGood(compile: Compile) {
	const good = compile.result.ok
		? { workspace: compile.workspace, compiled: compile.result }
		: null;
	const [lastGood, setLastGood] = useState(good);
	if (good && good.compiled !== lastGood?.compiled) setLastGood(good);
	return good ?? lastGood;
}

/** The editor/code button, by the view it leaves. */
const VIEW_TOGGLE = {
	editor: { label: 'Code', icon: IconCode, tooltip: 'Show the code', next: 'code' },
	code: {
		label: 'Editor',
		icon: IconAdjustmentsHorizontal,
		tooltip: 'Show the editor',
		next: 'editor',
	},
} as const;

/** The agent with every use of key slot `from` pointed at `to`; `''` lets go of it. */
function swapKeySlot<Agent extends Pick<PlaygroundDraft, 'models' | 'modelBindings'>>(
	draft: Agent,
	from: string,
	to: string,
): Agent {
	const swap = <Slot extends string | undefined>(slot: Slot) => (slot === from ? to : slot) as Slot;
	return {
		...draft,
		models: {
			...draft.models,
			key: swap(draft.models.key),
			fallbackKey: swap(draft.models.fallbackKey),
		},
		modelBindings: draft.modelBindings.map((binding) => ({
			...binding,
			keySlot: swap(binding.keySlot),
			fallbackKeySlot: swap(binding.fallbackKeySlot),
		})),
	};
}

/** "1 issue" or "N issues" while the draft doesn't compile; nothing once it does. */
function issueCount(compiled: WorkspaceCompileResult): string | undefined {
	if (compiled.ok) return undefined;
	return compiled.issues.length === 1 ? '1 issue' : `${String(compiled.issues.length)} issues`;
}

/** What th30 is told about the draft on screen. */
function th30Report(
	draft: PlaygroundDraft,
	compiled: WorkspaceCompileResult,
	section: string | undefined,
) {
	return {
		agent: draft.identity.handle || draft.identity.agentId || 'unnamed',
		type: draft.identity.profileType || 'not chosen',
		issues: compiled.ok ? 0 : compiled.issues.length,
		section,
	};
}

/** What th30's surface reaches on the page beyond the store; read through a ref so it is always the latest. */
type SurfacePage = {
	mode: ReturnType<typeof usePlaygroundConnection>['mode'];
	connection: ReturnType<typeof usePlaygroundConnection>;
	replaceWorkspace: (next: PlaygroundWorkspace, message: string, by?: 'th30' | 'visitor') => void;
	copy: (text: string, what: string) => void;
	setKeysOpen: (open: boolean) => void;
	setConversation: Dispatch<SetStateAction<number>>;
};

/**
 * The playground as th30's surface host: th30 works on the open agent, its draft from the store;
 * everything else comes from the page.
 */
function playgroundSurfaceHost(
	store: PlaygroundStore,
	page: RefObject<SurfacePage>,
	chat: RefObject<TheoremChatHandle | null>,
): PlaygroundSurfaceHost {
	/** The open agent's compile, or `undefined` while the workspace has issues. */
	const compileNow = () => {
		const workspace = store.getWorkspace();
		const result = compileWorkspace(workspace, page.current.mode);
		return result.ok ? compiledAgent(result, workspace, store.getFocus()) : undefined;
	};
	/** What the chatted agent runs, with the agents it names. */
	const runNow = () => {
		const workspace = store.getWorkspace();
		const result = compileWorkspace(workspace, page.current.mode);
		return result.ok
			? workspaceRunAgent(result, agentIdOf(workspace, workspace.chatWith))
			: undefined;
	};
	return {
		getDraft: store.getDraft,
		getRevision: store.getRevision,
		getMode: () => page.current.mode,
		update: (next) => store.updateDraft(next, 'th30'),
		replaceDraft: (next, message) => {
			const workspace = store.getWorkspace();
			page.current.replaceWorkspace(
				withAgentDraft(workspace, store.getFocus(), next),
				message,
				'th30',
			);
		},
		select: (id) => {
			store.select(scopedNodeId(store.getFocus(), id));
		},
		changesSince: (since) =>
			store.changesSince(since).map((change) => ({
				revision: change.revision,
				by: change.by === 'th30' ? 'agent' : 'person',
				sections: change.sections,
			})),
		subscribe: store.subscribe,
		key: (slot) => page.current.connection.vault[slot] ?? '',
		openKeys: () => {
			page.current.setKeysOpen(true);
		},
		testKey: async (slot) => {
			const key = page.current.connection.vault[slot]?.trim();
			if (!key) return { ok: false, error: 'No key in this slot.' };
			try {
				const response = await fetch('/api/playground/test-key', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ key }),
				});
				return await response.json<unknown>();
			} catch {
				return { ok: false, error: "Couldn't reach the playground server." };
			}
		},
		toolCredential,
		testTool: (key, input) => {
			const tool = store.getDraft().toolSpecs.find((candidate) => candidate.key === key);
			if (!tool) return Promise.resolve({ ok: false, error: 'No such tool.' });
			const sample = input ?? sampleToolInput(tool.toolName, tool.inputJson) ?? {};
			return runToolProbe(tool, JSON.stringify(sample), toolCredential(key));
		},
		send: (text) => chat.current?.send(text) ?? Promise.resolve(null),
		newConversation: () => {
			clearConversation(store.getWorkspace().chatWith);
			page.current.setConversation((count) => count + 1);
		},
		launch: () => {
			const result = runNow();
			if (!result) return;
			openInNewTab({
				...runPayload(result),
				connectionMode: page.current.mode,
				localBaseUrl: page.current.connection.local.baseUrl,
			});
		},
		exportAgent: (format) => {
			const result = compileNow();
			if (!result) return Promise.resolve(false);
			const code = playgroundSource(result);
			if (format === 'tsx') {
				download(`${result.agentId}.tsx`, exportBundle(result, code));
			} else if (format === 'copy') {
				page.current.copy(exportBundle(result, code), 'the .tsx');
			} else {
				page.current.copy(llmBrief(result, code), 'the .tsx and its brief');
			}
			return Promise.resolve(true);
		},
	};
}

/**
 * The profile tree beside the editor (or code) for the draft in a panel on the left; the compiled
 * agent on the right, under Export and Run. The draft compiles as it changes; while it doesn't
 * compile, the agent stays the last one that did.
 */
export default function Playground({ loaderData }: Route.ComponentProps) {
	// The workspace lives in a store kept in this tab's sessionStorage; th30's tools read it
	// synchronously. The editor works on the open agent's draft, with the whole tool library.
	const [store] = useState(() => createPlaygroundStore(loaderData.start));
	const workspace = useSyncExternalStore(store.subscribe, store.getWorkspace, store.getWorkspace);
	const draft = useSyncExternalStore(store.subscribe, store.getDraft, store.getDraft);
	const focus = store.getFocus();
	const setDraft = useCallback(
		(next: PlaygroundDraft | ((current: PlaygroundDraft) => PlaygroundDraft)) => {
			store.updateDraft(next);
		},
		[store],
	);
	const update = useCallback(
		(change: (current: PlaygroundWorkspace) => PlaygroundWorkspace) => {
			store.update(change);
		},
		[store],
	);
	useEffect(() => {
		const flush = () => {
			store.flush();
		};
		window.addEventListener('pagehide', flush);
		return () => {
			window.removeEventListener('pagehide', flush);
			flush();
		};
	}, [store]);
	// Keys are the workspace's: every agent's slots, so a called agent's key is asked for too.
	const bindings = workspace.agents.flatMap((agent) => agent.modelBindings);
	const namedSlots = workspace.agents
		.flatMap((agent) => [
			agent.models.key,
			agent.models.fallbackKey,
			...agent.modelBindings.flatMap((binding) => [binding.keySlot, binding.fallbackKeySlot]),
		])
		.filter((slot): slot is string => Boolean(slot));
	const connection = usePlaygroundConnection(bindings, undefined, namedSlots);
	const { mode, runtime } = connection;
	const [keysOpen, setKeysOpen] = useState(false);
	const [editorView, setEditorView] = useState<'editor' | 'code'>('editor');
	const layoutRef = useRef<HTMLDivElement>(null);
	const [measureLayout, layoutWidth] = useMeasure(measureWidth);
	const layoutCallbackRef = useCallback(
		(node: HTMLDivElement | null) => {
			layoutRef.current = node;
			return measureLayout(node);
		},
		[measureLayout],
	);
	const sidePanel = useResizable({
		defaultSize: `${String(SIDE_DEFAULT_PERCENT)}%`,
		minSize: TREE_WIDTH + 320,
		containerRef: layoutRef,
		autoSaveId: 'playground.panel',
	});
	const listBadges = badgesPerRow(sidePanel.size, layoutWidth);
	const setSelectedId = store.select;
	const editorRef = useRef<HTMLDivElement>(null);
	// The profile tree's branches mount and unmount; ease them both ways.
	const sidebarRef = useRef<HTMLDivElement>(null);
	useDisclosureMotion(sidebarRef);
	const [bodyRef, bodyHeight] = useMeasure(measureHeight);
	const [codeRef, codeChrome] = useMeasure(measureCodeChrome);
	const codeHeight = heightBelow(bodyHeight, codeChrome);
	const selected = workspaceNodeRef(workspace, workspace.selected)
		? workspace.selected
		: agentNodeId(focus);
	/** The open node as the editor names it: the open agent's own id, or a library tool's. */
	const editing = innerNodeId(selected, focus) ?? 'identity';
	/**
	 * The node the issue pill opened. Its first failing row is revealed once the editor shows that
	 * node, which can be a render after the click, and a frame later, once the editor's new scroll
	 * area scrolls.
	 */
	const [issueReveal, setIssueReveal] = useState<{ node: string }>();
	const revealed = useRef<{ node: string }>(undefined);
	useEffect(() => {
		if (!issueReveal || issueReveal === revealed.current || issueReveal.node !== selected) return;
		revealed.current = issueReveal;
		const frame = requestAnimationFrame(() => {
			const row = editorRef.current?.querySelector(`[${ISSUE_ROW_ATTRIBUTE}]`);
			row?.scrollIntoView({ block: 'center' });
			row?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus({ preventScroll: true });
		});
		return () => {
			cancelAnimationFrame(frame);
		};
	}, [issueReveal, selected]);
	const settled = useDebounced(workspace, COMPILE_DEBOUNCE_MS);
	const compile = useMemo(
		() => ({ workspace: settled, result: compileWorkspace(settled, mode) }),
		[settled, mode],
	);
	const compiled = compile.result;
	// Only a workspace that compiles changes the preview; while one has issues, the last good agent
	// and its conversation stay put. The chatted agent is found by its key there, so renaming it
	// doesn't lose it.
	const lastGood = useLastGood(compile);
	const chatWith = workspace.chatWith;
	const payload = useMemo(() => {
		const run =
			lastGood && workspaceRunAgent(lastGood.compiled, agentIdOf(lastGood.workspace, chatWith));
		return run
			? { ...runPayload(run), connectionMode: mode, localBaseUrl: connection.local.baseUrl }
			: null;
	}, [lastGood, chatWith, mode, connection.local.baseUrl]);
	/** The open agent's compile: what the code view shows and Export takes. */
	const focused = compiled.ok ? compiledAgent(compiled, compile.workspace, focus) : undefined;
	/** The open agent's issues and the library's, by the editor's ids. */
	const editorIssues = compiled.ok
		? []
		: compiled.issues.flatMap((issue) => {
				const nodeId = innerNodeId(issue.nodeId, focus);
				return nodeId === undefined ? [] : [{ ...issue, nodeId }];
			});
	const traced = useMemo(() => isTraced(payload), [payload]);
	const [traceOpen, setTraceOpen] = useState(false);
	// Bumping this remounts the runner: a fresh transcript and trace feed, the same profile.
	const [conversation, setConversation] = useState(0);
	/** On a phone, the tree or the preview, each over the editor; neither shows beside it there. */
	const [sheet, setSheet] = useState<'tree' | 'preview' | null>(null);
	const phone = usePhone();
	const runKey = `${mode}:${chatWith}:${String(conversation)}`;
	// Each agent's kept conversation resumes in the first runner it has here; a cleared or remade
	// one starts empty.
	const [firstRuns] = useState(() => new Map<string, string>());
	if (!firstRuns.has(chatWith)) firstRuns.set(chatWith, runKey);
	const initialChat = useMemo(
		() => (firstRuns.get(chatWith) === runKey ? restoreConversation(chatWith) : undefined),
		[firstRuns, chatWith, runKey],
	);
	/** The runner that last sent something; a new one (cleared, or another mode) has no history. */
	const [usedRun, setUsedRun] = useState<string>();
	const source = useMemo(() => (focused ? playgroundSource(focused) : null), [focused]);
	const issues = issueCount(compiled);
	const blocked = issues && `Fix ${issues} first`;
	const toast = useToast();
	// Once, on arrival: say when a kept draft was set aside for a docs seed, or couldn't be read back.
	const arrival = useRef({ displaced: loaderData.displaced, discarded: loaderData.discarded });
	useEffect(() => {
		const { displaced, discarded } = arrival.current;
		arrival.current = { displaced: undefined, discarded: false };
		if (discarded) toast({ body: "Your last draft couldn't be restored." });
		if (!displaced) return;
		const dismiss = toast({
			body: 'Opened the example from the docs.',
			endContent: (
				<Button
					label="Back to my draft"
					variant="ghost"
					size="sm"
					onClick={() => {
						store.update(displaced);
						dismiss();
					}}
				/>
			),
		});
	}, [toast, store]);
	/** Swaps in a whole new workspace; the toast can put the old one back. */
	const replaceWorkspace = (
		next: PlaygroundWorkspace,
		message: string,
		by: 'th30' | 'visitor' = 'visitor',
	) => {
		const previous = store.getWorkspace();
		store.update(next, by);
		setKeysOpen(false);
		setEditorView('editor');
		// New agents start new conversations; the old transcripts don't carry over.
		clearConversation();
		setConversation((count) => count + 1);
		const dismiss = toast({
			body: message,
			endContent: (
				<Button
					label="Undo"
					variant="ghost"
					size="sm"
					onClick={() => {
						store.update(previous);
						dismiss();
					}}
				/>
			),
		});
	};
	const copy = (text: string, what: string) => {
		navigator.clipboard.writeText(text).then(
			() => toast({ body: `Copied ${what}.` }),
			() => toast({ body: "Couldn't reach the clipboard.", type: 'error' }),
		);
	};

	const chatRef = useRef<TheoremChatHandle>(null);
	// th30's tools read the page through this ref, so they register once and always see the latest.
	const page = {
		mode,
		connection,
		replaceWorkspace,
		copy,
		setKeysOpen,
		setConversation,
	};
	const pageRef = useRef(page);
	pageRef.current = page;
	// th30 sees and works in the playground through its surface, mounted while the page is open.
	useEffect(
		() => th30Surfaces.mount(playgroundSurface(playgroundSurfaceHost(store, pageRef, chatRef))),
		[store],
	);

	const title = editorTitle(draft, editing);
	useReportTh30Playground(th30Report(draft, compiled, title));
	const heading = keysOpen ? 'Keys' : title;
	const viewToggle = VIEW_TOGGLE[editorView];
	/** Opens a node from the tree or the editor, closing whatever stood over it. */
	const open = (id: string) => {
		setKeysOpen(false);
		setSelectedId(id);
		setEditorView('editor');
	};
	const tree: WorkspaceTreeState = {
		workspace,
		focus,
		selectedId: keysOpen ? '' : selected,
		onSelect: (id) => {
			open(id);
			setSheet(null);
		},
		update,
		setDraft,
	};
	/** What the open agent's editor knows of the others, and its allow list. */
	const workspaceContext = useMemo(() => {
		const self = workspace.agents.find((agent) => agent.key === focus);
		return {
			agents: workspace.agents.map((agent) => ({
				key: agent.key,
				agentId: agent.identity.agentId.trim(),
				type: agent.identity.profileType,
			})),
			self: focus,
			allowed: self?.tools.allow ?? [],
			setAllowed: (toolKey: string, allowed: boolean) => {
				update((current) => setToolAllowed(current, focus, toolKey, allowed));
			},
		};
	}, [workspace.agents, focus, update]);
	/** Adds an agent and opens it. */
	const addAgentFrom = (next: PlaygroundDraft) => {
		update((current) => addAgent(current, next));
		open(store.getWorkspace().selected);
	};

	return (
		<Layout
			ref={layoutCallbackRef}
			className={frameClass(sheet)}
			padding={0}
			start={
				<>
					<LayoutPanel
						resizable={sidePanel.props}
						padding={0}
						className="playground-side"
						role="navigation"
						label="Playground"
						isScrollable={false}
					>
						<Section variant="raised" height="100%" padding={0}>
							<HStack height="100%">
								{/* Static, so the editor beside it never squeezes the tree. */}
								<StackItem size="static" className="playground-tree">
									<Section
										variant="transparent"
										width={TREE_WIDTH}
										height="100%"
										padding={4}
										dividers={['end']}
									>
										<VStack gap={4} height="100%">
											<HStack gap={2} vAlign="start">
												<StackItem size="fill">
													<VStack gap={1}>
														<Heading level={3}>Theorem Playground</Heading>
														<Text type="supporting" color="secondary">
															{`@theoremjs/agents ${KERNEL_PACKAGE_VERSION}`}
														</Text>
													</VStack>
												</StackItem>
												<span className="playground-phone">
													<IconButton
														label="Close sections"
														variant="ghost"
														icon={<Icon icon={IconX} size="sm" />}
														onClick={() => {
															setSheet(null);
														}}
													/>
												</span>
											</HStack>
											<StackItem size="fill">
												<ScrollableArea ref={sidebarRef} label="Workspace" height="100%">
													<WorkspaceTreeLists tree={tree} draft={draft} onAddAgent={addAgentFrom} />
												</ScrollableArea>
											</StackItem>
										</VStack>
									</Section>
								</StackItem>
								<StackItem size="fill">
									<VStack height="100%">
										<Section variant="transparent" padding={3} dividers={['bottom']}>
											<HStack gap={1} vAlign="center">
												<span className="playground-phone">
													<IconButton
														label="Sections"
														variant="ghost"
														icon={<Icon icon={IconMenu2} size="sm" />}
														onClick={() => {
															setSheet('tree');
														}}
													/>
												</span>
												<StackItem size="fill">
													{heading && <Heading level={4}>{heading}</Heading>}
												</StackItem>
												{issues && !compiled.ok && (
													<Token
														label={issues}
														color="orange"
														description="Go to the next issue"
														onClick={() => {
															const node = nextIssueNode(compiled.issues, selected);
															open(node);
															setIssueReveal({ node });
														}}
													/>
												)}
												<IconButton
													label="Keys"
													variant="ghost"
													icon={<Icon icon={IconKey} size="sm" />}
													aria-pressed={keysOpen}
													tooltip="Keys"
													onClick={() => {
														setKeysOpen((open) => !open);
														setEditorView('editor');
													}}
												/>
												<IconButton
													label="Clear"
													variant="ghost"
													icon={<Icon icon={IconEraser} size="sm" />}
													tooltip="Start again from one blank agent"
													onClick={() => {
														replaceWorkspace(createBlankWorkspace(), 'Cleared the playground.');
													}}
												/>
												<IconButton
													label={viewToggle.label}
													variant="ghost"
													icon={<Icon icon={viewToggle.icon} size="sm" />}
													tooltip={viewToggle.tooltip}
													onClick={() => {
														setKeysOpen(false);
														setEditorView(viewToggle.next);
													}}
												/>
												<span className="playground-phone">
													<IconButton
														label="Preview"
														variant="ghost"
														icon={<Icon icon={IconPlayerPlay} size="sm" />}
														onClick={() => {
															setSheet('preview');
														}}
													/>
												</span>
											</HStack>
										</Section>
										<StackItem size="fill" ref={bodyRef}>
											{/* The editor is keyed by node, so each one opens at its top. */}
											{keysOpen ? (
												<ScrollableArea label="Keys" height="100%">
													<PlaygroundKeys
														connection={connection}
														onAddSlot={(slot) => {
															setDraft((current) =>
																current.models.key
																	? current
																	: { ...current, models: { ...current.models, key: slot } },
															);
														}}
														onRenameSlot={(from, to) => {
															update((current) => ({
																...current,
																agents: current.agents.map((agent) => swapKeySlot(agent, from, to)),
															}));
														}}
														onRemoveSlot={(slot) => {
															update((current) => ({
																...current,
																agents: current.agents.map((agent) => swapKeySlot(agent, slot, '')),
															}));
														}}
													/>
												</ScrollableArea>
											) : editorView === 'editor' ? (
												<ScrollableArea key={selected} label="Editor" height="100%" ref={editorRef}>
													<ListBadges value={listBadges}>
														<ConnectionMode.Provider value={mode}>
															<LocalConnection.Provider value={connection}>
																<WorkspaceContext.Provider value={workspaceContext}>
																	<ProfileEditor
																		draft={draft}
																		setDraft={setDraft}
																		selectedId={editing}
																		onSelect={(id) => {
																			open(scopedNodeId(focus, id));
																		}}
																		issues={editorIssues}
																	/>
																</WorkspaceContext.Provider>
															</LocalConnection.Provider>
														</ConnectionMode.Provider>
													</ListBadges>
												</ScrollableArea>
											) : source ? (
												<Section variant="transparent" padding={3} ref={codeRef}>
													<CodeBlock
														code={source}
														language="typescript"
														hasLanguageLabel={false}
														hasLineNumbers
														isWrapped
														width="100%"
														maxHeight={codeHeight}
													/>
												</Section>
											) : (
												<EmptyState
													icon={<Icon icon={IconAlertTriangle} />}
													title="No code yet"
													description={`${blocked ?? ''} to generate the TypeScript.`}
												/>
											)}
										</StackItem>
									</VStack>
								</StackItem>
							</HStack>
						</Section>
					</LayoutPanel>
					<ResizeHandle
						className="playground-side-handle"
						direction="horizontal"
						isAlwaysVisible={false}
						resizable={sidePanel.props}
						label="Resize profile"
					/>
				</>
			}
			content={
				<LayoutContent className="playground-preview" isScrollable={false} padding={0}>
					<VStack height="100%">
						<Section variant="transparent" padding={3}>
							<HStack gap={2} vAlign="center">
								<span className="playground-phone">
									<IconButton
										label="Back to the editor"
										variant="ghost"
										icon={<Icon icon={IconArrowLeft} size="sm" />}
										onClick={() => {
											setSheet(null);
										}}
									/>
								</span>
								<StackItem size="fill">
									<ChatPicker workspace={workspace} onChange={store.chatWith} />
								</StackItem>
								{payload && usedRun === runKey && (
									<IconButton
										label="Clear history"
										variant="ghost"
										icon={<Icon icon={IconPlaylistX} size="sm" />}
										tooltip="Clear the conversation and its traces. Your profile stays."
										onClick={() => {
											clearConversation(chatWith);
											setConversation((count) => count + 1);
										}}
									/>
								)}
								{traced ? (
									<Button
										label={traceOpen ? 'Hide trace' : 'View trace'}
										isIconOnly={phone}
										icon={<Icon icon={IconTimeline} size="sm" />}
										aria-pressed={traceOpen}
										onClick={() => {
											setTraceOpen((open) => !open);
										}}
									/>
								) : null}
								<ButtonGroup label="Export" isDisabled={!compiled.ok}>
									<Button
										label="Export"
										isIconOnly={phone}
										icon={<Icon icon={IconDownload} size="sm" />}
										tooltip={blocked ?? 'Download the agent as one .tsx'}
										onClick={() => {
											if (focused && source) {
												download(`${focused.agentId}.tsx`, exportBundle(focused, source));
											}
										}}
									/>
									<DropdownMenu
										button={{
											label: 'More export options',
											isIconOnly: true,
											icon: <Icon icon={IconChevronDown} size="sm" />,
											isDisabled: !compiled.ok,
										}}
										hasChevron={false}
										placement="below"
										alignment="end"
										items={[
											{
												id: 'copy',
												label: 'Copy',
												description: 'The .tsx, to paste into your code.',
												icon: <Icon icon={IconCopy} size="sm" />,
												onClick: () => {
													if (focused && source) copy(exportBundle(focused, source), 'the .tsx');
												},
											},
											{
												id: 'copy-llm',
												label: 'Copy for LLM',
												description:
													'The .tsx with a brief: what to install, where it goes, what to ask you.',
												icon: <Icon icon={IconSparkles} size="sm" />,
												onClick: () => {
													if (focused && source)
														copy(llmBrief(focused, source), 'the .tsx and its brief');
												},
											},
										]}
									/>
								</ButtonGroup>
								<Button
									label="Launch"
									isIconOnly={phone}
									variant="primary"
									icon={<Icon icon={IconExternalLink} size="sm" />}
									isDisabled={!compiled.ok}
									tooltip={blocked ?? 'Run the agent on its own page, in a new tab'}
									onClick={() => {
										const run =
											compiled.ok &&
											workspaceRunAgent(compiled, agentIdOf(compile.workspace, chatWith));
										if (run)
											openInNewTab({
												...runPayload(run),
												connectionMode: mode,
												localBaseUrl: connection.local.baseUrl,
											});
									}}
								/>
							</HStack>
						</Section>
						<StackItem size="fill">
							{payload ? (
								<PlaygroundRunner
									key={runKey}
									payload={payload}
									mode={mode}
									runtime={runtime}
									trace={traced && traceOpen}
									onActivity={() => {
										setUsedRun(runKey);
									}}
									initialChat={initialChat}
									onChatChange={(snapshot) => {
										saveConversation(chatWith, snapshot);
									}}
									chatRef={chatRef}
								/>
							) : (
								<EmptyState
									icon={<Icon icon={IconAlertTriangle} />}
									title="No agent yet"
									description={`${blocked ?? ''} to run the agent.`}
								/>
							)}
						</StackItem>
					</VStack>
				</LayoutContent>
			}
		/>
	);
}
