<script lang="ts">
import {
	IconBook2,
	IconCopy,
	IconFilePlus,
	IconLoader2,
	IconPlayerPlay,
} from '@tabler/icons-svelte';
import {
	Background,
	BackgroundVariant,
	Controls,
	type NodeTypes,
	Panel,
	SvelteFlow,
	type Viewport,
} from '@xyflow/svelte';
import { onMount, setContext } from 'svelte';
import { resolve } from '$app/paths';
import '@xyflow/svelte/dist/style.css';
import '$lib/components/playground/playground-graph.css';

import { createPlaygroundRunId, savePlaygroundRunPayload } from '@theoremai/react/client';
import AsciiCardSegments from '$lib/ascii/AsciiCardSegments.svelte';
import { parseAsciiCardSegments, renderAsciiCard } from '$lib/ascii/tip-card';
import AsciiHover from '$lib/components/AsciiHover.svelte';
import FacetNode from '$lib/components/playground/FacetNode.svelte';
import FacetPanel from '$lib/components/playground/FacetPanel.svelte';
import PlaygroundFlowFit from '$lib/components/playground/PlaygroundFlowFit.svelte';
import { compilePlayground } from '$lib/playground/compile';
import { PLAYGROUND_CTX, type PlaygroundCtx, type PlaygroundHub } from '$lib/playground/context';
import { createBlankGraph, createExampleGraph, syncGraphForProfile } from '$lib/playground/example';
import { appendChildSpecNode } from '$lib/playground/graph-mutations';
import {
	PLAYGROUND_COL_PX,
	PLAYGROUND_ORIGIN,
	playgroundViewportForAnchor,
} from '$lib/playground/layout';
import {
	type CompileIssue,
	defaultModelBinding,
	defaultToolSpec,
	FACET_LABEL,
	type FacetData,
	type IdentityData,
	type ModelBindingData,
	type ModelsData,
	type PlaygroundEdge,
	type PlaygroundNode,
} from '$lib/playground/types';

const nodeTypes: NodeTypes = {
	facet: FacetNode,
};

const starter = createExampleGraph();
let nodes = $state<PlaygroundNode[]>(starter.nodes);
let edges = $state<PlaygroundEdge[]>(starter.edges);
let viewport = $state.raw<Viewport>(playgroundViewportForAnchor());

let running = $state(false);
let banner = $state('');
let compileIssues = $state<CompileIssue[]>([]);
let compileLogOpen = $state(false);
let canvasReady = $state(false);
let graphKey = $state(0);
const ui = $state<{ panelNodeId: string | null }>({ panelNodeId: 'identity' });

const panelOpen = $derived(ui.panelNodeId !== null);
const openNode = $derived(
	ui.panelNodeId ? (nodes.find((n) => n.id === ui.panelNodeId) ?? null) : null,
);

const hub = $state<PlaygroundHub>({
	protocol: 'openAi',
	provider: 'openrouter',
});

$effect(() => {
	const modelsData = nodes.find((n) => n.data.kind === 'models')?.data as ModelsData | undefined;
	const specs = nodes.filter(
		(n): n is PlaygroundNode & { data: ModelBindingData } => n.data.kind === 'modelBinding',
	);
	const defaultId = modelsData?.defaultModel?.trim();
	const primary = specs.find((s) => s.data.modelId.trim() === defaultId) ?? specs[0];
	if (primary?.data.kind !== 'modelBinding') return;
	if (hub.protocol !== primary.data.protocol || hub.provider !== primary.data.provider) {
		hub.protocol = primary.data.protocol;
		hub.provider = primary.data.provider;
	}
});

function setBranchCollapsed(hubId: 'models' | 'tools', collapsed: boolean) {
	const childKind = hubId === 'models' ? 'modelBinding' : 'toolSpec';
	nodes = nodes.map((n) => {
		if (n.id === hubId && (n.data.kind === 'models' || n.data.kind === 'tools')) {
			return {
				...n,
				data: { ...n.data, branchCollapsed: collapsed } as FacetData,
			};
		}
		if (n.data.kind === childKind) {
			return { ...n, hidden: collapsed };
		}
		return n;
	});
	edges = edges.map((e) =>
		e.source === hubId && e.sourceHandle === 'branch' ? { ...e, hidden: collapsed } : e,
	);
}

function ensureBranchExpanded(hubKind: 'models' | 'tools') {
	const hub = nodes.find((n) => n.data.kind === hubKind);
	if (
		hub &&
		(hub.data.kind === 'models' || hub.data.kind === 'tools') &&
		hub.data.branchCollapsed
	) {
		setBranchCollapsed(hubKind, false);
	}
}

