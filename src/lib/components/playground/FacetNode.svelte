<script lang="ts">
import { Handle, type NodeProps, Position } from '@xyflow/svelte';
import { getContext } from 'svelte';
import { PLAYGROUND_CTX, type PlaygroundCtx } from '$lib/playground/context';
import { facetChips, facetTitle } from '$lib/playground/facet-ui';
import type { FacetKind, PlaygroundNode } from '$lib/playground/types';

let { id, data }: NodeProps<PlaygroundNode> = $props();

const playground = getContext<PlaygroundCtx>(PLAYGROUND_CTX);

const kind = $derived(data.kind as FacetKind);
const isHub = $derived(kind === 'identity');
const isBranchHub = $derived(kind === 'models' || kind === 'tools');
const isBranchLeaf = $derived(kind === 'modelSpec' || kind === 'toolSpec');
const hasSpineTarget = $derived(!isHub && !isBranchLeaf);
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

const chips = $derived(facetChips(data, toolChildren));

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

<div class="facet" class:facet-hub={isHub} class:facet-active={isActive}>
	{#if hasSpineTarget}
		<Handle
			id="in"
			class="facet-handle facet-handle--spine"
			position={Position.Top}
			type="target"
		/>
	{/if}
	{#if isBranchLeaf}
		<Handle
			id="in-left"
			class="facet-handle facet-handle--branch"
			position={Position.Left}
			type="target"
		/>
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

	<button class="facet-body nodrag" onclick={toggle} type="button">
		<div class="facet-chips">
			{#each chips as chip, idx (chip + String(idx))}
				<span class="facet-chip">{chip}</span>
			{/each}
		</div>
	</button>

	{#if isHub || isBranchHub}
		{#if isHub}
			<Handle
				id="out"
				class="facet-handle facet-handle--spine"
				position={Position.Bottom}
				type="source"
			/>
		{/if}
		{#if isBranchHub}
			<Handle
				id="branch"
				class="facet-handle facet-handle--branch"
				position={Position.Right}
				type="source"
			/>
		{/if}
	{/if}
</div>
