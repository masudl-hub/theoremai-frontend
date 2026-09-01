<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import FacetEditor from '$lib/components/playground/FacetEditor.svelte';
	import { facetTitle } from '$lib/playground/facet-ui';
	import { PLAYGROUND_CTX, type PlaygroundCtx } from '$lib/playground/context';
	import type { PlaygroundNode } from '$lib/playground/types';

	let { node }: { node: PlaygroundNode } = $props();

	const playground = getContext<PlaygroundCtx>(PLAYGROUND_CTX);

	const title = $derived(facetTitle(node.data));

	function close() {
		playground?.closePanel(node.id);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	onMount(() => {
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

<div class="facet-panel-layer">
	<aside
		class="facet-panel"
		aria-labelledby="facet-panel-title"
		transition:fly={{ x: 28, duration: 320, easing: cubicOut }}
	>
		<header class="facet-panel-head">
			<h2 id="facet-panel-title" class="facet-panel-title">{title}</h2>
			<button type="button" class="facet-panel-close" onclick={close} aria-label="Close">×</button>
		</header>
		<div class="facet-panel-body">
			<FacetEditor id={node.id} data={node.data} />
		</div>
	</aside>
</div>

<style>
	.facet-panel-layer {
		position: absolute;
		inset: 0;
		z-index: 40;
		pointer-events: none;
	}

	.facet-panel {
		--facet-panel-inset: 0.75rem;

		position: absolute;
		top: var(--facet-panel-inset);
		right: var(--facet-panel-inset);
		bottom: var(--facet-panel-inset);
		width: 33.333%;
		min-width: 16rem;
		max-width: calc(100% - var(--facet-panel-inset) * 2);
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		border: 1.5px solid #000;
		background: var(--color-paper);
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.07);
		font-family: var(--font-mono);
	}

	.facet-panel-head {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
		padding: 0.75rem 0.85rem;
		border-bottom: 1px solid #000;
	}

	.facet-panel-title {
		margin: 0;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.facet-panel-close {
		appearance: none;
		border: 0;
		background: transparent;
		color: inherit;
		font-size: 1.15rem;
		line-height: 1;
		padding: 0.15rem 0.35rem;
		cursor: pointer;
	}

	.facet-panel-close:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	.facet-panel-body {
		display: flex;
		flex-direction: column;
		min-height: 0;
		flex: 1 1 auto;
		padding: 0.85rem;
		overflow: hidden;
	}
</style>
