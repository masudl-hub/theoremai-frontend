import { Button } from '@astryxdesign/core/Button';
import { ButtonGroup } from '@astryxdesign/core/ButtonGroup';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useClipboard } from '@astryxdesign/core/hooks';
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
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { Token } from '@astryxdesign/core/Token';
import { TreeList, type TreeListItemData } from '@astryxdesign/core/TreeList';
import { VStack } from '@astryxdesign/core/VStack';
import {
	IconAdjustmentsHorizontal,
	IconAlertTriangle,
	IconArrowLeft,
	IconBook,
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
	IconSearch,
	IconShieldSearch,
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
	agentDraft,
	agentNodeId,
	type CompiledPlayground,
	type CompiledWorkspace,
	clearStalePlaygroundRuns,
	compileWorkspace,
	createBlankDraft,
	createBlankWorkspace,
	createDecisionExampleDraft,
	createExampleDraft,
	createPlaygroundRunId,
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
	readPlaygroundSource,
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
import {
	InPlace,
	RaisedPane,
	type TheoremChatHandle,
	useDisclosureMotion,
} from '@theoremjs/react/ui';
import {
	type CSSProperties,
	type Dispatch,
	memo,
	type ReactNode,
	type RefObject,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';
import { GuardrailTester } from '../components/guardrail-tester';
import {
	ConnectionMode,
	ISSUE_ROW_ATTRIBUTE,
	ListBadges,
	LocalConnection,
	WorkspaceContext,
} from '../components/inspector-context';
import { type CodeApply, PlaygroundCode } from '../components/playground-code';
import {
	type PlaygroundConnectionState,
	PlaygroundKeys,
	usePlaygroundConnection,
} from '../components/playground-connection';
import { PlaygroundRunner } from '../components/playground-runner';
import {
	addToolSpec,
	PROFILE_TYPE_ICON,
	ProfileEditor,
	toolTypeIcon,
} from '../components/profile-editor';
import { PLAYGROUND_SEED_IDS, type PlaygroundSeedId } from '../lib/docs/schema';
import { docsSeedDraft, docsSeedQuestion } from '../lib/docs/seeds';
import { exportFiles, exportText, llmBrief } from '../lib/export-agent';
import { FACET_ICON } from '../lib/facet-icons';
import { KERNEL_PACKAGE_VERSION } from '../lib/kernel-version';
import {
	clearConversation,
	restoreConversation,
	saveConversation,
} from '../lib/playground-conversation';
import { restorePlayground } from '../lib/playground-restore';
import type { RestoredPlayground } from '../lib/playground-session';
import { createPlaygroundStore, type PlaygroundStore } from '../lib/playground-store';
import { type Th30PageHandle, useReportTh30Playground } from '../lib/th30-page';
import { th30Surfaces } from '../lib/th30-surfaces';
import { toolCredential } from '../lib/tool-credentials';
import { runToolProbe } from '../lib/tool-probe';
import { zipFiles } from '../lib/zip';
import type { Route } from './+types/playground';
import type { ShellHandle } from './shell';

export const handle = {
	isOnBase: true,
	th30Page: () => ({
		title: 'Playground',
		summary:
			"The playground, where the visitor builds an agent without code. On the left are the profile sections, a tree of the agent's settings (type, identity, models, tools, guardrails and more), and a Keys panel for their own API keys. The middle is the editor for the selected section, and the right is a live preview to chat with the agent. Load an example offers ready agents such as Travel concierge and Jev decision. Issues the agent must fix before it can run are flagged, with a button to go to the next one. Export downloads every agent as a .zip of source files (the shared tools, a module per agent, the file that registers them in order, and the route and chat for the agent being chatted with), or copies them, or copies them with a brief for an LLM. Launch opens the agent in a new tab. That page uses the site shell: the chat fills the panel, and Keys floats at the top right. The docs explain each field, so th30 should search the docs for them.",
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
	clearStalePlaygroundRuns();
	const seed = new URL(request.url).searchParams.get('seed');
	const kept = restorePlayground();
	const fresh = (draft: PlaygroundDraft): RestoredPlayground => ({
		workspace: workspaceFromDraft(draft),
		revision: kept.kind === 'restored' ? kept.value.revision + 1 : 0,
	});
	if (isPlaygroundSeed(seed)) {
		return {
			start: fresh(docsSeedDraft(seed)),
			question: docsSeedQuestion(seed),
			displaced: kept.kind === 'restored' ? kept.value.workspace : undefined,
			discarded: kept.kind === 'discarded',
		};
	}
	if (kept.kind === 'restored')
		return { start: kept.value, question: undefined, displaced: undefined, discarded: false };
	return {
		start: fresh(createExampleDraft()),
		question: undefined,
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
	return tool ? toolTypeIcon(tool.toolType) : IconTool;
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
			tooltip={label}
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

/** The tool library, every agent picks its tools from these: those whose name or description holds `query`. */
function toolItems({ workspace, selectedId, onSelect, update }: WorkspaceTreeState, query: string) {
	const needle = query.trim().toLowerCase();
	return workspaceTree(workspace).tools.flatMap((node): TreeListItemData[] => {
		const tool = workspace.toolSpecs.find((spec) => spec.key === toolSpecKeyOf(node.id));
		const text = `${node.label} ${tool?.description ?? ''}`.toLowerCase();
		if (needle && !text.includes(needle)) return [];
		return [
			{
				id: node.id,
				label: node.label,
				startContent: (
					<Icon icon={tool ? toolTypeIcon(tool.toolType) : IconTool} size="sm" color="secondary" />
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
			},
		];
	});
}

/** Which of the workspace's lists the sidebar shows. */
type WorkspaceList = 'agents' | 'tools';

/**
 * Which list shows, following the selection, and the tool search. The open row stays in view: a
 * tool far down the library, one an issue opened, or one a cleared search or the toggle shows
 * again. Revealed after the list renders.
 */
function useWorkspaceList(selectedId: string, listRef: RefObject<HTMLDivElement | null>) {
	const listOf = (id: string): WorkspaceList =>
		toolSpecKeyOf(id) === undefined ? 'agents' : 'tools';
	const [list, setList] = useState(() => listOf(selectedId));
	const [shownFor, setShownFor] = useState(selectedId);
	const [query, setQuery] = useState('');
	if (shownFor !== selectedId) {
		setShownFor(selectedId);
		setList(listOf(selectedId));
	}
	const revealSelected = useCallback(() => {
		requestAnimationFrame(() => {
			listRef.current
				?.querySelector('[aria-selected="true"]')
				?.scrollIntoView({ block: 'nearest' });
		});
	}, [listRef]);
	useEffect(() => {
		// Nothing is selected while Keys is open.
		if (selectedId) revealSelected();
	}, [selectedId, revealSelected]);
	return { list, setList, query, setQuery, revealSelected };
}

/** The toggle between the agents and the tool library, each with its count. */
function WorkspaceListToggle({
	workspace,
	list,
	onChange,
}: {
	workspace: PlaygroundWorkspace;
	list: WorkspaceList;
	onChange: (next: WorkspaceList) => void;
}) {
	return (
		<SegmentedControl
			label="Workspace list"
			size="sm"
			layout="fill"
			value={list}
			onChange={(next) => {
				onChange(next === 'tools' ? 'tools' : 'agents');
			}}
		>
			<SegmentedControlItem value="agents" label={`Agents ${String(workspace.agents.length)}`} />
			<SegmentedControlItem value="tools" label={`Tools ${String(workspace.toolSpecs.length)}`} />
		</SegmentedControl>
	);
}

/** Adds a blank agent or one of the examples. */
function AddAgentMenu({ onAddAgent }: { onAddAgent: (draft: PlaygroundDraft) => void }) {
	return (
		<DropdownMenu
			button={{
				label: 'Add an agent',
				variant: 'ghost',
				size: 'sm',
				isIconOnly: true,
				tooltip: 'Add an agent',
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
					id: 'decision',
					label: 'Jev decision',
					description: 'Tool-call safety with the Jev decision model.',
					onClick: () => {
						onAddAgent(createDecisionExampleDraft());
					},
				},
			]}
		/>
	);
}

/** Adds a tool to the library, joined to the open agent, and opens it. */
function AddToolButton({ tree, draft }: { tree: WorkspaceTreeState; draft: PlaygroundDraft }) {
	return (
		<IconButton
			label="Add a tool"
			variant="ghost"
			size="sm"
			icon={<Icon icon={IconPlus} size="sm" />}
			tooltip="Add a tool"
			onClick={() => {
				addToolSpec(draft, tree.setDraft, tree.onSelect);
			}}
		/>
	);
}

/** Filters the tool library by name or description. */
function ToolSearchInput({ query, onChange }: { query: string; onChange: (next: string) => void }) {
	return (
		<TextInput
			label="Search tools"
			isLabelHidden
			size="sm"
			placeholder="Search tools"
			value={query}
			onChange={onChange}
			startIcon={IconSearch}
			hasClear
		/>
	);
}

/** The shown list's rows, or why there are none. */
function WorkspaceListBody({
	tree,
	list,
	tools,
	query,
	listRef,
}: {
	tree: WorkspaceTreeState;
	list: WorkspaceList;
	tools: TreeListItemData[];
	query: string;
	listRef: RefObject<HTMLDivElement | null>;
}) {
	return (
		<ScrollableArea ref={listRef} label="Workspace" height="100%">
			{list === 'agents' ? (
				<TreeList density="compact" aria-label="Agents" items={agentItems(tree)} />
			) : tools.length > 0 ? (
				<TreeList density="compact" aria-label="Tools" items={tools} />
			) : (
				<Text type="supporting" color="secondary">
					{query.trim() ? `No tool matches “${query.trim()}”.` : 'No tools yet.'}
				</Text>
			)}
		</ScrollableArea>
	);
}

/**
 * The workspace's two lists, one at a time: its agents, and the tool library they share. The
 * toggle follows the selection, so opening a tool from elsewhere (an issue, a new tool) shows it.
 */
function WorkspaceTreeLists({
	tree,
	draft,
	onAddAgent,
	listRef,
}: {
	tree: WorkspaceTreeState;
	/** The open agent's draft, which a new tool joins. */
	draft: PlaygroundDraft;
	onAddAgent: (draft: PlaygroundDraft) => void;
	/** The list's scroller. The toggle and search stay above it. */
	listRef: RefObject<HTMLDivElement | null>;
}) {
	const { list, setList, query, setQuery, revealSelected } = useWorkspaceList(
		tree.selectedId,
		listRef,
	);
	const tools = list === 'tools' ? toolItems(tree, query) : [];
	return (
		<VStack gap={2} height="100%">
			<HStack gap={1} vAlign="center">
				<StackItem size="fill">
					<WorkspaceListToggle
						workspace={tree.workspace}
						list={list}
						onChange={(next) => {
							setList(next);
							revealSelected();
						}}
					/>
				</StackItem>
				{list === 'agents' ? (
					<AddAgentMenu onAddAgent={onAddAgent} />
				) : (
					<AddToolButton tree={tree} draft={draft} />
				)}
			</HStack>
			{list === 'tools' && (
				<ToolSearchInput
					query={query}
					onChange={(next) => {
						setQuery(next);
						revealSelected();
					}}
				/>
			)}
			<StackItem size="fill">
				<WorkspaceListBody tree={tree} list={list} tools={tools} query={query} listRef={listRef} />
			</StackItem>
		</VStack>
	);
}

/** Which agent the preview chats with, once there is more than one. */
function ChatPicker({
	agents,
	chatWith,
	onChange,
}: {
	agents: ChatAgent[];
	chatWith: string;
	onChange: (key: string) => void;
}) {
	if (agents.length < 2) return null;
	return (
		<Selector
			label="Chat with"
			isLabelHidden
			variant="ghost"
			size="sm"
			// As wide as the name, so the chevron sits right after it.
			width="fit-content"
			value={chatWith}
			options={agents}
			onChange={onChange}
		/>
	);
}

interface ChatAgent {
	value: string;
	label: string;
}

/** The agents the preview can chat with: the same list while their keys and names stand. */
function useChatAgents(agents: PlaygroundWorkspace['agents']): ChatAgent[] {
	const names = JSON.stringify(agents.map((agent) => [agent.key, agent.identity.agentId]));
	return useMemo(
		() =>
			(JSON.parse(names) as [string, string][]).map(([value, agentId]) => ({
				value,
				label: agentId || 'Unnamed agent',
			})),
		[names],
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

/** The workspace's files as a .zip, named for the agent being chatted with. */
function downloadExport(files: Parameters<typeof zipFiles>[0], agentId: string) {
	download(`${agentId}.zip`, new Blob([zipFiles(files)], { type: 'application/zip' }));
}

/** Downloads `blob` as `filename`. */
function download(filename: string, blob: Blob) {
	const url = URL.createObjectURL(blob);
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

/** The layout has no padding, so this is the content box Astryx resolves panel percentages on. */
const measureWidth = (node: HTMLElement) => node.clientWidth;

/** The side panel's default share of the layout, the tree beside the editor: the golden split. */
const SIDE_DEFAULT_PERCENT = 38.2;
/** The profile tree's width inside the side panel; the editor takes the rest. */
const TREE_WIDTH = 224;

/** Whether the agent records traces, so the header can offer them. */
function isTraced(payload: PlaygroundRunPayload | null): boolean {
	if (payload === null || payload.profile.type === 'decision') return false;
	if (payload.profile.type === 'host') {
		return resolveObservabilityPolicy(payload.profile.observability).record;
	}
	return playgroundInterface(payload).observability?.record === true;
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
		...keyAndToolMembers(store, page),
		...runMembers(store, page, chat),
	};
}

/** th30's reach into the keys and the tool library: read and test a key, open Keys, probe a tool. */
function keyAndToolMembers(
	store: PlaygroundStore,
	page: RefObject<SurfacePage>,
): Pick<PlaygroundSurfaceHost, 'key' | 'openKeys' | 'testKey' | 'toolCredential' | 'testTool'> {
	return {
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
	};
}

/** th30's reach into the conversation and the chatted agent: send, start over, launch, export. */
function runMembers(
	store: PlaygroundStore,
	page: RefObject<SurfacePage>,
	chat: RefObject<TheoremChatHandle | null>,
): Pick<PlaygroundSurfaceHost, 'send' | 'newConversation' | 'launch' | 'exportAgent'> {
	/** What the chatted agent runs, with the agents it names. */
	const runNow = () => {
		const workspace = store.getWorkspace();
		const result = compileWorkspace(workspace, page.current.mode);
		return result.ok
			? workspaceRunAgent(result, agentIdOf(workspace, workspace.chatWith))
			: undefined;
	};
	return {
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
			const workspace = store.getWorkspace();
			const result = compileWorkspace(workspace, page.current.mode);
			const agent = result.ok ? compiledAgent(result, workspace, workspace.chatWith) : undefined;
			if (!result.ok || !agent) return Promise.resolve(false);
			if (format === 'zip') {
				downloadExport(exportFiles(result, agent), agent.agentId);
			} else if (format === 'copy') {
				page.current.copy(exportText(exportFiles(result, agent)), 'the files');
			} else {
				page.current.copy(llmBrief(result, agent), 'the files and their brief');
			}
			return Promise.resolve(true);
		},
	};
}

/**
 * Reveals the node the issue pill opened. Its first failing row is revealed once the editor shows
 * that node, which can be a render after the click, and a frame later, once the editor's new scroll
 * area scrolls.
 */
function useIssueReveal(selected: string) {
	const editorRef = useRef<HTMLDivElement>(null);
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
	return { editorRef, reveal: setIssueReveal };
}

/** Export (a .zip, or copied) and Launch, for the agent being chatted with; off while the workspace has issues. */
function ExportActions({
	compiled,
	chatted,
	chattedId,
	blocked,
	phone,
	copy,
	connection,
}: {
	compiled: CompiledWorkspace | undefined;
	chatted: CompiledPlayground | undefined;
	chattedId: string;
	blocked: string | undefined;
	phone: boolean;
	copy: (text: string, what: string) => void;
	connection: Pick<PlaygroundRunPayload, 'connectionMode' | 'localBaseUrl'>;
}) {
	return (
		<>
			<ExportMenu
				compiled={compiled}
				chatted={chatted}
				blocked={blocked}
				phone={phone}
				copy={copy}
			/>
			<Button
				label="Launch"
				isIconOnly={phone}
				variant="primary"
				icon={<Icon icon={IconExternalLink} size="sm" />}
				isDisabled={!compiled}
				tooltip={blocked ?? 'Run the agent on its own page, in a new tab'}
				onClick={() => {
					const run = compiled && workspaceRunAgent(compiled, chattedId);
					if (run) openInNewTab({ ...runPayload(run), ...connection });
				}}
			/>
		</>
	);
}

/** Export as a .zip, with Copy and Copy for LLM under its menu. */
function ExportMenu({
	compiled,
	chatted,
	blocked,
	phone,
	copy,
}: Omit<Parameters<typeof ExportActions>[0], 'chattedId' | 'connection'>) {
	return (
		<ButtonGroup label="Export" isDisabled={!compiled}>
			<Button
				label="Export"
				isIconOnly={phone}
				icon={<Icon icon={IconDownload} size="sm" />}
				tooltip={blocked ?? 'Download every agent as a .zip'}
				onClick={() => {
					if (compiled && chatted) {
						downloadExport(exportFiles(compiled, chatted), chatted.agentId);
					}
				}}
			/>
			<DropdownMenu
				button={{
					label: 'More export options',
					isIconOnly: true,
					icon: <Icon icon={IconChevronDown} size="sm" />,
					isDisabled: !compiled,
				}}
				hasChevron={false}
				placement="below"
				alignment="end"
				items={[
					{
						id: 'copy',
						label: 'Copy',
						description: 'Every file, each under its path, to paste into your code.',
						icon: <Icon icon={IconCopy} size="sm" />,
						onClick: () => {
							if (compiled && chatted) {
								copy(exportText(exportFiles(compiled, chatted)), 'the files');
							}
						},
					},
					{
						id: 'copy-llm',
						label: 'Copy for LLM',
						description:
							'Every file with a brief: what to install, where each goes, what to ask you.',
						icon: <Icon icon={IconSparkles} size="sm" />,
						onClick: () => {
							if (compiled && chatted)
								copy(llmBrief(compiled, chatted), 'the files and their brief');
						},
					},
				]}
			/>
		</ButtonGroup>
	);
}

/** The workspace's store, kept in this tab's sessionStorage, and the open agent's draft from it. */
function usePlaygroundWorkspace(start: RestoredPlayground) {
	// th30's tools read the store synchronously. The editor works on the open agent's draft, with the
	// whole tool library.
	const [store] = useState(() => createPlaygroundStore(start));
	const workspace = useSyncExternalStore(store.subscribe, store.getWorkspace, store.getWorkspace);
	const draft = useSyncExternalStore(store.subscribe, store.getDraft, store.getDraft);
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
	return { store, workspace, draft, focus: store.getFocus(), setDraft, update };
}

/** Keys are the workspace's: every agent's slots, so a called agent's key is asked for too. */
function useWorkspaceConnection(workspace: PlaygroundWorkspace): PlaygroundConnectionState {
	const bindings = workspace.agents.flatMap((agent) => agent.modelBindings);
	const namedSlots = workspace.agents
		.flatMap((agent) => [
			agent.models.key,
			agent.models.fallbackKey,
			...agent.modelBindings.flatMap((binding) => [binding.keySlot, binding.fallbackKeySlot]),
		])
		.filter((slot): slot is string => Boolean(slot));
	return usePlaygroundConnection(bindings, undefined, namedSlots);
}

/** The frame: the resizable panel on the left. */
function usePlaygroundFrame() {
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
	// The profile tree's branches mount and unmount; ease them both ways.
	const sidebarRef = useRef<HTMLDivElement>(null);
	useDisclosureMotion(sidebarRef);
	return {
		layoutCallbackRef,
		sidePanel,
		listBadges: badgesPerRow(sidePanel.size, layoutWidth),
		sidebarRef,
	};
}

/** The open agent's issues and the library's, by the editor's ids. */
function editorIssuesOf(compiled: WorkspaceCompileResult, focus: string): PlaygroundIssue[] {
	if (compiled.ok) return [];
	return compiled.issues.flatMap((issue) => {
		const nodeId = innerNodeId(issue.nodeId, focus);
		return nodeId === undefined ? [] : [{ ...issue, nodeId }];
	});
}

/**
 * The workspace compiled once edits settle. Only a workspace that compiles changes the preview;
 * while one has issues, the last good agent and its conversation stay put. The chatted agent is
 * found by its key there, so renaming it doesn't lose it.
 */
function useWorkspaceCompile(
	workspace: PlaygroundWorkspace,
	focus: string,
	connection: PlaygroundConnectionState,
) {
	const { mode } = connection;
	const settled = useDebounced(workspace, COMPILE_DEBOUNCE_MS);
	const compile = useMemo(
		() => ({ workspace: settled, result: compileWorkspace(settled, mode) }),
		[settled, mode],
	);
	const compiled = compile.result;
	const lastGood = useLastGood(compile);
	const chatWith = workspace.chatWith;
	const localBaseUrl = connection.local.baseUrl;
	const payload = useMemo(() => {
		const run =
			lastGood && workspaceRunAgent(lastGood.compiled, agentIdOf(lastGood.workspace, chatWith));
		return run ? { ...runPayload(run), connectionMode: mode, localBaseUrl } : null;
	}, [lastGood, chatWith, mode, localBaseUrl]);
	/** The open agent's compile: what the code view shows and Export takes. */
	const focused = compiled.ok ? compiledAgent(compiled, compile.workspace, focus) : undefined;
	const source = useMemo(() => (focused ? playgroundSource(focused) : null), [focused]);
	// One object per compile, so the panes that read it sit out the renders between.
	return useMemo(() => {
		const issues = issueCount(compiled);
		return {
			compiled,
			payload,
			traced: isTraced(payload),
			source,
			editorIssues: editorIssuesOf(compiled, focus),
			/** The agent being chatted with: Export adds its route and chat to the workspace's files. */
			chatted: compiled.ok ? compiledAgent(compiled, compile.workspace, chatWith) : undefined,
			chattedId: agentIdOf(compile.workspace, chatWith),
			issues,
			blocked: issues && `Fix ${issues} first`,
		};
	}, [compiled, compile.workspace, payload, source, focus, chatWith]);
}

type WorkspaceCompile = ReturnType<typeof useWorkspaceCompile>;

/** The preview's conversation with the chatted agent: which runner holds it, and what it resumes. */
function useConversationRun(mode: string, chatWith: string, question: string | undefined) {
	// Bumping this remounts the runner: a fresh transcript and trace feed, the same profile.
	const [conversation, setConversation] = useState(0);
	const runKey = `${mode}:${chatWith}:${String(conversation)}`;
	// Each agent's kept conversation resumes in the first runner it has here; a cleared or remade
	// one starts empty.
	const [firstRuns] = useState(() => new Map<string, string>());
	if (!firstRuns.has(chatWith)) firstRuns.set(chatWith, runKey);
	const isFirstRun = firstRuns.get(chatWith) === runKey;
	const [seeded] = useState(chatWith);
	const initialChat = useMemo(
		() => (isFirstRun ? restoreConversation(chatWith) : undefined),
		[isFirstRun, chatWith],
	);
	/** A docs seed's question waits in its agent's first composer, when that resumes nothing. */
	const initialText = isFirstRun && chatWith === seeded && !initialChat ? question : undefined;
	/** The runner that last sent something; a new one (cleared, or another mode) has no history. */
	const [usedRun, setUsedRun] = useState<string>();
	const isUsed = usedRun === runKey;
	return useMemo(
		() => ({
			runKey,
			initialChat,
			initialText,
			isUsed,
			markUsed: () => {
				setUsedRun(runKey);
			},
			setConversation,
		}),
		[runKey, initialChat, initialText, isUsed],
	);
}

type ConversationRun = ReturnType<typeof useConversationRun>;

/** Once, on arrival: say when a kept draft was set aside for a docs seed, or couldn't be read back. */
function useArrivalToast(
	{ displaced, discarded }: Pick<Route.ComponentProps['loaderData'], 'displaced' | 'discarded'>,
	store: PlaygroundStore,
) {
	const toast = useToast();
	const arrival = useRef({ displaced, discarded });
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
}

/** Which view stands in the editor column, and opening a node there. */
function useEditorView(store: PlaygroundStore) {
	const [keysOpen, setKeysOpen] = useState(false);
	const [editorView, setEditorView] = useState<'editor' | 'code'>('editor');
	/** Opens a node from the tree or the editor, closing whatever stood over it. */
	const open = useCallback(
		(id: string) => {
			setKeysOpen(false);
			store.select(id);
			setEditorView('editor');
		},
		[store],
	);
	return { keysOpen, setKeysOpen, editorView, setEditorView, open };
}

type EditorViewState = ReturnType<typeof useEditorView>;

/** What the page does for its buttons and for th30: swap in a workspace (with undo), and copy. */
function usePageActions(
	store: PlaygroundStore,
	view: EditorViewState,
	setConversation: Dispatch<SetStateAction<number>>,
) {
	const toast = useToast();
	const { copy: writeClipboard } = useClipboard();
	const { setKeysOpen, setEditorView } = view;
	/** Swaps in a whole new workspace; the toast can put the old one back. */
	const replaceWorkspace = useCallback(
		(next: PlaygroundWorkspace, message: string, by: 'th30' | 'visitor' = 'visitor') => {
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
		},
		[store, setKeysOpen, setEditorView, setConversation, toast],
	);
	const copy = useCallback(
		(text: string, what: string) => {
			void writeClipboard(text).then((copied) =>
				toast(
					copied
						? { body: `Copied ${what}.` }
						: { body: "Couldn't reach the clipboard.", type: 'error' },
				),
			);
		},
		[toast, writeClipboard],
	);
	return { replaceWorkspace, copy };
}

/**
 * th30 sees and works in the playground through its surface, mounted while the page is open. Its
 * tools read the page through a ref, so they register once and always see the latest.
 */
function usePlaygroundSurface(store: PlaygroundStore, page: SurfacePage) {
	const chatRef = useRef<TheoremChatHandle>(null);
	const pageRef = useRef(page);
	pageRef.current = page;
	useEffect(
		() => th30Surfaces.mount(playgroundSurface(playgroundSurfaceHost(store, pageRef, chatRef))),
		[store],
	);
	return chatRef;
}

/** What the open agent's editor knows of the others, and its allow list. */
function useWorkspaceContext(
	agents: PlaygroundWorkspace['agents'],
	focus: string,
	update: (change: (current: PlaygroundWorkspace) => PlaygroundWorkspace) => void,
) {
	return useMemo(() => {
		const self = agents.find((agent) => agent.key === focus);
		return {
			agents: agents.map((agent) => ({
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
	}, [agents, focus, update]);
}

type PlaygroundWorkspaceState = ReturnType<typeof usePlaygroundWorkspace>;
type Sheet = 'tree' | 'preview' | null;

/** The node the editor has open: the selected one while it exists, else the open agent's identity. */
function selectedNode(workspace: PlaygroundWorkspace, focus: string): string {
	return workspaceNodeRef(workspace, workspace.selected) ? workspace.selected : agentNodeId(focus);
}

/** A phone-only button that opens a sheet over the editor, or closes it (`null`). */
function SheetButton({
	label,
	icon,
	sheet,
	setSheet,
}: {
	label: string;
	icon: IconType;
	sheet: Sheet;
	setSheet: (sheet: Sheet) => void;
}) {
	return (
		<span className="playground-phone">
			<IconButton
				label={label}
				variant="ghost"
				icon={<Icon icon={icon} size="sm" />}
				onClick={() => {
					setSheet(sheet);
				}}
			/>
		</span>
	);
}

/**
 * The profile tree's column: the playground's name and version over the agents and tools. It sits
 * out renders that change nothing it shows, such as the code view or a new compile.
 */
const TreeColumn = memo(function TreeColumn({
	tree,
	draft,
	onAddAgent,
	listRef,
	setSheet,
}: {
	tree: WorkspaceTreeState;
	draft: PlaygroundDraft;
	onAddAgent: (next: PlaygroundDraft) => void;
	listRef: RefObject<HTMLDivElement | null>;
	setSheet: (sheet: Sheet) => void;
}) {
	return (
		<Section variant="transparent" width={TREE_WIDTH} height="100%" padding={4} dividers={['end']}>
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
					<SheetButton label="Close sections" icon={IconX} sheet={null} setSheet={setSheet} />
				</HStack>
				<StackItem size="fill">
					<WorkspaceTreeLists tree={tree} draft={draft} onAddAgent={onAddAgent} listRef={listRef} />
				</StackItem>
			</VStack>
		</Section>
	);
});

/** The issue count, which goes to the next issue after the selected node. Hidden with none. */
function IssueToken({
	compile,
	selected,
	onIssue,
}: {
	compile: WorkspaceCompile;
	selected: string;
	onIssue: (node: string) => void;
}) {
	const { compiled, issues } = compile;
	if (!issues || compiled.ok) return null;
	return (
		<Token
			label={issues}
			color="orange"
			description="Go to the next issue"
			onClick={() => {
				onIssue(nextIssueNode(compiled.issues, selected));
			}}
		/>
	);
}

/** Replaces the workspace with one of the examples. */
function ExampleMenu({
	replaceWorkspace,
}: {
	replaceWorkspace: (next: PlaygroundWorkspace, message: string) => void;
}) {
	return (
		<DropdownMenu
			button={{
				label: 'Load an example',
				variant: 'ghost',
				isIconOnly: true,
				icon: <Icon icon={IconBook} size="sm" />,
				tooltip: 'Load an example',
			}}
			hasChevron={false}
			placement="below"
			alignment="end"
			items={[
				{
					id: 'concierge',
					label: 'Travel concierge',
					description: 'A text agent with weather, places and currency tools.',
					onClick: () => {
						replaceWorkspace(workspaceFromDraft(createExampleDraft()), 'Loaded the example.');
					},
				},
				{
					id: 'decision',
					label: 'Jev decision',
					description: 'Tool-call safety with the Jev decision model.',
					onClick: () => {
						replaceWorkspace(
							workspaceFromDraft(createDecisionExampleDraft()),
							'Loaded the decision example.',
						);
					},
				},
			]}
		/>
	);
}

/** Switches the editor between the form and the code, closing Keys. */
function ViewToggleButton({ view }: { view: EditorViewState }) {
	const viewToggle = VIEW_TOGGLE[view.editorView];
	return (
		<IconButton
			label={viewToggle.label}
			variant="ghost"
			icon={<Icon icon={viewToggle.icon} size="sm" />}
			tooltip={viewToggle.tooltip}
			onClick={() => {
				view.setKeysOpen(false);
				view.setEditorView(viewToggle.next);
			}}
		/>
	);
}

/** The editor column's header: its title, the next issue, Keys, examples, Clear and the view toggle. */
function EditorToolbar({
	heading,
	compile,
	selected,
	view,
	onIssue,
	replaceWorkspace,
	setSheet,
}: {
	heading: string | undefined;
	compile: WorkspaceCompile;
	selected: string;
	view: EditorViewState;
	onIssue: (node: string) => void;
	replaceWorkspace: (next: PlaygroundWorkspace, message: string) => void;
	setSheet: (sheet: Sheet) => void;
}) {
	return (
		<Section variant="transparent" padding={3} dividers={['bottom']}>
			<HStack gap={1} vAlign="center">
				<SheetButton label="Sections" icon={IconMenu2} sheet={'tree'} setSheet={setSheet} />
				<StackItem size="fill">{heading && <Heading level={4}>{heading}</Heading>}</StackItem>
				<IssueToken compile={compile} selected={selected} onIssue={onIssue} />
				<IconButton
					label="Keys"
					variant="ghost"
					icon={<Icon icon={IconKey} size="sm" />}
					aria-pressed={view.keysOpen}
					tooltip="Keys"
					onClick={() => {
						view.setKeysOpen((open) => !open);
						view.setEditorView('editor');
					}}
				/>
				<ExampleMenu replaceWorkspace={replaceWorkspace} />
				<IconButton
					label="Clear"
					variant="ghost"
					icon={<Icon icon={IconEraser} size="sm" />}
					tooltip="Start again from one blank agent"
					onClick={() => {
						replaceWorkspace(createBlankWorkspace(), 'Cleared the playground.');
					}}
				/>
				<ViewToggleButton view={view} />
				<SheetButton label="Preview" icon={IconPlayerPlay} sheet={'preview'} setSheet={setSheet} />
			</HStack>
		</Section>
	);
}

/** The Keys panel, its slots renamed or let go across every agent. */
function KeysBody({
	connection,
	state,
}: {
	connection: PlaygroundConnectionState;
	state: PlaygroundWorkspaceState;
}) {
	const { setDraft, update } = state;
	return (
		<ScrollableArea label="Keys" height="100%">
			<PlaygroundKeys
				connection={connection}
				onAddSlot={(slot) => {
					setDraft((current) =>
						current.models.key ? current : { ...current, models: { ...current.models, key: slot } },
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
	);
}

/** The open node's editor, keyed by node so each one opens at its top. */
function EditorBody({
	state,
	connection,
	selected,
	editing,
	issues,
	listBadges,
	editorRef,
	open,
}: {
	state: PlaygroundWorkspaceState;
	connection: PlaygroundConnectionState;
	selected: string;
	editing: string;
	issues: PlaygroundIssue[];
	listBadges: 1 | 2;
	editorRef: RefObject<HTMLDivElement | null>;
	open: (id: string) => void;
}) {
	const { workspace, draft, focus, setDraft, update } = state;
	const workspaceContext = useWorkspaceContext(workspace.agents, focus, update);
	return (
		<ScrollableArea key={selected} label="Editor" height="100%" ref={editorRef}>
			<ListBadges value={listBadges}>
				<ConnectionMode.Provider value={connection.mode}>
					<LocalConnection.Provider value={connection}>
						<WorkspaceContext.Provider value={workspaceContext}>
							<ProfileEditor
								draft={draft}
								setDraft={setDraft}
								selectedId={editing}
								onSelect={(id) => {
									open(scopedNodeId(focus, id));
								}}
								issues={issues}
							/>
						</WorkspaceContext.Provider>
					</LocalConnection.Provider>
				</ConnectionMode.Provider>
			</ListBadges>
		</ScrollableArea>
	);
}

/** The open agent's TypeScript. A failed compile keeps the text and marks the issues. */
function CodeBody({
	source,
	blocked,
	issues,
	state,
}: {
	source: string | null;
	blocked: string | undefined;
	issues: PlaygroundIssue[];
	state: PlaygroundWorkspaceState;
}) {
	const seen = useRef(source);
	if (source) seen.current = source;
	const apply = useCallback(
		(text: string): CodeApply => {
			const current = agentDraft(state.workspace, state.focus);
			if (!current) {
				return { errors: [{ message: 'No agent is open.', line: 1, column: 1 }], spans: [] };
			}
			const read = readPlaygroundSource(
				text,
				{ ...current, toolSpecs: state.workspace.toolSpecs },
				(agentId) =>
					state.workspace.agents.find((agent) => agent.identity.agentId.trim() === agentId)?.key,
			);
			if (!read.ok) return { errors: read.errors, spans: [] };
			state.update((workspace) =>
				withAgentDraft(workspace, state.focus, read.draft, read.registered),
			);
			return { errors: [], spans: read.spans };
		},
		[state],
	);
	if (!seen.current) {
		return (
			<EmptyState
				icon={<Icon icon={IconAlertTriangle} />}
				title="No code yet"
				description={`${blocked ?? ''} to generate the TypeScript.`}
			/>
		);
	}
	return (
		<div style={{ height: '100%' }}>
			<PlaygroundCode
				text={source ?? seen.current}
				hold={source == null}
				issues={issues}
				onApply={apply}
			/>
		</div>
	);
}

/** Clears the conversation and its traces; the profile stays. */
function ClearHistoryButton({ chatWith, run }: { chatWith: string; run: ConversationRun }) {
	return (
		<IconButton
			label="Clear history"
			variant="ghost"
			icon={<Icon icon={IconPlaylistX} size="sm" />}
			tooltip="Clear the conversation and its traces. Your profile stays."
			onClick={() => {
				clearConversation(chatWith);
				run.setConversation((count) => count + 1);
			}}
		/>
	);
}

/** The preview's header: back to the editor, the agent to chat with, history, trace and Export. */
function PreviewHeader({
	store,
	chatAgents,
	chatWith,
	compile,
	run,
	connection,
	trace,
	testing,
	copy,
	setSheet,
}: {
	store: PlaygroundStore;
	chatAgents: ChatAgent[];
	chatWith: string;
	compile: WorkspaceCompile;
	run: ConversationRun;
	connection: PlaygroundConnectionState;
	trace: { open: boolean; toggle: () => void };
	testing: { open: boolean; toggle: () => void };
	copy: (text: string, what: string) => void;
	setSheet: (sheet: Sheet) => void;
}) {
	const phone = usePhone();
	const { compiled } = compile;
	return (
		<Section variant="transparent" padding={3}>
			<HStack gap={2} vAlign="center">
				<SheetButton
					label="Back to the editor"
					icon={IconArrowLeft}
					sheet={null}
					setSheet={setSheet}
				/>
				<StackItem size="fill">
					<ChatPicker agents={chatAgents} chatWith={chatWith} onChange={store.chatWith} />
				</StackItem>
				{compile.payload && run.isUsed && !testing.open && (
					<ClearHistoryButton chatWith={chatWith} run={run} />
				)}
				{compile.payload && (
					<Button
						label={testing.open ? 'Hide guardrail test' : 'Test guardrails'}
						isIconOnly={phone}
						icon={<Icon icon={IconShieldSearch} size="sm" />}
						aria-pressed={testing.open}
						onClick={testing.toggle}
					/>
				)}
				{compile.traced && !testing.open ? (
					<Button
						label={trace.open ? 'Hide trace' : 'View trace'}
						isIconOnly={phone}
						icon={<Icon icon={IconTimeline} size="sm" />}
						aria-pressed={trace.open}
						onClick={trace.toggle}
					/>
				) : null}
				<ExportActions
					compiled={compiled.ok ? compiled : undefined}
					chatted={compile.chatted}
					chattedId={compile.chattedId}
					blocked={compile.blocked}
					phone={phone}
					copy={copy}
					connection={{ connectionMode: connection.mode, localBaseUrl: connection.local.baseUrl }}
				/>
			</HStack>
		</Section>
	);
}

/**
 * The runner for the compiled agent, its conversation saved as it goes, or the guardrail tester
 * over it; while none compiles, why.
 */
function PreviewBody({
	compile,
	run,
	connection,
	chatRef,
	chatWith,
	traceOpen,
	testing,
}: {
	compile: WorkspaceCompile;
	run: ConversationRun;
	connection: PlaygroundConnectionState;
	chatRef: RefObject<TheoremChatHandle | null>;
	chatWith: string;
	traceOpen: boolean;
	testing: boolean;
}) {
	const { payload, traced } = compile;
	if (!payload) {
		return (
			<VStack height="100%" vAlign="center" padding={4}>
				<EmptyState
					icon={<Icon icon={IconAlertTriangle} />}
					title="No agent yet"
					description={`${compile.blocked ?? ''} to run the agent.`}
				/>
			</VStack>
		);
	}
	return (
		<InPlace
			view={
				testing ? (
					<RaisedPane>
						{(isWide) => <GuardrailTester payload={payload} isWide={isWide} />}
					</RaisedPane>
				) : null
			}
		>
			<PlaygroundRunner
				key={run.runKey}
				payload={payload}
				mode={connection.mode}
				runtime={connection.runtime}
				trace={traced ? traceOpen : undefined}
				onActivity={run.markUsed}
				initialChat={run.initialChat}
				initialText={run.initialText}
				onChatChange={(snapshot) => {
					saveConversation(chatWith, snapshot);
				}}
				chatRef={chatRef}
			/>
		</InPlace>
	);
}

/**
 * The compiled agent to chat with, under its header; while none compiles, why. It sits out renders
 * that change nothing it shows: typing in the editor, opening a node, Keys.
 */
const PreviewPane = memo(function PreviewPane({
	store,
	chatAgents,
	chatWith,
	compile,
	run,
	connection,
	chatRef,
	copy,
	setSheet,
}: {
	store: PlaygroundStore;
	chatAgents: ChatAgent[];
	chatWith: string;
	compile: WorkspaceCompile;
	run: ConversationRun;
	connection: PlaygroundConnectionState;
	chatRef: RefObject<TheoremChatHandle | null>;
	copy: (text: string, what: string) => void;
	setSheet: (sheet: Sheet) => void;
}) {
	const [traceOpen, setTraceOpen] = useState(false);
	const [testing, setTesting] = useState(false);
	return (
		<LayoutContent className="playground-preview" isScrollable={false} padding={0}>
			<VStack height="100%">
				<PreviewHeader
					store={store}
					chatAgents={chatAgents}
					chatWith={chatWith}
					compile={compile}
					run={run}
					connection={connection}
					trace={{
						open: traceOpen,
						toggle: () => {
							setTraceOpen((open) => !open);
						},
					}}
					testing={{
						open: testing,
						toggle: () => {
							setTesting((open) => !open);
						},
					}}
					copy={copy}
					setSheet={setSheet}
				/>
				<StackItem size="fill">
					<PreviewBody
						compile={compile}
						run={run}
						connection={connection}
						chatRef={chatRef}
						chatWith={chatWith}
						traceOpen={traceOpen}
						testing={testing}
					/>
				</StackItem>
			</VStack>
		</LayoutContent>
	);
});

/** Everything the page holds: the workspace, its connection, the editor's view, the compile and the run. */
function usePlaygroundPage(loaderData: Route.ComponentProps['loaderData']) {
	const state = usePlaygroundWorkspace(loaderData.start);
	const { store, workspace, draft, focus } = state;
	const connection = useWorkspaceConnection(workspace);
	const view = useEditorView(store);
	const frame = usePlaygroundFrame();
	const selected = selectedNode(workspace, focus);
	/** The open node as the editor names it: the open agent's own id, or a library tool's. */
	const editing = innerNodeId(selected, focus) ?? 'identity';
	const issueReveal = useIssueReveal(selected);
	const compile = useWorkspaceCompile(workspace, focus, connection);
	/** On a phone, the tree or the preview, each over the editor; neither shows beside it there. */
	const [sheet, setSheet] = useState<Sheet>(null);
	const run = useConversationRun(connection.mode, workspace.chatWith, loaderData.question);
	useArrivalToast(loaderData, store);
	const { replaceWorkspace, copy } = usePageActions(store, view, run.setConversation);
	const chatRef = usePlaygroundSurface(store, {
		mode: connection.mode,
		connection,
		replaceWorkspace,
		copy,
		setKeysOpen: view.setKeysOpen,
		setConversation: run.setConversation,
	});
	const title = editorTitle(draft, editing);
	useReportTh30Playground(th30Report(draft, compile.compiled, title));
	return {
		state,
		connection,
		view,
		frame,
		selected,
		editing,
		issueReveal,
		compile,
		sheet,
		setSheet,
		run,
		replaceWorkspace,
		copy,
		chatRef,
		title,
	};
}

/**
 * The profile tree beside the editor (or code) for the draft in a panel on the left; the compiled
 * agent on the right, under Export and Run. The draft compiles as it changes; while it doesn't
 * compile, the agent stays the last one that did.
 */
export default function Playground({ loaderData }: Route.ComponentProps) {
	const page = usePlaygroundPage(loaderData);
	const { state, connection, view, frame, selected, editing, issueReveal, compile } = page;
	const { sheet, setSheet, run, replaceWorkspace, copy, chatRef, title } = page;
	const { store, draft } = state;
	const tree = useWorkspaceTree(state, view, selected, setSheet);
	const chatAgents = useChatAgents(state.workspace.agents);
	const addAgentFrom = useAddAgent(store, state.update, view.open);

	return (
		<Layout
			ref={frame.layoutCallbackRef}
			className={frameClass(sheet)}
			padding={0}
			start={
				<SidePanel
					frame={frame}
					tree={tree}
					draft={draft}
					onAddAgent={addAgentFrom}
					setSheet={setSheet}
				>
					<EditorColumn
						heading={view.keysOpen ? 'Keys' : title}
						state={state}
						connection={connection}
						view={view}
						compile={compile}
						selected={selected}
						editing={editing}
						frame={frame}
						issueReveal={issueReveal}
						replaceWorkspace={replaceWorkspace}
						setSheet={setSheet}
					/>
				</SidePanel>
			}
			content={
				<PreviewPane
					store={store}
					chatAgents={chatAgents}
					chatWith={state.workspace.chatWith}
					compile={compile}
					run={run}
					connection={connection}
					chatRef={chatRef}
					copy={copy}
					setSheet={setSheet}
				/>
			}
		/>
	);
}

/** Adds an agent and opens it. */
function useAddAgent(
	store: PlaygroundStore,
	update: PlaygroundWorkspaceState['update'],
	open: (id: string) => void,
) {
	return useCallback(
		(next: PlaygroundDraft) => {
			update((current) => addAgent(current, next));
			open(store.getWorkspace().selected);
		},
		[store, update, open],
	);
}

/** What the tree reads of the page; opening a node closes the phone's sheet, and Keys selects nothing. */
function useWorkspaceTree(
	state: PlaygroundWorkspaceState,
	view: EditorViewState,
	selected: string,
	setSheet: (sheet: Sheet) => void,
): WorkspaceTreeState {
	const { workspace, focus, update, setDraft } = state;
	const { open } = view;
	const selectedId = view.keysOpen ? '' : selected;
	return useMemo(
		() => ({
			workspace,
			focus,
			selectedId,
			onSelect: (id) => {
				open(id);
				setSheet(null);
			},
			update,
			setDraft,
		}),
		[workspace, focus, selectedId, open, setSheet, update, setDraft],
	);
}

/** The resizable side panel: the tree beside the editor column (`children`), and its handle. */
function SidePanel({
	frame,
	tree,
	draft,
	onAddAgent,
	setSheet,
	children,
}: {
	frame: ReturnType<typeof usePlaygroundFrame>;
	tree: WorkspaceTreeState;
	draft: PlaygroundDraft;
	onAddAgent: (next: PlaygroundDraft) => void;
	setSheet: (sheet: Sheet) => void;
	children: ReactNode;
}) {
	return (
		<>
			<LayoutPanel
				resizable={frame.sidePanel.props}
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
							<TreeColumn
								tree={tree}
								draft={draft}
								onAddAgent={onAddAgent}
								listRef={frame.sidebarRef}
								setSheet={setSheet}
							/>
						</StackItem>
						<StackItem size="fill">{children}</StackItem>
					</HStack>
				</Section>
			</LayoutPanel>
			<ResizeHandle
				className="playground-side-handle"
				direction="horizontal"
				isAlwaysVisible={false}
				resizable={frame.sidePanel.props}
				label="Resize profile"
			/>
		</>
	);
}

/** The editor column: its toolbar over the Keys panel, the open node's editor, or its code. */
function EditorColumn({
	heading,
	state,
	connection,
	view,
	compile,
	selected,
	editing,
	frame,
	issueReveal,
	replaceWorkspace,
	setSheet,
}: {
	heading: string | undefined;
	state: PlaygroundWorkspaceState;
	connection: PlaygroundConnectionState;
	view: EditorViewState;
	compile: WorkspaceCompile;
	selected: string;
	editing: string;
	frame: ReturnType<typeof usePlaygroundFrame>;
	issueReveal: ReturnType<typeof useIssueReveal>;
	replaceWorkspace: (next: PlaygroundWorkspace, message: string) => void;
	setSheet: (sheet: Sheet) => void;
}) {
	const { editorRef, reveal } = issueReveal;
	return (
		<VStack height="100%">
			<EditorToolbar
				heading={heading}
				compile={compile}
				selected={selected}
				view={view}
				onIssue={(node) => {
					view.open(node);
					reveal({ node });
				}}
				replaceWorkspace={replaceWorkspace}
				setSheet={setSheet}
			/>
			<StackItem size="fill">
				<EditorColumnBody
					state={state}
					connection={connection}
					view={view}
					compile={compile}
					selected={selected}
					editing={editing}
					frame={frame}
					editorRef={editorRef}
				/>
			</StackItem>
		</VStack>
	);
}

/** Under the editor's header: the Keys panel, the open node's editor, or its code. */
function EditorColumnBody({
	state,
	connection,
	view,
	compile,
	selected,
	editing,
	frame,
	editorRef,
}: {
	state: PlaygroundWorkspaceState;
	connection: PlaygroundConnectionState;
	view: EditorViewState;
	compile: WorkspaceCompile;
	selected: string;
	editing: string;
	frame: ReturnType<typeof usePlaygroundFrame>;
	editorRef: RefObject<HTMLDivElement | null>;
}) {
	if (view.keysOpen) return <KeysBody connection={connection} state={state} />;
	if (view.editorView === 'code') {
		return (
			<CodeBody
				source={compile.source}
				blocked={compile.blocked}
				issues={compile.editorIssues}
				state={state}
			/>
		);
	}
	return (
		<EditorBody
			state={state}
			connection={connection}
			selected={selected}
			editing={editing}
			issues={compile.editorIssues}
			listBadges={frame.listBadges}
			editorRef={editorRef}
			open={view.open}
		/>
	);
}
