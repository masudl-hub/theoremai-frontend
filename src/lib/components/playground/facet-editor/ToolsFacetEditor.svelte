<script lang="ts">
import type { PlaygroundCtx } from '$lib/playground/context';
import type { ToolsData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let {
	data,
	patch,
	playground,
	isLive = false,
}: {
	data: ToolsData;
	patch: FacetPatch;
	playground: PlaygroundCtx;
	isLive?: boolean;
} = $props();
</script>

{#if !isLive}
	<label class="facet-field">
		<FacetFieldLabel path="tools.t2Loader" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ t2Loader: e.currentTarget.value })}
			placeholder="load_tools (optional)"
			value={data.t2Loader}
		>
	</label>
{/if}
<button class="facet-action" onclick={() => playground.addToolSpec()} type="button">
	+ Add tool
</button>
