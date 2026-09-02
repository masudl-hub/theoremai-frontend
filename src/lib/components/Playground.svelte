<script lang="ts">
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
import '@xyflow/svelte/dist/style.css';

import FacetNode from '$lib/components/playground/FacetNode.svelte';
import FacetPanel from '$lib/components/playground/FacetPanel.svelte';
import PlaygroundFlowFit from '$lib/components/playground/PlaygroundFlowFit.svelte';
import { compilePlayground } from '$lib/playground/compile';
import { PLAYGROUND_CTX, type PlaygroundCtx, type PlaygroundHub } from '$lib/playground/context';
import { createBlankGraph, createExampleGraph } from '$lib/playground/example';
import { PLAYGROUND_ORIGIN, PLAYGROUND_ROW_PX } from '$lib/playground/layout';
import {
	DRAG_HANDLE,
	defaultModelSpec,
	type FacetData,
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
let viewport = $state.raw<Viewport>({ x: 0, y: 0, zoom: 1 });

let running = $state(false);
let banner = $state('');
let canvasReady = $state(false);
let graphKey = $state(0);
const ui = $state({ panelNodeId: null as string | null });

const panelOpen = $derived(ui.panelNodeId !== null);
const openNode = $derived(
	ui.panelNodeId ? (nodes.find((n) => n.id === ui.panelNodeId) ?? null) : null,
);

const hub = $state<PlaygroundHub>({
	protocol: 'openAi',
	provider: 'openrouter',
});

$effect(() => {
	const m = nodes.find((n) => n.data.kind === 'models')?.data as ModelsData | undefined;
	if (!m) return;
	if (hub.protocol !== m.protocol || hub.provider !== m.provider) {
		hub.protocol = m.protocol;
		hub.provider = m.provider;
	}
});

function addModelSpec() {
	const specs = nodes.filter((n) => n.data.kind === 'modelSpec');
	const modelsNode = nodes.find((n) => n.data.kind === 'models');
	const id = `model-${crypto.randomUUID().slice(0, 8)}`;
	const label = `model${specs.length + 1}`;
	const baseX = modelsNode?.position.x ?? PLAYGROUND_ORIGIN.x;
	const baseY = modelsNode?.position.y ?? PLAYGROUND_ORIGIN.y + PLAYGROUND_ROW_PX;
	const lastSpecY =
		specs.length > 0 ? Math.max(...specs.map((s) => s.position.y)) : baseY + PLAYGROUND_ROW_PX;
	const y = specs.length === 0 ? baseY + PLAYGROUND_ROW_PX : lastSpecY + PLAYGROUND_ROW_PX - 40;
	nodes = [
		...nodes,
		{
			id,
			type: 'facet',
			position: { x: baseX, y },
			dragHandle: DRAG_HANDLE,
			data: defaultModelSpec({
				modelId: label,
				selectLabel: label,
				expanded: true,
			}),
		},
	];
	edges = [
		...edges,
		{
			id: `e-models-${id}`,
			source: 'models',
			target: id,
			sourceHandle: 'out',
			targetHandle: 'in',
			type: 'smoothstep',
		},
	];
	nodes = nodes.map((n) =>
		n.id === id
			? { ...n, zIndex: Date.now(), data: { ...n.data, expanded: true } }
			: n.data.expanded
				? { ...n, zIndex: 0, data: { ...n.data, expanded: false } }
				: { ...n, zIndex: 0 },
	);
	openPanel(id);
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

function patchNode(id: string, partial: Partial<PlaygroundNode['data']>) {
	nodes = nodes.map((n) =>
		n.id === id ? { ...n, data: { ...n.data, ...partial } as FacetData } : n,
	);
}

setContext<PlaygroundCtx>(PLAYGROUND_CTX, {
	addModelSpec,
	hub,
	ui,
	patchNode,
	togglePanel,
	closePanel,
	getNodes: () => nodes,
});

onMount(() => {
	canvasReady = true;
});

function resetExample() {
	const next = createExampleGraph();
	nodes = next.nodes;
	edges = next.edges;
	banner = '';
	ui.panelNodeId = null;
	graphKey += 1;
}

function blankCanvas() {
	const next = createBlankGraph();
	nodes = next.nodes;
	edges = next.edges;
	banner = '';
	ui.panelNodeId = null;
	graphKey += 1;
}

async function runCompile() {
	if (running) return;
	running = true;
	banner = '';
	await new Promise((r) => setTimeout(r, 120));
	const result = compilePlayground(nodes);
	banner = result.ok ? 'Agent ready · live turn at /playground' : result.message;
	running = false;
}

async function copySource() {
	const result = compilePlayground(nodes);
	if (!result.ok) {
		banner = result.message;
		return;
	}
	await navigator.clipboard.writeText(result.source);
	banner = 'Copied defineProfile';
}
</script>

<section
	id="playground"
	class="landing-section playground-section relative h-dvh w-full overflow-hidden border-b-[3px] border-black p-0"
>
	{#if canvasReady}
		<div class="playground-shell" class:playground-shell--panel-open={panelOpen}>
			<div class="playground-workspace">
				<div class="playground-flow-pane">
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
						<PlaygroundFlowFit {graphKey} {panelOpen} />
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
								<span class="chrome-title">Playground</span>
								<button class="btn btn-ghost chrome-btn" onclick={resetExample} type="button">
									Example
								</button>
								<button class="btn btn-ghost chrome-btn" onclick={blankCanvas} type="button">
									New
								</button>
								<button class="btn btn-ghost chrome-btn" onclick={copySource} type="button">
									Export
								</button>
								<button
									class="btn btn-solid chrome-btn"
									disabled={running}
									onclick={runCompile}
									type="button"
								>
									{running ? '…' : 'Run'}
								</button>
								{#if banner}
									<span
										class="chrome-banner"
										class:chrome-ok={banner.startsWith('Agent ready')}
										>{banner}</span
									>
								{/if}
							</div>
						</Panel>
					</SvelteFlow>
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
		<div
			class="flex h-full items-center justify-center text-xs font-bold tracking-widest uppercase text-[var(--color-mute)]"
		>
			Loading canvas…
		</div>
	{/if}
</section>

<style>
.playground-shell {
	position: absolute;
	inset: 0;
	height: 100%;
	width: 100%;
}

.playground-workspace {
	display: flex;
	flex-direction: row;
	align-items: stretch;
	height: 100%;
	width: 100%;
}

.playground-flow-pane,
.playground-panel-pane {
	height: 100%;
	min-width: 0;
	flex-shrink: 0;
	overflow: hidden;
	transition: width 320ms cubic-bezier(0.33, 1, 0.68, 1);
}

.playground-flow-pane {
	width: 100%;
}

.playground-panel-pane {
	width: 0;
}

.playground-shell--panel-open .playground-flow-pane {
	width: 66.666%;
}

.playground-shell--panel-open .playground-panel-pane {
	width: 33.333%;
}

.playground-panel-pane {
	box-sizing: border-box;
	padding: 0.75rem;
	overflow: hidden;
}

.playground-shell :global(.playground-flow) {
	width: 100%;
	height: 100%;
}

.playground-shell :global(.playground-flow) {
	--xy-node-border-radius: 0;
	--xy-node-boxshadow-default: none;
	--xy-node-boxshadow-selected: none;
	--xy-edge-stroke: #000;
	--xy-edge-stroke-width: 1.25;
	--xy-connectionline-stroke: #000;
	background: var(--color-paper);
}

.playground-shell :global(.svelte-flow__attribution) {
	display: none;
}

.playground-shell :global(.svelte-flow__node) {
	padding: 0;
	border: none;
	background: transparent;
	box-shadow: none;
	outline: none;
}

.playground-shell :global(.svelte-flow__node:focus),
.playground-shell :global(.svelte-flow__node:focus-visible),
.playground-shell :global(.svelte-flow__node.selected) {
	outline: none;
	box-shadow: none;
}

.playground-shell :global(.svelte-flow__controls) {
	border: 2px solid #000;
	border-radius: 0;
	box-shadow: none;
	overflow: hidden;
	margin: 0.75rem;
}

.playground-shell :global(.svelte-flow__controls-button) {
	border-bottom: 1px solid #000;
	background: transparent;
	width: 1.6rem;
	height: 1.6rem;
}

.playground-shell :global(.svelte-flow__controls-button:hover) {
	background: rgba(0, 0, 0, 0.06);
	color: #000;
}

.playground-shell :global(.playground-chrome) {
	margin: 0.75rem;
}

.chrome {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.35rem 0.5rem;
	font-family: var(--font-mono);
}

.chrome-title {
	margin-right: 0.35rem;
	font-size: 0.75rem;
	font-weight: 800;
	letter-spacing: 0.18em;
	text-transform: uppercase;
}

.chrome-btn {
	padding: 0.35rem 0.6rem;
	font-size: 0.72rem;
}

.chrome-btn.btn-solid {
	background: transparent;
	color: #000;
}

.chrome-btn.btn-solid:hover {
	background: rgba(0, 0, 0, 0.06);
}

.chrome-banner {
	margin-left: 0.35rem;
	font-size: 0.72rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	color: var(--color-mute);
}

.chrome-ok {
	color: #000;
	font-weight: 800;
}
</style>
