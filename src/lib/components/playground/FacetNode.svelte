<script lang="ts">
import { Handle, type NodeProps, Position } from '@xyflow/svelte';
import { getContext } from 'svelte';
import { PLAYGROUND_CTX, type PlaygroundCtx } from '$lib/playground/context';
import { facetTitle } from '$lib/playground/facet-ui';
import { outputRoleFromData, outputRoleLabel } from '$lib/playground/outputs';
import type { FacetKind, PlaygroundNode } from '$lib/playground/types';

let { id, data }: NodeProps<PlaygroundNode> = $props();

const playground = getContext<PlaygroundCtx>(PLAYGROUND_CTX);

const kind = $derived(data.kind as FacetKind);
const isHub = $derived(kind === 'identity');
const hasSource = $derived(isHub || kind === 'models' || kind === 'tools');
const hasTarget = $derived(!isHub);
const isActive = $derived(playground.ui.panelNodeId === id);

const title = $derived(facetTitle(data));

const toolChildren = $derived(
	kind === 'tools'
		? playground
				.getNodes()
				.filter((n) => n.data.kind === 'toolSpec')
				.map((n) => (n.data.kind === 'toolSpec' ? n.data.toolName.trim() || '…' : ''))
				.filter(Boolean)
		: [],
);

function setExpanded(opening: boolean) {
	playground.togglePanel(id, opening);
}

function toggle(e: MouseEvent) {
	e.stopPropagation();
	setExpanded(!isActive);
}

let headMoved = false;
function onHeadPointerDown() {
	headMoved = false;
}
function onHeadPointerMove(e: PointerEvent) {
	if (e.buttons) headMoved = true;
}
function onHeadClick(e: MouseEvent) {
	if (headMoved) return;
	if ((e.target as HTMLElement | null)?.closest('.facet-chevron')) return;
	toggle(e);
}
</script>

<div class="facet" class:facet-hub={isHub}>
	{#if hasTarget}
		<Handle id="in" class="facet-handle" position={Position.Top} type="target" />
	{/if}

	<div
		class="facet-head"
		aria-expanded={isActive}
		onclick={onHeadClick}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				setExpanded(!isActive);
			}
		}}
		onpointerdown={onHeadPointerDown}
		onpointermove={onHeadPointerMove}
		role="button"
		tabindex="0"
	>
		<span class="facet-title">{title}</span>
		<button
			class="facet-chevron nodrag"
			aria-expanded={isActive}
			aria-label={isActive ? 'Close panel' : 'Open panel'}
			onclick={toggle}
			type="button"
		>
			{isActive ? '−' : '+'}
		</button>
	</div>

	<button class="facet-summary nodrag" onclick={toggle} type="button">
		{#if data.kind === 'identity'}
			{data.handle || '—'}
			· {data.system.slice(0, 40)}{data.system.length > 40 ? '…' : ''}
		{:else if data.kind === 'models'}
			{data.provider}/{data.protocol}
			· maxSteps={data.maxSteps}
		{:else if data.kind === 'modelSpec'}
			{data.apiId || '—'}
			· temp={data.temperature}
			{#if data.builtInTools.trim()}
				· builtins[{data.builtInTools}]
			{/if}
		{:else if data.kind === 'tools'}
			{#if toolChildren.length}
				{toolChildren.join(', ')}
			{:else}
				[+ Tool]
			{/if}
		{:else if data.kind === 'toolSpec'}
			{data.toolType}
			· {data.loadTier}
		{:else if data.kind === 'inputs'}
			text={String(data.text)}
			{#if data.attachmentsAccept.length}
				· attach[{data.attachmentsAccept.length}]
			{/if}
			{#if data.voiceAccept.length}
				· voice[{data.voiceAccept.length}]
			{/if}
		{:else if data.kind === 'outputs'}
			{const role = outputRoleFromData(data)}
			{outputRoleLabel(role)}
			{#if role === 'structured' && data.schemaId.trim()}
				· {data.schemaId.trim()}
			{/if}
			{#if data.resumeEnabled}
				· resume
			{/if}
		{:else if data.kind === 'guardrails'}
			canary={String(data.canary)}
			· sanitize={String(data.sanitizeInput)}
			· egress={data.egressMode}
		{/if}
	</button>

	{#if hasSource}
		<Handle id="out" class="facet-handle" position={Position.Bottom} type="source" />
	{/if}
</div>

<style>
.facet {
	display: flex;
	flex-direction: column;
	width: 15rem;
	border: 1.5px solid #000;
	background: var(--color-paper);
	font-family: var(--font-mono);
	color: var(--color-ink);
}

.facet-hub {
	width: 16.5rem;
}

.facet-head {
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: center;
	gap: 0.45rem;
	flex-shrink: 0;
	padding: 0.5rem 0.65rem;
	border-bottom: 1px solid #000;
	font-size: 0.72rem;
	font-weight: 800;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	cursor: grab;
}

.facet-head:active {
	cursor: grabbing;
}

.facet-title {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	pointer-events: none;
}

.facet-chevron {
	appearance: none;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	font-size: 0.95rem;
	line-height: 1;
	padding: 0.15rem 0.35rem;
	cursor: pointer;
}

.facet-summary {
	display: block;
	width: 100%;
	margin: 0;
	padding: 0.5rem 0.65rem 0.6rem;
	border: 0;
	background: transparent;
	color: var(--color-mute);
	font: inherit;
	font-size: 0.72rem;
	line-height: 1.35;
	font-weight: 600;
	text-align: left;
	cursor: pointer;
}

.facet-summary:hover {
	color: var(--color-ink);
}

:global(.facet-handle) {
	width: 8px;
	height: 8px;
	border: 1.5px solid #000;
	background: var(--color-paper);
	border-radius: 0;
}
</style>
