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
	IconActivity,
	IconAdjustmentsHorizontal,
	IconAlertTriangle,
	IconBook,
	IconBrain,
	IconChevronDown,
	IconCode,
	IconCopy,
	IconDownload,
	IconEraser,
	IconFileExport,
	IconFileImport,
	IconGitBranch,
	IconId,
	IconMicrophone,
	IconPhoto,
	IconPlayerPlay,
	IconPlus,
	IconQuote,
	IconRepeat,
	IconShieldCheck,
	IconSparkles,
	IconStack2,
	IconTool,
	IconVolume,
	IconX,
} from '@tabler/icons-react';
import { type ProfileGraphFacetId, profileGraphFacet } from '@theoremai/agents';
import {
	type CompiledPlayground,
	compilePlayground,
	createBlankDraft,
	createExampleDraft,
	createPlaygroundRunId,
	createPlaygroundTransport,
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
	playgroundLiveConnection,
	playgroundNodeRef,
	playgroundSource,
	playgroundTree,
	savePlaygroundRunPayload,
} from '@theoremai/playground';
import { LiveRunner } from '@theoremai/react/live';
import { TheoremChat, useDisclosureMotion } from '@theoremai/react/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ISSUE_ROW_ATTRIBUTE, ListBadges } from '../components/inspector';
import { PROFILE_TYPE_ICON, ProfileEditor, TOOL_TYPE_ICON } from '../components/profile-editor';
import { exportBundle, llmBrief } from '../lib/export-agent';
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
	wording: IconQuote,
} satisfies Record<Exclude<PlaygroundNodeRef['facet'], 'toolSpec'>, unknown>;

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
	return [
		treeItem(tree, { ...root, children: [] }),
		...all.map((facet) => {
			const node = shown.get(facet);
			return node ? treeItem(tree, node, true) : offItem(tree, facet);
		}),
	];
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
const TREE_WIDTH = 216;
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
 * The profile tree beside the editor (or code) for the draft in a panel on the left; the compiled
 * agent on the right, under Export and Run. The draft compiles as it changes; while it doesn't
 * compile, the agent stays the last one that did.
 */
export default function Playground({ loaderData }: Route.ComponentProps) {
	const [draft, setDraft] = useState<PlaygroundDraft>(loaderData.draft);
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
	const [selectedId, setSelectedId] = useState('identity');
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
	const toast = useToast();
	/** Swaps in a whole new draft from Identity; the toast can put the old one back. */
	const replaceDraft = (next: PlaygroundDraft, message: string) => {
		const previous = draft;
		setDraft(next);
		setSelectedId('identity');
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

	return (
		<Layout
			ref={layoutCallbackRef}
			padding={0}
			start={
				<>
					<LayoutPanel
						resizable={sidePanel.props}
						padding={0}
						role="navigation"
						label="Playground"
						isScrollable={false}
					>
						<Section variant="raised" height="100%" padding={0}>
							<HStack height="100%">
								<Section
									variant="transparent"
									width={TREE_WIDTH}
									height="100%"
									padding={3}
									dividers={['end']}
								>
									<VStack gap={3} height="100%">
										<VStack gap={1}>
											<Heading level={3}>Theorem Playground</Heading>
											<Text type="supporting" color="secondary">
												Configure an agent's profile, then run it to test.
											</Text>
										</VStack>
										<StackItem size="fill">
											<ScrollableArea ref={sidebarRef} label="Profile" height="100%">
												<TreeList
													density="compact"
													aria-label="Profile"
													items={treeItems({
														draft,
														selectedId: selected,
														onSelect: setSelectedId,
														setDraft,
													})}
												/>
											</ScrollableArea>
										</StackItem>
									</VStack>
								</Section>
								<StackItem size="fill">
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
															setEditorView('editor');
															setIssueReveal((count) => count + 1);
														}}
													/>
												)}
												<IconButton
													label="Load the example"
													variant="ghost"
													icon={<Icon icon={IconBook} size="sm" />}
													tooltip="Load the example"
													onClick={() => {
														replaceDraft(createExampleDraft(), 'Loaded the example.');
													}}
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
														setEditorView(editorView === 'editor' ? 'code' : 'editor');
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
								</StackItem>
							</HStack>
						</Section>
					</LayoutPanel>
					<ResizeHandle
						direction="horizontal"
						isAlwaysVisible={false}
						resizable={sidePanel.props}
						label="Resize profile"
					/>
				</>
			}
			content={
				<LayoutContent isScrollable={false} padding={0}>
					<VStack height="100%">
						<Section variant="transparent" padding={3}>
							<HStack gap={2} vAlign="center">
								<StackItem size="fill" />
								<ButtonGroup label="Export" isDisabled={!compiled.ok}>
									<Button
										label="Export"
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
									label="Run"
									variant="primary"
									icon={<Icon icon={IconPlayerPlay} size="sm" />}
									isDisabled={!compiled.ok}
									tooltip={blocked ?? 'Open the agent in a new tab'}
									onClick={() => {
										if (compiled.ok) openInNewTab(runPayload(compiled));
									}}
								/>
							</HStack>
						</Section>
						<StackItem size="fill">
							{payload ? (
								<AgentPreview payload={payload} />
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
