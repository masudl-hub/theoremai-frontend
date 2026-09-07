<script lang="ts">
import type { Protocol, Provider } from 'theorum/schema';
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import Select from '$lib/components/Select.svelte';
import type { ThinkingLevelValue } from '$lib/playground/compat';
import type { PlaygroundCtx } from '$lib/playground/context';
import type { ModelsData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let {
	data,
	patch,
	playground,
	onProtocolChange,
	onProviderChange,
	providerOptions,
	protocolOptions,
	thinkingOptions,
	keyOptions,
	isLive = false,
}: {
	data: ModelsData;
	patch: FacetPatch;
	playground: PlaygroundCtx;
	onProtocolChange: (next: Protocol) => void;
	onProviderChange: (next: Provider) => void;
	providerOptions: ReadonlyArray<{ value: string; label: string }>;
	protocolOptions: ReadonlyArray<{ value: string; label: string }>;
	thinkingOptions: ReadonlyArray<{ value: string; label: string }>;
	keyOptions: ReadonlyArray<{ value: string; label: string }>;
	isLive?: boolean;
} = $props();
</script>

<label class="facet-field">
	<FacetFieldLabel path="model.protocol" />
	<Select
		onchange={(v) => onProtocolChange(v as Protocol)}
		options={protocolOptions}
		value={data.protocol}
	/>
</label>
<label class="facet-field">
	<FacetFieldLabel path="model.provider" />
	<Select
		onchange={(v) => onProviderChange(v as Provider)}
		options={providerOptions}
		value={data.provider}
	/>
</label>
<button class="btn btn-ghost facet-action" onclick={() => playground.addModelSpec()} type="button">
	[ + Model ]
</button>
<label class="facet-field">
	<FacetFieldLabel path="model.thinking" />
	<Select
		onchange={(v) => patch({ thinking: v as ThinkingLevelValue })}
		options={thinkingOptions}
		value={data.thinking}
	/>
</label>
{#if !isLive}
	<label class="facet-check">
		<Checkbox checked={data.thinkingControl} onchange={(v) => patch({ thinkingControl: v })} />
		<FacetFieldLabel path="model.controls" />
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="model.maxSteps" />
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
	<FacetFieldLabel path="model.key" />
	<Select
		onchange={(v) =>
			patch({
				key: v as ModelsData['key']
			})}
		options={keyOptions}
		value={data.key}
	/>
</label>
