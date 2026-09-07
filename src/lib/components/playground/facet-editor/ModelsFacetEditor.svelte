<script lang="ts">
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import Select from '$lib/components/Select.svelte';
import type { PlaygroundCtx } from '$lib/playground/context';
import { fieldEnumOptions } from '$lib/playground/field-controls';
import type { ModelsData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let {
	data,
	patch,
	playground,
	modelIds,
	isLive = false,
}: {
	data: ModelsData;
	patch: FacetPatch;
	playground: PlaygroundCtx;
	modelIds: string[];
	isLive?: boolean;
} = $props();

const keyOptions = fieldEnumOptions('key', { allowOmit: true, omitLabel: '(omit)' });
</script>

<button class="facet-action" onclick={() => playground.addModelBinding()} type="button">
	+ Add model
</button>
<label class="facet-field">
	<FacetFieldLabel path="defaultModel" />
	<input
		class="field"
		autocomplete="off"
		list="playground-model-ids"
		oninput={(e) => patch({ defaultModel: e.currentTarget.value })}
		placeholder="fast"
		value={data.defaultModel}
	>
	<datalist id="playground-model-ids">
		{#each modelIds as id (id)}
			<option value={id}></option>
		{/each}
	</datalist>
</label>
<label class="facet-check">
	<Checkbox checked={data.allowModelSelect} onchange={(v) => patch({ allowModelSelect: v })} />
	<FacetFieldLabel path="allowModelSelect" />
</label>
{#if !isLive}
	<label class="facet-field">
		<FacetFieldLabel path="maxSteps" />
		<input
			class="field"
			min="1"
			oninput={(e) => patch({ maxSteps: Number(e.currentTarget.value) })}
			type="number"
			value={data.maxSteps}
		>
	</label>
{/if}
<label class="facet-field">
	<FacetFieldLabel path="key" />
	<Select
		onchange={(v) =>
			patch({
				key: v as ModelsData['key']
			})}
		options={keyOptions}
		value={data.key}
	/>
</label>