function addModelBinding() {
	ensureBranchExpanded('models');
	const specs = nodes.filter((n) => n.data.kind === 'modelBinding');
	const modelsNode = nodes.find((n) => n.data.kind === 'models');
	const label = `model${specs.length + 1}`;
	const hubPosition = {
		x: modelsNode?.position.x ?? PLAYGROUND_ORIGIN.x,
		y: modelsNode?.position.y ?? PLAYGROUND_ORIGIN.y,
	};
	const appended = appendChildSpecNode(nodes, edges, {
		parentId: 'models',
		idPrefix: 'model',
		hubPosition,
		specs,
		data: defaultModelBinding({
			modelId: label,
			expanded: true,
		}),
	});
	nodes = appended.nodes;
	edges = appended.edges;
	openPanel(appended.id);
}

function addToolSpec() {
	ensureBranchExpanded('tools');
	const specs = nodes.filter((n) => n.data.kind === 'toolSpec');
	const toolsNode = nodes.find((n) => n.data.kind === 'tools');
	const label = `tool_${specs.length + 1}`;
	const hubPosition = {
		x: toolsNode?.position.x ?? PLAYGROUND_ORIGIN.x + PLAYGROUND_COL_PX,
		y: toolsNode?.position.y ?? PLAYGROUND_ORIGIN.y,
	};
	const appended = appendChildSpecNode(nodes, edges, {
		parentId: 'tools',
		idPrefix: 'tool',
		hubPosition,
		specs,
		data: defaultToolSpec({
			toolName: label,
			expanded: true,
		}),
	});
	nodes = appended.nodes;
	edges = appended.edges;
	openPanel(appended.id);
}

function addBranchSpec(hubId: string) {
	const hub = nodes.find((n) => n.id === hubId);
	if (!hub) return;
	if (hub.data.kind === 'models') addModelBinding();
	else if (hub.data.kind === 'tools') addToolSpec();
}

function syncExpanded(activeId: string | null) {
	nodes = nodes.map((n) => ({
		...n,
		zIndex: activeId !== null && n.id === activeId ? 1 : 0,
		data: {
			...n.data,
			expanded: activeId !== null && n.id === activeId,
		} as FacetData,
	}));
}

function openPanel(id: string) {
	ui.panelNodeId = id;
	syncExpanded(id);
}

function closePanel(id: string) {
	if (ui.panelNodeId !== id) return;
	ui.panelNodeId = null;
	syncExpanded(null);
}

function togglePanel(id: string, open: boolean) {
	if (open) openPanel(id);
	else closePanel(id);
}

function toggleBranchCollapsed(id: string) {
	const node = nodes.find((n) => n.id === id);
	if (!node || (node.data.kind !== 'models' && node.data.kind !== 'tools')) return;
	setBranchCollapsed(node.data.kind, !node.data.branchCollapsed);
}

function patchNode(id: string, partial: Partial<PlaygroundNode['data']>) {
	const prevNode = nodes.find((n) => n.id === id);
	nodes = nodes.map((n) =>
		n.id === id ? { ...n, data: { ...n.data, ...partial } as FacetData } : n,
	);
	if (id === 'identity') {
		const updatedIdentity = nodes.find((n) => n.id === 'identity')?.data as
			| IdentityData
			| undefined;
		if (updatedIdentity) {
			const prevIdentity = prevNode?.data as IdentityData | undefined;
			const typeChanged = prevIdentity?.profileType !== updatedIdentity.profileType;
			const prevFacets = prevIdentity?.includedOptionalFacets ?? [];
			const nextFacets = updatedIdentity.includedOptionalFacets;
			const facetsChanged =
				prevFacets.length !== nextFacets.length || prevFacets.some((f, i) => f !== nextFacets[i]);

			if (typeChanged || facetsChanged) {
				const synced = syncGraphForProfile(nodes, edges, updatedIdentity, {
					preservePositions: false,
				});
				nodes = synced.nodes;
				edges = synced.edges;
				syncExpanded(ui.panelNodeId);
				graphKey += 1;
			}
		}
	}
}

setContext<PlaygroundCtx>(PLAYGROUND_CTX, {
	addModelBinding,
	addToolSpec,
	addBranchSpec,
	hub,
	ui,
	patchNode,
	togglePanel,
	closePanel,
	toggleBranchCollapsed,
	getNodes: () => nodes,
});

