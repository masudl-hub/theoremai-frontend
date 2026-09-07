<script lang="ts">
import type { Snippet } from 'svelte';
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import { isMimeSelected, toggleMime } from '$lib/playground/mime';

let {
	legend,
	options,
	selected,
	onSelected,
}: {
	legend: Snippet;
	options: ReadonlyArray<{ value: string; label: string }>;
	selected: string[];
	onSelected: (next: string[]) => void;
} = $props();

const catalog = $derived(options.map((opt) => opt.value));
</script>

<fieldset class="facet-set">
	<legend>{@render legend()}</legend>
	<div class="facet-check-grid">
		{#each options as opt (opt.value)}
			<label class="facet-check">
				<Checkbox
					checked={isMimeSelected(selected, opt.value)}
					onchange={(v) => onSelected(toggleMime(selected, opt.value, v, catalog))}
				/>
				<span>{opt.label}</span>
			</label>
		{/each}
	</div>
</fieldset>
