<script lang="ts">
import type { PlaygroundCtx } from '$lib/playground/context';
import type { ToolsData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let {
	data,
	patch,
	playground,
}: {
	data: ToolsData;
	patch: FacetPatch;
	playground: PlaygroundCtx;
} = $props();
</script>

<p class="facet-hint">
	Child nodes are custom function tools — each becomes <code>registerTool</code> and is listed in
	<code>tools.allow</code>. Provider builtins stay on each model (<code>builtInTools</code>). T2
	promotion is turn-local: only the designated loader may return
	<code>{'{ loaded: string[] }'}</code>.
</p>
<label class="facet-field">
	<FacetFieldLabel path="tools.t2Loader" text="tools.t2Loader" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ t2Loader: e.currentTarget.value })}
		placeholder="load_tools (optional)"
		value={data.t2Loader}
	>
</label>
<p class="facet-hint">
	Optional function tool id. When that tool completes with
	<code>{'{ loaded: ["…"] }'}</code>, the kernel promotes those T2 ids for the rest of the turn
	only. On <code>geminiLive</code>, declarations are fixed at session start — use T0/T1.
</p>
<button class="btn btn-ghost facet-action" onclick={() => playground.addToolSpec()} type="button">
	[ + Tool ]
</button>
