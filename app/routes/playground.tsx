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
	IconBook,
	IconChevronDown,
	IconCode,
	IconCopy,
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
	type CompiledPlayground,
	compilePlayground,
	createBlankDraft,
	createExampleDraft,
	createPlaygroundRunId,
	createSpanExampleDraft,
	draftFacets,
	excludeFacet,
	includableFacets,
	includeFacet,
	type PlaygroundDraft,
	type PlaygroundIssue,
	type PlaygroundNodeRef,
	type PlaygroundRunPayload,
	type PlaygroundTreeNode,
	playgroundInterface,
	playgroundNodeRef,
	playgroundSource,
	playgroundTree,
	savePlaygroundRunPayload,
} from '@theoremjs/playground';
import { useDisclosureMotion } from '@theoremjs/react/ui';
import {
	type CSSProperties,
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
} from '../components/inspector-context';
import { PlaygroundKeys, usePlaygroundConnection } from '../components/playground-connection';
import { PlaygroundRunner } from '../components/playground-runner';
import { PROFILE_TYPE_ICON, ProfileEditor, TOOL_TYPE_ICON } from '../components/profile-editor';
import { PLAYGROUND_SEED_IDS, type PlaygroundSeedId } from '../lib/docs/schema';
import { docsSeedDraft } from '../lib/docs/seeds';
import { exportBundle, llmBrief } from '../lib/export-agent';
import { FACET_ICON } from '../lib/facet-icons';
import { KERNEL_PACKAGE_VERSION } from '../lib/kernel-version';
import {
	clearConversation,
	createPlaygroundStore,
	type RestoredPlayground,
	restoreConversation,
	restorePlayground,
	saveConversation,
} from '../lib/playground-store';
import { type Th30PageHandle, useReportTh30Playground } from '../lib/th30-page';
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
		draft,
		revision: kept.kind === 'restored' ? kept.value.revision + 1 : 0,
		selectedId: 'identity',
		ledger: kept.kind === 'restored' ? kept.value.ledger : [],
	});
	if (isPlaygroundSeed(seed)) {
		return {
			start: fresh(docsSeedDraft(seed)),
			displaced: kept.kind === 'restored' ? kept.value.draft : undefined,
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

/** What every tree row reads: the draft, the selection, and how to change them. */
interface TreeState {
	draft: PlaygroundDraft;
	selectedId: string;
	onSelect: (id: string) => void;
	setDraft: (update: (draft: PlaygroundDraft) => PlaygroundDraft) => void;
}

/** A row's hover action: stops at the button so the row itself isn't selected. */
function rowAction(label: string, icon: IconType, onPress: () => void) {
	return (
		<span className="playground-tree-action">
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
		</span>
	);
}

function treeItem(tree: TreeState, node: PlaygroundTreeNode, isTop = false): TreeListItemData {
	const { draft, selectedId, onSelect, setDraft } = tree;
	const facet = node.ref.facet;
	const isOptional = isTop && facet !== 'toolSpec' && profileGraphFacet(facet)?.optional === true;
	return {
		id: node.id,
		label: node.label,
		startContent: <Icon icon={nodeIcon(draft, node.ref)} size="sm" color="secondary" />,
		endContent: isOptional
			? rowAction(`Remove ${node.label}`, IconX, () => {
					setDraft((current) => excludeFacet(current, facet));
				})
			: undefined,
		className: isOptional ? 'playground-tree-row' : undefined,
		isSelected: node.id === selectedId,
		isExpanded: node.children.length > 0,
		onClick: () => {
			onSelect(node.id);
		},
		children: node.children.length
			? node.children.map((child) => treeItem(tree, child))
			: undefined,
	};
}

/** An optional section the type allows but the draft leaves out: dimmed; a click adds it. */
function offItem({ onSelect, setDraft }: TreeState, facet: ProfileGraphFacetId): TreeListItemData {
	const label = profileGraphFacet(facet)?.label ?? facet;
	const add = () => {
		setDraft((current) => includeFacet(current, facet));
		onSelect(facet);
	};
	return {
		id: facet,
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
 * Identity, labelled with the agent's id, sits beside the facets rather than above them. Every
 * section the profile type allows is listed, in catalog order: optional ones left out, dimmed.
 */
function treeItems(tree: TreeState): TreeListItemData[] {
	const { draft } = tree;
	const root = playgroundTree(draft);
	const shown = new Map(root.children.map((node) => [node.id, node]));
	const off = includableFacets(draft);
	const all = draftFacets({ ...draft, included: [...draft.included, ...off] }).filter(
		(facet) => facet !== 'identity',
	);
	const items = [
		treeItem(tree, { ...root, children: [] }),
		...all.map((facet) => {
			const node = shown.get(facet);
			return node ? treeItem(tree, node, true) : offItem(tree, facet);
		}),
	];
	// The tree keeps a column for the expand arrows only while some row has one; keep it always,
	// so rows don't jump sideways when the last branch goes (a host's last tool, say).
	return items.some((item) => item.children?.length)
		? items
		: items.map((item) => ({ ...item, style: CHEVRON_COLUMN }));
}

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
}: CompiledPlayground): PlaygroundRunPayload {
	return { agentId, profile, customTools, structured, questions };
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

/**
 * The profile tree beside the editor (or code) for the draft in a panel on the left; the compiled
 * agent on the right, under Export and Run. The draft compiles as it changes; while it doesn't
 * compile, the agent stays the last one that did.
 */
export default function Playground({ loaderData }: Route.ComponentProps) {
	// The draft lives in a store kept in this tab's sessionStorage; th30's tools read it synchronously.
	const [store] = useState(() => createPlaygroundStore(loaderData.start));
	const draft = useSyncExternalStore(store.subscribe, store.getDraft, store.getDraft);
	const setDraft = useCallback(
		(next: PlaygroundDraft | ((current: PlaygroundDraft) => PlaygroundDraft)) => {
			store.update(next);
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
	const namedSlots = [
		draft.models.key,
		draft.models.fallbackKey,
		...draft.modelBindings.flatMap((binding) => [binding.keySlot, binding.fallbackKeySlot]),
	].filter((slot): slot is string => Boolean(slot));
	const connection = usePlaygroundConnection(draft.modelBindings, undefined, namedSlots);
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
	/** Two badges per list row at the panel's default width or wider; one once it is narrowed. */
	const listBadges =
		layoutWidth === undefined ||
		sidePanel.size >= Math.round((SIDE_DEFAULT_PERCENT / 100) * layoutWidth)
			? 2
			: 1;
	const [selectedId, setSelectedId] = useState(loaderData.start.selectedId);
	useEffect(() => {
		store.select(selectedId);
	}, [store, selectedId]);
	const editorRef = useRef<HTMLDivElement>(null);
	// The profile tree's branches mount and unmount; ease them both ways.
	const sidebarRef = useRef<HTMLDivElement>(null);
	useDisclosureMotion(sidebarRef);
	/** Bumped by the issue pill; once the editor shows the node, its first failing row is revealed. */
	const [issueReveal, setIssueReveal] = useState(0);
	useEffect(() => {
		if (!issueReveal) return;
		const row = editorRef.current?.querySelector(`[${ISSUE_ROW_ATTRIBUTE}]`);
		row?.scrollIntoView({ block: 'center' });
		row?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus({ preventScroll: true });
	}, [issueReveal]);
	const [bodyRef, bodyHeight] = useMeasure(measureHeight);
	const [codeRef, codeChrome] = useMeasure(measureCodeChrome);
	const codeHeight = bodyHeight === undefined ? undefined : bodyHeight - (codeChrome ?? 0);
	const selected = playgroundNodeRef(draft, selectedId) ? selectedId : 'identity';
	const settledDraft = useDebounced(draft, COMPILE_DEBOUNCE_MS);
	const compiled = useMemo(() => compilePlayground(settledDraft, mode), [settledDraft, mode]);
	// Only a draft that compiles changes the preview; while one has issues, the last good agent and its
	// conversation stay put.
	const [lastGood, setLastGood] = useState(compiled.ok ? compiled : null);
	if (compiled.ok && compiled !== lastGood) setLastGood(compiled);
	const payload = useMemo(
		() =>
			lastGood
				? { ...runPayload(lastGood), connectionMode: mode, localBaseUrl: connection.local.baseUrl }
				: null,
		[lastGood, mode, connection.local.baseUrl],
	);
	const traced = useMemo(() => isTraced(payload), [payload]);
	const [traceOpen, setTraceOpen] = useState(false);
	// Bumping this remounts the runner: a fresh transcript and trace feed, the same profile.
	const [conversation, setConversation] = useState(0);
	/** On a phone, the tree or the preview, each over the editor; neither shows beside it there. */
	const [sheet, setSheet] = useState<'tree' | 'preview' | null>(null);
	const phone = usePhone();
	const runKey = `${mode}:${String(conversation)}`;
	// The kept conversation resumes in the first runner only; a cleared or remade one starts empty.
	const [resume] = useState(() => ({
		runKey,
		chat: restoreConversation(),
	}));
	/** The runner that last sent something; a new one (cleared, or another mode) has no history. */
	const [usedRun, setUsedRun] = useState<string>();
	const source = useMemo(() => (compiled.ok ? playgroundSource(compiled) : null), [compiled]);
	const issues = compiled.ok
		? undefined
		: compiled.issues.length === 1
			? '1 issue'
			: `${String(compiled.issues.length)} issues`;
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
						setDraft(displaced);
						dismiss();
					}}
				/>
			),
		});
	}, [toast, setDraft]);
	/** Swaps in a whole new draft from Identity; the toast can put the old one back. */
	const replaceDraft = (next: PlaygroundDraft, message: string) => {
		const previous = draft;
		setDraft(next);
		setSelectedId('identity');
		setKeysOpen(false);
		setEditorView('editor');
		// A new agent starts a new conversation; the old one's transcript doesn't carry over.
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
						setDraft(previous);
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

	const title = editorTitle(draft, selected);
	useReportTh30Playground({
		agent: draft.identity.handle || draft.identity.agentId || 'unnamed',
		type: draft.identity.profileType || 'not chosen',
		issues: compiled.ok ? 0 : compiled.issues.length,
		section: title,
	});

	return (
		<Layout
			ref={layoutCallbackRef}
			className={sheet ? `playground-frame playground-${sheet}-open` : 'playground-frame'}
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
												<ScrollableArea ref={sidebarRef} label="Profile" height="100%">
													<TreeList
														density="compact"
														aria-label="Profile"
														items={treeItems({
															draft,
															selectedId: keysOpen ? '' : selected,
															onSelect: (id) => {
																setKeysOpen(false);
																setSelectedId(id);
																setEditorView('editor');
																setSheet(null);
															},
															setDraft,
														})}
													/>
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
													{(keysOpen ? 'Keys' : title) && (
														<Heading level={4}>{keysOpen ? 'Keys' : title}</Heading>
													)}
												</StackItem>
												{issues && !compiled.ok && (
													<Token
														label={issues}
														color="orange"
														description="Go to the next issue"
														onClick={() => {
															setKeysOpen(false);
															setSelectedId(nextIssueNode(compiled.issues, selected));
															setEditorView('editor');
															setIssueReveal((count) => count + 1);
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
												<DropdownMenu
													button={{
														label: 'Load an example',
														variant: 'ghost',
														isIconOnly: true,
														icon: <Icon icon={IconBook} size="sm" />,
													}}
													hasChevron={false}
													placement="below"
													alignment="end"
													items={[
														{
															id: 'concierge',
															label: 'Travel concierge',
															onClick: () => {
																replaceDraft(createExampleDraft(), 'Loaded the example.');
															},
														},
														{
															id: 'span',
															label: 'Span decision',
															description: 'Tool-call safety with the free Span model.',
															onClick: () => {
																replaceDraft(createSpanExampleDraft(), 'Loaded the Span example.');
															},
														},
													]}
												/>
												<IconButton
													label="Clear"
													variant="ghost"
													icon={<Icon icon={IconEraser} size="sm" />}
													tooltip="Start from a blank profile"
													onClick={() => {
														replaceDraft(createBlankDraft(), 'Cleared the profile.');
													}}
												/>
												<IconButton
													label={editorView === 'editor' ? 'Code' : 'Editor'}
													variant="ghost"
													icon={
														<Icon
															icon={editorView === 'editor' ? IconCode : IconAdjustmentsHorizontal}
															size="sm"
														/>
													}
													tooltip={editorView === 'editor' ? 'Show the code' : 'Show the editor'}
													onClick={() => {
														setKeysOpen(false);
														setEditorView(editorView === 'editor' ? 'code' : 'editor');
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
															setDraft((current) => ({
																...current,
																models: {
																	...current.models,
																	key: current.models.key === from ? to : current.models.key,
																	fallbackKey:
																		current.models.fallbackKey === from
																			? to
																			: current.models.fallbackKey,
																},
																modelBindings: current.modelBindings.map((binding) => ({
																	...binding,
																	keySlot: binding.keySlot === from ? to : binding.keySlot,
																	fallbackKeySlot:
																		binding.fallbackKeySlot === from ? to : binding.fallbackKeySlot,
																})),
															}));
														}}
														onRemoveSlot={(slot) => {
															setDraft((current) => ({
																...current,
																models: {
																	...current.models,
																	key: current.models.key === slot ? '' : current.models.key,
																	fallbackKey:
																		current.models.fallbackKey === slot
																			? ''
																			: current.models.fallbackKey,
																},
																modelBindings: current.modelBindings.map((binding) => ({
																	...binding,
																	keySlot: binding.keySlot === slot ? '' : binding.keySlot,
																	fallbackKeySlot:
																		binding.fallbackKeySlot === slot ? '' : binding.fallbackKeySlot,
																})),
															}));
														}}
													/>
												</ScrollableArea>
											) : editorView === 'editor' ? (
												<ScrollableArea key={selected} label="Editor" height="100%" ref={editorRef}>
													<ListBadges value={listBadges}>
														<ConnectionMode.Provider value={mode}>
															<LocalConnection.Provider value={connection}>
																<ProfileEditor
																	draft={draft}
																	setDraft={setDraft}
																	selectedId={selected}
																	onSelect={(id) => {
																		setKeysOpen(false);
																		setSelectedId(id);
																		setEditorView('editor');
																	}}
																	issues={compiled.ok ? [] : compiled.issues}
																/>
															</LocalConnection.Provider>
														</ConnectionMode.Provider>
													</ListBadges>
												</ScrollableArea>
											) : source && compiled.ok ? (
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
								<StackItem size="fill" />
								{payload && usedRun === runKey && (
									<IconButton
										label="Clear history"
										variant="ghost"
										icon={<Icon icon={IconPlaylistX} size="sm" />}
										tooltip="Clear the conversation and its traces. Your profile stays."
										onClick={() => {
											clearConversation();
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
											if (compiled.ok && source) {
												download(`${compiled.agentId}.tsx`, exportBundle(compiled, source));
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
													if (compiled.ok && source)
														copy(exportBundle(compiled, source), 'the .tsx');
												},
											},
											{
												id: 'copy-llm',
												label: 'Copy for LLM',
												description:
													'The .tsx with a brief: what to install, where it goes, what to ask you.',
												icon: <Icon icon={IconSparkles} size="sm" />,
												onClick: () => {
													if (compiled.ok && source)
														copy(llmBrief(compiled, source), 'the .tsx and its brief');
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
										if (compiled.ok)
											openInNewTab({
												...runPayload(compiled),
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
									initialChat={runKey === resume.runKey ? resume.chat : undefined}
									onChatChange={saveConversation}
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
