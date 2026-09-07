<script lang="ts">
import { getContext } from 'svelte';
import { on } from 'svelte/events';
import FacetEditor from '$lib/components/playground/FacetEditor.svelte';
import './facet-editor/facet-editor.css';
import ToolSpecTypeIcon from '$lib/components/playground/icons/ToolSpecTypeIcon.svelte';
import { PLAYGROUND_CTX, type PlaygroundCtx } from '$lib/playground/context';
import { facetTitle } from '$lib/playground/facet-ui';
import type { PlaygroundNode } from '$lib/playground/types';

let { node }: { node: PlaygroundNode } = $props();

const playground = getContext<PlaygroundCtx>(PLAYGROUND_CTX);

const title = $derived(facetTitle(node.data));

const toolType = $derived(node.data.kind === 'toolSpec' ? node.data.toolType : null);

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
		{#if toolType}
			<ToolSpecTypeIcon {toolType} size={14} class="facet-panel-kind-icon" />
		{/if}
		<h2 id="facet-panel-title" class="facet-panel-title">{title}</h2>
	</header>
	<div class="facet-panel-body">
		<FacetEditor id={node.id} data={node.data} />
	</div>
</aside>

<style>
/* Select dropdown is scoped in Select.svelte — override from panel context. */
:global(.facet-panel .select-menu) {
	border: 1px solid var(--pg-shell-border, rgba(0, 0, 0, 0.1));
	box-shadow: none;
}

:global(.facet-panel .select-option) {
	border-bottom: 1px solid rgba(0, 0, 0, 0.06);
	font-weight: 500;
	padding: 0.45rem 0.55rem;
}

:global(.facet-panel .select-option-on) {
	background: var(--pg-chip-bg, rgba(0, 0, 0, 0.06));
	font-weight: 600;
}

:global(.facet-panel .facet-panel-kind-icon) {
	flex-shrink: 0;
	opacity: 0.45;
}
</style>
