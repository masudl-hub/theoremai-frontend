import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Layout, LayoutContent, LayoutPanel } from '@astryxdesign/core/Layout';
import { List, ListItem } from '@astryxdesign/core/List';
import { ResizeHandle, useResizable } from '@astryxdesign/core/Resizable';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { Section } from '@astryxdesign/core/Section';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { TreeList, type TreeListItemData } from '@astryxdesign/core/TreeList';
import { VStack } from '@astryxdesign/core/VStack';
import {
	IconActivity,
	IconAdjustmentsHorizontal,
	IconAlertTriangle,
	IconBook,
	IconBrain,
	IconCode,
	IconDownload,
	IconFileExport,
	IconFileImport,
	IconGitBranch,
	IconId,
	IconListTree,
	IconMicrophone,
	IconPhoto,
	IconPlayerPlay,
	IconRepeat,
	IconShieldCheck,
	IconStack2,
	IconTool,
	IconVolume,
} from '@tabler/icons-react';
import { profileGraphFacet } from '@theoremai/agents';
import {
	type CompiledPlayground,
	compilePlayground,
	createBlankDraft,
	createExampleDraft,
	createPlaygroundRunId,
	createPlaygroundTransport,
	type PlaygroundDraft,
	type PlaygroundIssue,
	type PlaygroundNodeRef,
	type PlaygroundRunPayload,
	type PlaygroundTreeNode,
	playgroundInterface,
	playgroundLiveConnection,
	playgroundNodeRef,
	playgroundSource,
	playgroundTree,
	savePlaygroundRunPayload,
} from '@theoremai/playground';
import { LiveRunner } from '@theoremai/react/live';
import { TheoremChat } from '@theoremai/react/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ISSUE_ROW_ATTRIBUTE, ListBadges } from '../components/inspector';
import { PROFILE_TYPE_ICON, ProfileEditor, TOOL_TYPE_ICON } from '../components/profile-editor';
import type { Route } from './+types/playground';
import type { ShellHandle } from './shell';

export const handle = { isOnBase: true } satisfies ShellHandle;

export function meta() {
	return [{ title: 'Playground · THEOREM' }];
}

/** Draft keys are random, so the draft is made in the browser rather than rendered on the server. */
export function clientLoader() {
	return { draft: createExampleDraft() };
}

export function HydrateFallback() {
	return null;
}

const EXAMPLES = [
	{
		id: 'blank',
		label: 'Blank',
		description: 'Start with no profile type.',
		create: createBlankDraft,
	},
	{
		id: 'travel-concierge',
		label: 'Travel concierge',
		description: 'Text agent with demo tools.',
		create: createExampleDraft,
	},
] as const;

const FACET_ICON = {
	identity: IconId,
	models: IconStack2,
	modelBinding: IconBrain,
	tools: IconTool,
	inputs: IconFileImport,
	outputs: IconFileExport,
	turnBehaviour: IconRepeat,
	guardrails: IconShieldCheck,
	observability: IconActivity,
	image: IconPhoto,
	speech: IconVolume,
	live: IconMicrophone,
	decision: IconGitBranch,
} satisfies Record<Exclude<PlaygroundNodeRef['facet'], 'toolSpec'>, unknown>;

/** A node's icon; Identity shows the profile type's once one is picked. */
function nodeIcon(draft: PlaygroundDraft, ref: PlaygroundNodeRef) {
	const type = draft.identity.profileType;
	if (ref.facet === 'identity' && type) return PROFILE_TYPE_ICON[type];
	if (ref.facet !== 'toolSpec') return FACET_ICON[ref.facet];
	const tool = draft.toolSpecs.find((spec) => spec.key === ref.key);
	return tool ? TOOL_TYPE_ICON[tool.toolType] : IconTool;
}

function treeItem(
	draft: PlaygroundDraft,
	node: PlaygroundTreeNode,
	selectedId: string,
	onSelect: (id: string) => void,
): TreeListItemData {
	return {
		id: node.id,
		label: node.label,
		startContent: <Icon icon={nodeIcon(draft, node.ref)} size="sm" color="secondary" />,
		isSelected: node.id === selectedId,
		isExpanded: node.children.length > 0,
		onClick: () => {
			onSelect(node.id);
		},
		children: node.children.length
			? node.children.map((child) => treeItem(draft, child, selectedId, onSelect))
			: undefined,
	};
}

