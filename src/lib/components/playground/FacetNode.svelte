<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';
	import { getContext } from 'svelte';
	import { facetTitle } from '$lib/playground/facet-ui';
	import { PLAYGROUND_CTX, type PlaygroundCtx } from '$lib/playground/context';
	import {
		type FacetKind,
		type PlaygroundNode
	} from '$lib/playground/types';

	let { id, data }: NodeProps<PlaygroundNode> = $props();

	const playground = getContext<PlaygroundCtx>(PLAYGROUND_CTX);

	const kind = $derived(data.kind as FacetKind);
	const isHub = $derived(kind === 'identity');
	const hasSource = $derived(isHub || kind === 'models');
	const hasTarget = $derived(!isHub);
	const isActive = $derived(playground?.ui.panelNodeId === id);

	const title = $derived(facetTitle(data));

	function setExpanded(opening: boolean) {
		playground?.togglePanel(id, opening);
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
		<Handle id="in" type="target" position={Position.Top} class="facet-handle" />
	{/if}

	<div
		class="facet-head"
		role="button"
		tabindex="0"
		aria-expanded={isActive}
		onpointerdown={onHeadPointerDown}
		onpointermove={onHeadPointerMove}
		onclick={onHeadClick}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				setExpanded(!isActive);
			}
		}}
	>
		<span class="facet-title">{title}</span>
		<button
			type="button"
			class="facet-chevron nodrag"
			onclick={toggle}
			aria-expanded={isActive}
			aria-label={isActive ? 'Close panel' : 'Open panel'}
		>
			{isActive ? '−' : '+'}
		</button>
	</div>

	<button type="button" class="facet-summary nodrag" onclick={toggle}>
		{#if data.kind === 'identity'}
			{data.handle || '—'} · {data.system.slice(0, 40)}{data.system.length > 40 ? '…' : ''}
		{:else if data.kind === 'models'}
			{data.provider}/{data.protocol} · maxSteps={data.maxSteps}
		{:else if data.kind === 'modelSpec'}
			{data.apiId || '—'} · temp={data.temperature}
		{:else if data.kind === 'tools'}
			allow [{data.allow || '—'}]
		{:else if data.kind === 'inputs'}
			text={String(data.text)}{#if data.attachmentsAccept.length}
				· attach[{data.attachmentsAccept.length}]{/if}{#if data.voiceAccept.length}
				· voice[{data.voiceAccept.length}]{/if}
		{:else if data.kind === 'outputs'}
			structured={data.mode === 'structured' ? data.schemaId || '…' : 'null'}
			{#if data.imageEnabled}· image{/if}{#if data.speechEnabled}· speech{/if}{#if data.resumeEnabled}
				· resume{/if}
		{:else if data.kind === 'guardrails'}
			canary={String(data.canary)} · sanitize={String(data.sanitizeInput)} · egress={data.egressMode}
		{/if}
	</button>

	{#if hasSource}
		<Handle id="out" type="source" position={Position.Bottom} class="facet-handle" />
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
		color: #000;
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
		color: #000;
	}

	:global(.facet-handle) {
		width: 8px !important;
		height: 8px !important;
		border: 1.5px solid #000 !important;
		background: var(--color-paper) !important;
		border-radius: 0 !important;
	}
</style>
