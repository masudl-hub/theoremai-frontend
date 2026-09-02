<script lang="ts">
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import type { IdentityData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let { data, patch }: { data: IdentityData; patch: FacetPatch } = $props();
</script>

<label class="facet-field">
	<FacetFieldLabel path="id" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ agentId: e.currentTarget.value })}
		value={data.agentId}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="identity.handle" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ handle: e.currentTarget.value })}
		value={data.handle}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="identity.system" />
	<textarea
		class="field facet-area"
		oninput={(e) => patch({ system: e.currentTarget.value })}
		rows="4"
		value={data.system}
	></textarea>
</label>
<p class="facet-hint">
	Optional here — or load the same string from another file when you wire the profile.
</p>
<label class="facet-check text-xs">
	<Checkbox checked={data.chat} onchange={(v) => patch({ chat: v })} />
	<FacetFieldLabel path="identity.chat" />
</label>