onMount(() => {
	canvasReady = true;
});

function clearBanner() {
	banner = '';
	compileIssues = [];
	compileLogOpen = false;
}

function setCompileFailure(message: string, issues: CompileIssue[]) {
	banner = message;
	compileIssues = issues;
	compileLogOpen = false;
}

function resetExample() {
	const next = createExampleGraph();
	nodes = next.nodes;
	edges = next.edges;
	clearBanner();
	openPanel('identity');
	graphKey += 1;
}

function blankCanvas() {
	const next = createBlankGraph();
	nodes = next.nodes;
	edges = next.edges;
	clearBanner();
	openPanel('identity');
	graphKey += 1;
}

async function runCompile() {
	if (running) return;
	running = true;
	clearBanner();
	await new Promise((r) => setTimeout(r, 120));
	const result = compilePlayground(nodes);
	if (!result.ok) {
		setCompileFailure(result.message, result.issues);
		running = false;
		return;
	}
	const runId = createPlaygroundRunId();
	savePlaygroundRunPayload(
		{
			agentId: result.agentId,
			profile: result.profile,
			customTools: result.customTools,
			structured: result.structured,
		},
		runId,
	);
	running = false;
	window.open(
		`${resolve('/playground/run/', {})}?run=${encodeURIComponent(runId)}`,
		'_blank',
		'noopener,noreferrer',
	);
}

async function copySource() {
	const result = compilePlayground(nodes);
	if (!result.ok) {
		setCompileFailure(result.message, result.issues);
		return;
	}
	await navigator.clipboard.writeText(result.source);
	banner = 'Copied defineProfile';
	compileIssues = [];
	compileLogOpen = false;
}

function toggleCompileLog() {
	compileLogOpen = !compileLogOpen;
}

const compileLogSegments = $derived.by(() => {
	if (!compileIssues.length) return [];
	const art = renderAsciiCard({
		title: 'COMPILE',
		body: 'Fix the issues below, then run again.',
		specs: compileIssues.map((issue) => ({
			label: FACET_LABEL[issue.facet],
			value: issue.message,
		})),
		inner: 48,
		actions: [{ id: 'close', label: 'close' }],
	});
	return parseAsciiCardSegments(art);
});

function onCompileLogAction(id: string) {
	if (id === 'close') {
		compileLogOpen = false;
		return;
	}
	openPanel(id);
	compileLogOpen = false;
}

const CHROME_TIPS: Record<string, { title: string; body: string }> = {
	example: {
		title: 'EXAMPLE',
		body: 'Travel concierge demo — inputs, HTTP, MCP, function tools, and T2 discovery.',
	},
	new: {
		title: 'NEW',
		body: 'Blank canvas — identity hub only.',
	},
	copy: {
		title: 'COPY',
		body: 'Copy defineProfile source to the clipboard.',
	},
	run: {
		title: 'RUN',
		body: 'Compile the graph and open the run shell.',
	},
};

const FLOW_TIPS: Record<string, { title: string; body: string }> = {
	'svelte-flow__controls-zoomin': {
		title: 'ZOOM IN',
		body: 'Magnify the canvas.',
	},
	'svelte-flow__controls-zoomout': {
		title: 'ZOOM OUT',
		body: 'Shrink the canvas view.',
	},
	'svelte-flow__controls-fitview': {
		title: 'FIT',
		body: 'Center and fit all nodes in view.',
	},
};

function renderTip(tip: { title: string; body: string }): string {
	return renderAsciiCard({ title: tip.title, body: tip.body, inner: 40 });
}

function playgroundTip(el: HTMLElement): string | null {
	const chromeKey = el.getAttribute('data-chrome-tip');
	if (chromeKey) {
		const tip = CHROME_TIPS[chromeKey];
		if (tip) return renderTip(tip);
	}
	for (const cls of Object.keys(FLOW_TIPS)) {
		if (el.classList.contains(cls)) {
			const tip = FLOW_TIPS[cls];
			if (tip) return renderTip(tip);
		}
	}
	return null;
}
</script>

<section
	id="playground"
	class="landing-section playground-section relative h-dvh w-full overflow-hidden p-0"
