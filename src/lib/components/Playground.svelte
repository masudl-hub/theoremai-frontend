<script lang="ts">
	import { onMount } from 'svelte';
	import { setContext } from 'svelte';
	import {
		Background,
		BackgroundVariant,
		Controls,
		Panel,
		SvelteFlow,
		type NodeTypes,
		type Viewport
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import FacetNode from '$lib/components/playground/FacetNode.svelte';
	import FacetPanel from '$lib/components/playground/FacetPanel.svelte';
	import { compilePlayground } from '$lib/playground/compile';
	import { PLAYGROUND_CTX, type PlaygroundCtx, type PlaygroundHub } from '$lib/playground/context';
	import { createBlankGraph, createExampleGraph } from '$lib/playground/example';
	import {
		defaultModelSpec,
		DRAG_HANDLE,
		type ModelsData,
		type PlaygroundEdge,
		type PlaygroundNode
	} from '$lib/playground/types';

	const nodeTypes: NodeTypes = {
		facet: FacetNode
	};

	const starter = createExampleGraph();
	let nodes = $state.raw<PlaygroundNode[]>(starter.nodes);
	let edges = $state.raw<PlaygroundEdge[]>(starter.edges);
	let viewport = $state.raw<Viewport>({ x: 0, y: 0, zoom: 1 });

	let running = $state(false);
	let banner = $state('');
	let canvasReady = $state(false);

	const openNode = $derived(nodes.find((n) => n.data.expanded) ?? null);

	const hub = $state<PlaygroundHub>({
		protocol: 'openAi',
		provider: 'openrouter'
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
		const id = `model-${crypto.randomUUID().slice(0, 8)}`;
		const label = `model${specs.length + 1}`;
		const y = 40 + specs.length * 170;
		nodes = [
			...nodes,
			{
				id,
				type: 'facet',
				position: { x: 760, y },
				dragHandle: DRAG_HANDLE,
				data: defaultModelSpec({
					modelId: label,
					selectLabel: label,
					expanded: true
				})
			}
		];
		edges = [
			...edges,
			{
				id: `e-models-${id}`,
				source: 'models',
				target: id,
				sourceHandle: 'out',
				targetHandle: 'in',
				type: 'smoothstep'
			}
		];
		nodes = nodes.map((n) =>
			n.id === id
				? { ...n, zIndex: Date.now(), data: { ...n.data, expanded: true } }
				: n.data.expanded
					? { ...n, zIndex: 0, data: { ...n.data, expanded: false } }
					: { ...n, zIndex: 0 }
		);
	}

	function patchNode(id: string, partial: Partial<PlaygroundNode['data']>) {
		nodes = nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...partial } } : n));
	}

	function closePanel(id: string) {
		nodes = nodes.map((n) =>
			n.id === id ? { ...n, zIndex: 0, data: { ...n.data, expanded: false } } : n
		);
	}

	setContext<PlaygroundCtx>(PLAYGROUND_CTX, {
		addModelSpec,
		hub,
		patchNode,
		closePanel,
		getNodes: () => nodes
	});

	onMount(() => {
		canvasReady = true;
	});

	function resetExample() {
		const next = createExampleGraph();
		nodes = next.nodes;
		edges = next.edges;
		banner = '';
	}

	function blankCanvas() {
		const next = createBlankGraph();
		nodes = next.nodes;
		edges = next.edges;
		banner = '';
	}

	async function runCompile() {
		if (running) return;
		running = true;
		banner = '';
		await new Promise((r) => setTimeout(r, 120));
		const result = compilePlayground(nodes);
		banner = result.ok ? 'Agent ready' : result.message;
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
		<div class="playground-shell absolute inset-0">
			<SvelteFlow
				bind:nodes
				bind:edges
				bind:viewport
				{nodeTypes}
				fitView
				fitViewOptions={{ padding: 0.12 }}
				minZoom={0.3}
				maxZoom={1.75}
				nodesDraggable
				nodesConnectable={false}
				elementsSelectable={false}
				nodesFocusable={false}
				edgesFocusable={false}
				elevateNodesOnSelect={false}
				panOnScroll={false}
				zoomOnScroll={false}
				zoomOnPinch
				preventScrolling={false}
				colorMode="light"
				proOptions={{ hideAttribution: true }}
				defaultEdgeOptions={{
					style: 'stroke: #000; stroke-width: 1.25'
				}}
				class="playground-flow"
			>
				<Background
					variant={BackgroundVariant.Lines}
					gap={56}
					lineWidth={1}
					patternColor="rgba(0,0,0,0.06)"
					bgColor="var(--color-paper)"
				/>
				<Controls showLock={false} position="bottom-left" />

				<Panel position="top-left" class="playground-chrome">
					<div class="chrome">
						<span class="chrome-title">Playground</span>
						<button type="button" class="btn btn-ghost chrome-btn" onclick={resetExample}>
							Example
						</button>
						<button type="button" class="btn btn-ghost chrome-btn" onclick={blankCanvas}>
							New
						</button>
						<button type="button" class="btn btn-ghost chrome-btn" onclick={copySource}>
							Export
						</button>
						<button
							type="button"
							class="btn btn-solid chrome-btn"
							onclick={runCompile}
							disabled={running}
						>
							{running ? '…' : 'Run'}
						</button>
						{#if banner}
							<span class="chrome-banner" class:chrome-ok={banner === 'Agent ready'}>{banner}</span>
						{/if}
					</div>
				</Panel>
			</SvelteFlow>

			{#if openNode}
				{#key openNode.id}
					<FacetPanel node={openNode} />
				{/key}
			{/if}
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
		position: relative;
		width: 100%;
		height: 100%;
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
		--xy-connectionline-stroke: #000;
		background: var(--color-paper);
	}

	.playground-shell :global(.svelte-flow__attribution) {
		display: none !important;
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
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}

	.chrome-btn {
		padding: 0.35rem 0.55rem;
		font-size: 0.62rem;
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
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--color-mute);
	}

	.chrome-ok {
		color: #000;
		font-weight: 800;
	}
</style>
