<script lang="ts">
import { getContext } from 'svelte';
import { on } from 'svelte/events';
import FacetEditor from '$lib/components/playground/FacetEditor.svelte';
import { PLAYGROUND_CTX, type PlaygroundCtx } from '$lib/playground/context';
import { facetTitle } from '$lib/playground/facet-ui';
import type { PlaygroundNode } from '$lib/playground/types';

let { node }: { node: PlaygroundNode } = $props();

const playground = getContext<PlaygroundCtx>(PLAYGROUND_CTX);

const title = $derived(facetTitle(node.data));

function close() {
	playground.closePanel(node.id);
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape') close();
}

$effect(() => on(window, 'keydown', onKeydown));
</script>

<aside class="facet-panel" aria-labelledby="facet-panel-title">
	<header class="facet-panel-head">
		<button class="facet-panel-close" aria-label="Close" onclick={close} type="button">×</button>
		<h2 id="facet-panel-title" class="facet-panel-title">{title}</h2>
	</header>
	<div class="facet-panel-body">
		<FacetEditor id={node.id} data={node.data} />
	</div>
</aside>
