import { Button } from '@astryxdesign/core/Button';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutPanel } from '@astryxdesign/core/Layout';
import { List, ListItem } from '@astryxdesign/core/List';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { Section } from '@astryxdesign/core/Section';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Toolbar } from '@astryxdesign/core/Toolbar';
import { TreeList, type TreeListItemData } from '@astryxdesign/core/TreeList';
import { VStack } from '@astryxdesign/core/VStack';
import {
	IconActivity,
	IconAdjustmentsHorizontal,
	IconAlertTriangle,
	IconBinaryTree,
	IconBook,
	IconBrain,
	IconCode,
	IconDownload,
	IconFileExport,
	IconFileImport,
	IconGitBranch,
	IconId,
	IconMathFunction,
	IconMicrophone,
	IconPhoto,
	IconPlayerPlay,
	IconRepeat,
	IconShieldCheck,
	IconStack2,
	IconTool,
	IconVolume,
	IconWorld,
} from '@tabler/icons-react';
import type { CustomToolType } from '@theoremai/agents';
import {
	type CompiledPlayground,
	compilePlayground,
	createBlankDraft,
	createExampleDraft,
	createPlaygroundRunId,
	type PlaygroundDraft,
	type PlaygroundNodeRef,
	type PlaygroundTreeNode,
	playgroundNodeRef,
	playgroundSource,
	playgroundTree,
	savePlaygroundRunPayload,
} from '@theoremai/playground';
import { useCallback, useMemo, useState } from 'react';
import { IconMcp } from '../components/mcp-icon';
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

const TOOL_TYPE_ICON = {
	function: IconMathFunction,
	http: IconWorld,
	mcp: IconMcp,
} satisfies Record<CustomToolType, unknown>;

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

function nodeIcon(draft: PlaygroundDraft, ref: PlaygroundNodeRef) {
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

/** Hands the compiled agent to a new tab through this browser's storage; the run route reads it back. */
function run(compiled: CompiledPlayground) {
	const runId = createPlaygroundRunId();
	const { agentId, profile, customTools, structured } = compiled;
	savePlaygroundRunPayload({ agentId, profile, customTools, structured }, runId);
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

/**
 * CodeBlock scrolls its code area through `maxHeight`, and a percentage there resolves against
 * the block's own auto height, so the space under the toolbar is measured and passed in pixels,
 * less the block's header. The code area is the block's `role="group"` scroll container.
 */
const measureHeight = (node: HTMLElement) => node.getBoundingClientRect().height;
const measureCodeChrome = (node: HTMLElement) =>
	node.getBoundingClientRect().height -
	(node.querySelector('[role="group"]')?.getBoundingClientRect().height ?? 0);

/** The profile tree on the left; the editor or code for the draft beside it. */
export default function Playground({ loaderData }: Route.ComponentProps) {
	const [draft, setDraft] = useState<PlaygroundDraft>(loaderData.draft);
	const [panel, setPanel] = useState('profile');
	const [editorView, setEditorView] = useState('editor');
	const [selectedId, setSelectedId] = useState('identity');
	const [bodyRef, bodyHeight] = useMeasure(measureHeight);
	const [codeRef, codeChrome] = useMeasure(measureCodeChrome);
	const codeHeight = bodyHeight === undefined ? undefined : bodyHeight - (codeChrome ?? 0);
	const selected = playgroundNodeRef(draft, selectedId) ? selectedId : 'identity';
	const compiled = useMemo(() => compilePlayground(draft), [draft]);
	const source = useMemo(() => (compiled.ok ? playgroundSource(compiled) : null), [compiled]);
	const blocked = compiled.ok
		? undefined
		: `Fix ${compiled.issues.length === 1 ? '1 issue' : `${String(compiled.issues.length)} issues`} first`;

	function load(create: () => PlaygroundDraft) {
		setDraft(create());
		setSelectedId('identity');
		setPanel('profile');
	}

	return (
		<Layout
			padding={0}
			start={
				<LayoutPanel
					width={296}
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
									icon={<Icon icon={IconBinaryTree} size="sm" />}
								/>
								<SegmentedControlItem
									value="examples"
									label="Examples"
									icon={<Icon icon={IconBook} size="sm" />}
								/>
							</SegmentedControl>
							<StackItem size="fill">
								<ScrollableArea label={panel === 'profile' ? 'Profile' : 'Examples'} height="100%">
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
			}
			content={
				<LayoutContent isScrollable={false}>
					<VStack gap={4} height="100%">
						<Toolbar
							label="Playground actions"
							dividers={['bottom']}
							startContent={
								<SegmentedControl label="View" value={editorView} onChange={setEditorView}>
									<SegmentedControlItem
										value="editor"
										label="Editor"
										icon={<Icon icon={IconAdjustmentsHorizontal} size="sm" />}
									/>
									<SegmentedControlItem
										value="code"
										label="Code"
										icon={<Icon icon={IconCode} size="sm" />}
									/>
								</SegmentedControl>
							}
							endContent={
								<>
									<Button
										label="Export"
										variant="secondary"
										icon={<Icon icon={IconDownload} size="sm" />}
										isDisabled={!compiled.ok}
										tooltip={blocked ?? 'Download the TypeScript'}
										onClick={() => {
											if (compiled.ok && source) download(compiled.agentId, source);
										}}
									/>
									<Button
										label="Run"
										variant="primary"
										icon={<Icon icon={IconPlayerPlay} size="sm" />}
										isDisabled={!compiled.ok}
										tooltip={blocked ?? 'Open the agent in a new tab'}
										onClick={() => {
											if (compiled.ok) run(compiled);
										}}
									/>
								</>
							}
						/>
						<StackItem size="fill" ref={bodyRef}>
							{editorView === 'editor' ? (
								<Text type="label">{selected}</Text>
							) : source && compiled.ok ? (
								<CodeBlock
									code={source}
									language="typescript"
									ref={codeRef}
									title={`${compiled.agentId}.ts`}
									hasLineNumbers
									isWrapped
									width="100%"
									maxHeight={codeHeight}
								/>
							) : (
								<EmptyState
									icon={<Icon icon={IconAlertTriangle} />}
									title="No code yet"
									description={`${blocked ?? ''} to generate the TypeScript.`}
								/>
							)}
						</StackItem>
					</VStack>
				</LayoutContent>
			}
		/>
	);
}
