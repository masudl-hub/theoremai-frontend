<script lang="ts">
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import type { ImageData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let { data, patch }: { data: ImageData; patch: FacetPatch } = $props();
</script>

<label class="facet-field">
	<FacetFieldLabel path="image.aspectRatio" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ aspectRatio: e.currentTarget.value })}
		placeholder="omit"
		value={data.aspectRatio}
	>
</label>

<label class="facet-field">
	<FacetFieldLabel path="image.size" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ size: e.currentTarget.value })}
		placeholder="omit"
		value={data.size}
	>
</label>

<label class="facet-field">
	<FacetFieldLabel path="image.mimeType" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ mimeType: e.currentTarget.value })}
		placeholder="omit — provider default"
		value={data.mimeType}
	>
</label>

<label class="facet-field">
	<FacetFieldLabel path="image.maxInputImages" />
	<input
		class="field"
		min="0"
		oninput={(e) => patch({ maxInputImages: Number(e.currentTarget.value) })}
		type="number"
		value={data.maxInputImages}
	>
</label>

<label class="facet-check">
	<Checkbox checked={data.includeText} onchange={(v) => patch({ includeText: v })} />
	<FacetFieldLabel path="image.includeText" />
</label>
