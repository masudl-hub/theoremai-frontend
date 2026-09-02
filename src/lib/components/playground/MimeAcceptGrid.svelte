<script lang="ts">
import type { Snippet } from 'svelte';
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import { toggleMime } from '$lib/playground/mime';

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
</script>

<fieldset class="facet-set">
	<legend>{@render legend()}</legend>
	<div class="facet-check-grid">
		{#each options as opt (opt.value)}
			<label class="facet-check">
				<Checkbox
					checked={selected.includes(opt.value)}
					onchange={(v) => onSelected(toggleMime(selected, opt.value, v))}
				/>
				<span>{opt.label}</span>
			</label>
		{/each}
	</div>
</fieldset>