>
	{#if canvasReady}
		<div class="playground-shell" class:playground-shell--panel-open={panelOpen}>
			<div class="playground-workspace">
				<div class="playground-flow-pane">
					<AsciiHover
						class="playground-flow-hover"
						onResolveTip={playgroundTip}
						selector="[data-chrome-tip], .svelte-flow__controls-button"
					>
						<SvelteFlow
							class="playground-flow"
							colorMode="light"
							edgesFocusable={false}
							elementsSelectable={false}
							elevateNodesOnSelect={false}
							maxZoom={1.75}
							minZoom={0.5}
							{nodeTypes}
							nodesDraggable
							bind:nodes
							bind:edges
							bind:viewport
							nodesConnectable={false}
							nodesFocusable={false}
							panOnScroll={false}
							zoomOnScroll={false}
							zoomOnPinch
							preventScrolling={false}
							proOptions={{ hideAttribution: true }}
						>
							<PlaygroundFlowFit {graphKey} />
							<Background
								bgColor="var(--color-paper)"
								gap={56}
								lineWidth={1}
								patternColor="rgba(0,0,0,0.06)"
								variant={BackgroundVariant.Lines}
							/>
							<Controls position="bottom-left" showLock={false} />

							<Panel class="playground-chrome" position="top-left">
								<div class="chrome">
									<span class="chrome-title">Theorem Builder</span>
									<button
										class="chrome-icon-btn"
										data-chrome-tip="example"
										aria-label="Load example"
										onclick={resetExample}
										type="button"
									>
										<IconBook2 size={18} stroke={1.75} aria-hidden="true" />
									</button>
									<button
										class="chrome-icon-btn"
										data-chrome-tip="new"
										aria-label="New canvas"
										onclick={blankCanvas}
										type="button"
									>
										<IconFilePlus size={18} stroke={1.75} aria-hidden="true" />
									</button>
									<button
										class="chrome-icon-btn"
										data-chrome-tip="copy"
										aria-label="Copy source"
										onclick={copySource}
										type="button"
									>
										<IconCopy size={18} stroke={1.75} aria-hidden="true" />
									</button>
									<button
										class="chrome-icon-btn"
										data-chrome-tip="run"
										aria-label="Run compile"
										disabled={running}
										onclick={runCompile}
										type="button"
									>
										{#if running}
											<span class="chrome-icon-spin" aria-hidden="true">
												<IconLoader2 size={18} stroke={1.75} />
											</span>
										{:else}
											<IconPlayerPlay size={18} stroke={1.75} aria-hidden="true" />
										{/if}
									</button>
									{#if banner}
										{#if compileIssues.length}
											<div class="chrome-banner-wrap">
												<button
													type="button"
													class="chrome-banner"
													aria-expanded={compileLogOpen}
													aria-controls="playground-compile-log"
													onclick={toggleCompileLog}
												>
													{banner}
												</button>
												{#if compileLogOpen}
													<pre
														id="playground-compile-log"
														class="ascii ascii-card-surface chrome-compile-card text-xs font-bold"
													><AsciiCardSegments
															segments={compileLogSegments}
															onAction={onCompileLogAction}
														/></pre>
												{/if}
											</div>
										{:else}
											<span class="chrome-banner" class:chrome-ok={banner.startsWith('Agent ready')}
												>{banner}</span
											>
										{/if}
									{/if}
								</div>
							</Panel>
						</SvelteFlow>
					</AsciiHover>
				</div>

				<aside class="playground-panel-pane" aria-hidden={!panelOpen}>
					{#if openNode}
						{#key openNode.id}
							<FacetPanel node={openNode} />
						{/key}
					{/if}
				</aside>
			</div>
		</div>
	{:else}
		<div class="playground-loading">Loading canvas…</div>
	{/if}
</section>

<style>
.playground-shell {
	position: absolute;
	inset: 0;
	height: 100%;
	width: 100%;
	background: transparent;
}

.playground-workspace {
	position: relative;
	height: 100%;
	width: 100%;
}

.playground-flow-pane {
	position: absolute;
	inset: 0;
	height: 100%;
	width: 100%;
	min-width: 0;
	overflow: hidden;
	background: var(--color-paper);
}

.playground-flow-pane :global(.playground-flow-hover) {
	display: block;
	height: 100%;
	width: 100%;
}

.playground-panel-pane {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 5;
	box-sizing: border-box;
	width: 0;
	padding: var(--pg-space-3);
	overflow: hidden;
	background: transparent;
	pointer-events: none;
	transition: width 320ms cubic-bezier(0.33, 1, 0.68, 1);
}

.playground-shell--panel-open .playground-panel-pane {
	width: calc(100% * var(--pg-panel-width-ratio, 0.333333));
	pointer-events: auto;
}
</style>
