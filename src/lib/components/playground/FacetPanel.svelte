<script lang="ts">
	import { onMount, getContext } from 'svelte';
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

<aside class="facet-panel" aria-labelledby="facet-panel-title">
	<header class="facet-panel-head">
		<h2 id="facet-panel-title" class="facet-panel-title">{title}</h2>
		<button type="button" class="facet-panel-close" onclick={close} aria-label="Close">×</button>
	</header>
	<div class="facet-panel-body">
		<FacetEditor id={node.id} data={node.data} />
	</div>
</aside>

<style>
	.facet-panel {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		min-width: 16rem;
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
		font-size: 0.75rem;
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