/** Identity, labelled with the agent's id, sits beside the facets rather than above them. */
function treeItems(
	draft: PlaygroundDraft,
	selectedId: string,
	onSelect: (id: string) => void,
): TreeListItemData[] {
	const root = playgroundTree(draft);
	const identity = { ...root, children: [] };
	return [identity, ...root.children].map((node) => treeItem(draft, node, selectedId, onSelect));
}

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
}: CompiledPlayground): PlaygroundRunPayload {
	return { agentId, profile, customTools, structured };
}

/** Hands the compiled agent to a new tab through this browser's storage; the run route reads it back. */
function openInNewTab(payload: PlaygroundRunPayload) {
	const runId = createPlaygroundRunId();
	savePlaygroundRunPayload(payload, runId);
	window.open(`/playground/run?run=${encodeURIComponent(runId)}`, '_blank', 'noopener');
}

/** Downloads the draft's TypeScript as `<agentId>.ts`. */
function download(agentId: string, source: string) {
	const url = URL.createObjectURL(new Blob([source], { type: 'text/typescript' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = `${agentId}.ts`;
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

/** The editor panel's default share of the layout. */
const EDITOR_DEFAULT_PERCENT = 33.2;
const measureCodeChrome = (node: HTMLElement) =>
	node.getBoundingClientRect().height -
	(node.querySelector('[role="group"]')?.getBoundingClientRect().height ?? 0);

/** The agent compiled from the draft, running live; a new compile swaps in its profile. */
function AgentPreview({ payload }: { payload: PlaygroundRunPayload }) {
	const iface = useMemo(() => playgroundInterface(payload), [payload]);
	const transport = useMemo(() => createPlaygroundTransport(payload), [payload]);
	if (iface.type === 'live') {
		return <LiveRunner iface={iface} connection={() => playgroundLiveConnection(payload)} />;
	}
	return <TheoremChat transport={transport} />;
}

/**
 * The profile tree on the left, the compiled agent in the middle, and the editor or code for the
 * draft on the right. The draft compiles as it changes; while it doesn't compile, the middle keeps
 * the last agent that did.
 */
export default function Playground({ loaderData }: Route.ComponentProps) {
	const [draft, setDraft] = useState<PlaygroundDraft>(loaderData.draft);
	const [panel, setPanel] = useState('profile');
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
	const treePanel = useResizable({
		defaultSize: '20%',
		minSize: 240,
		containerRef: layoutRef,
		autoSaveId: 'playground.tree',
	});
	const editorPanel = useResizable({
		defaultSize: `${String(EDITOR_DEFAULT_PERCENT)}%`,
		minSize: 320,
		containerRef: layoutRef,
		autoSaveId: 'playground.editor',
	});
	/** Two badges per list row at the editor's default width or wider; one once it is narrowed. */
	const listBadges =
		layoutWidth === undefined ||
		editorPanel.size >= Math.round((EDITOR_DEFAULT_PERCENT / 100) * layoutWidth)
			? 2
			: 1;
	const [selectedId, setSelectedId] = useState('identity');
	const editorRef = useRef<HTMLDivElement>(null);
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
	const compiled = useMemo(() => compilePlayground(settledDraft), [settledDraft]);
	const [lastGood, setLastGood] = useState(compiled.ok ? compiled : null);
	if (compiled.ok && compiled !== lastGood) setLastGood(compiled);
	const payload = useMemo(() => (lastGood ? runPayload(lastGood) : null), [lastGood]);
	const source = useMemo(() => (compiled.ok ? playgroundSource(compiled) : null), [compiled]);
	const issues = compiled.ok
		? undefined
		: compiled.issues.length === 1
			? '1 issue'
			: `${String(compiled.issues.length)} issues`;
	const blocked = issues && `Fix ${issues} first`;

	const title = editorTitle(draft, selected);

	function load(create: () => PlaygroundDraft) {
		setDraft(create());
		setSelectedId('identity');
		setPanel('profile');
	}

	return (
		<Layout
			ref={layoutCallbackRef}
			padding={0}
			start={
				<>
					<LayoutPanel
						resizable={treePanel.props}
						padding={0}
						role="navigation"
						label="Playground"
						isScrollable={false}
					>
						<Section variant="raised" height="100%" padding={4}>
							<VStack gap={4} height="100%">
								<VStack gap={1}>
									<Heading level={3}>Theorem Playground</Heading>
									<Text type="supporting" color="secondary">
										Configure an agent's profile, then run it to test.
									</Text>
								</VStack>
								<SegmentedControl label="Panel" value={panel} onChange={setPanel} layout="fill">
									<SegmentedControlItem
										value="profile"
										label="Profile"
										icon={<Icon icon={IconListTree} size="sm" />}
									/>
									<SegmentedControlItem
										value="examples"
										label="Examples"
										icon={<Icon icon={IconBook} size="sm" />}
									/>
								</SegmentedControl>
								<StackItem size="fill">
									<ScrollableArea
										label={panel === 'profile' ? 'Profile' : 'Examples'}
										height="100%"
									>
										{panel === 'profile' ? (
											<TreeList
												density="compact"
												aria-label="Profile"
												items={treeItems(draft, selected, setSelectedId)}
											/>
										) : (
											<List aria-label="Examples">
												{EXAMPLES.map((example) => (
													<ListItem
														key={example.id}
														label={example.label}
														description={example.description}
														onClick={() => {
															load(example.create);
														}}
													/>
												))}
											</List>
										)}
									</ScrollableArea>
								</StackItem>
							</VStack>
						</Section>
					</LayoutPanel>
					<ResizeHandle
						direction="horizontal"
						isAlwaysVisible={false}
						resizable={treePanel.props}
						label="Resize profile"
					/>
				</>
			}
			content={
				<LayoutContent isScrollable={false} padding={0}>
					{payload ? (
						<AgentPreview payload={payload} />
					) : (
						<EmptyState
							icon={<Icon icon={IconAlertTriangle} />}
							title="No agent yet"
							description={`${blocked ?? ''} to run the agent.`}
						/>
					)}
				</LayoutContent>
			}
			end={
				<>
					<ResizeHandle
						direction="horizontal"
						isReversed
						isAlwaysVisible={false}
						resizable={editorPanel.props}
						label="Resize editor"
					/>
					<LayoutPanel
						resizable={editorPanel.props}
						padding={0}
						label="Editor"
						isScrollable={false}
					>
						<Section variant="raised" height="100%" padding={0}>
							<VStack height="100%">
								<Section variant="transparent" padding={3} dividers={['bottom']}>
									<HStack gap={1} vAlign="center">
										<StackItem size="fill">
											{title && <Heading level={4}>{title}</Heading>}
										</StackItem>
										{issues && !compiled.ok && (
											<Token
												label={issues}
												color="orange"
												description="Go to the next issue"
												onClick={() => {
													setSelectedId(nextIssueNode(compiled.issues, selected));
													setPanel('profile');
													setEditorView('editor');
													setIssueReveal((count) => count + 1);
												}}
											/>
										)}
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
												setEditorView(editorView === 'editor' ? 'code' : 'editor');
											}}
										/>
										<IconButton
											label="Export"
											variant="ghost"
											icon={<Icon icon={IconDownload} size="sm" />}
											isDisabled={!compiled.ok}
											tooltip={blocked ?? 'Download the TypeScript'}
											onClick={() => {
												if (compiled.ok && source) download(compiled.agentId, source);
											}}
										/>
										<IconButton
											label="Run"
											variant="ghost"
											icon={<Icon icon={IconPlayerPlay} size="sm" />}
											isDisabled={!compiled.ok}
											tooltip={blocked ?? 'Open the agent in a new tab'}
											onClick={() => {
												if (compiled.ok) openInNewTab(runPayload(compiled));
											}}
										/>
									</HStack>
								</Section>
								<StackItem size="fill" ref={bodyRef}>
									{/* The editor is keyed by node, so each one opens at its top. */}
									{editorView === 'editor' ? (
										<ScrollableArea key={selected} label="Editor" height="100%" ref={editorRef}>
											<ListBadges value={listBadges}>
												<ProfileEditor
													draft={draft}
													setDraft={setDraft}
													selectedId={selected}
													onSelect={setSelectedId}
													issues={compiled.ok ? [] : compiled.issues}
												/>
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
						</Section>
					</LayoutPanel>
				</>
			}
		/>
	);
}
