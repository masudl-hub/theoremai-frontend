<script lang="ts">
import type { Protocol, Provider, ThinkingLevel } from 'theorum/schema';
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import Select from '$lib/components/Select.svelte';
import { fieldEnumOptions } from '$lib/playground/field-controls';
import {
	GOOGLE_BUILTIN_OPTIONS,
	type GoogleBuiltinId,
	OPENROUTER_PLAYGROUND_API_ID,
} from '$lib/playground/playground-policy';
import type { ModelBindingData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let {
	data,
	patch,
	providerOptions,
	protocolOptions,
	hubOpenRouter,
	hubGoogle,
	geminiModelOptions,
	geminiApiId,
	allowedGeminiBuiltins,
	geminiBuiltIns,
	apiIdPlaceholder,
	onProtocolChange,
	onProviderChange,
	onGeminiApiIdChange,
	onGeminiBuiltinToggle,
}: {
	data: ModelBindingData;
	patch: FacetPatch;
	providerOptions: ReadonlyArray<{ value: string; label: string }>;
	protocolOptions: ReadonlyArray<{ value: string; label: string }>;
	hubOpenRouter: boolean;
	hubGoogle: boolean;
	geminiModelOptions: ReadonlyArray<{ value: string; label: string }>;
	geminiApiId: string;
	allowedGeminiBuiltins: GoogleBuiltinId[];
	geminiBuiltIns: GoogleBuiltinId[];
	apiIdPlaceholder: string;
	onProtocolChange: (next: Protocol) => void;
	onProviderChange: (next: Provider) => void;
	onGeminiApiIdChange: (next: string) => void;
	onGeminiBuiltinToggle: (builtin: GoogleBuiltinId, on: boolean) => void;
} = $props();

const effortLevelOptions = fieldEnumOptions('models.*.efforts.*');
const effortAliases = $derived(Object.keys(data.efforts));

function geminiBuiltinAllowed(builtin: GoogleBuiltinId): boolean {
	return allowedGeminiBuiltins.includes(builtin);
}

function patchEffortAlias(oldAlias: string, nextAlias: string) {
	const trimmed = nextAlias.trim();
	if (!trimmed || trimmed === oldAlias) return;
	const next = { ...data.efforts };
	const level = next[oldAlias];
	delete next[oldAlias];
	next[trimmed] = level;
	const defaultEffort = data.defaultEffort === oldAlias ? trimmed : data.defaultEffort;
	patch({ efforts: next, defaultEffort });
}

function patchEffortLevel(alias: string, level: ThinkingLevel) {
	patch({ efforts: { ...data.efforts, [alias]: level } });
}

function removeEffort(alias: string) {
	const next = { ...data.efforts };
	delete next[alias];
	const defaultEffort =
		data.defaultEffort === alias ? (Object.keys(next)[0] ?? '') : data.defaultEffort;
	patch({ efforts: next, defaultEffort });
}

function addEffort() {
	const base = `effort${String(effortAliases.length + 1)}`;
	let alias = base;
	let n = 1;
	while (alias in data.efforts) {
		n += 1;
		alias = `${base}${String(n)}`;
	}
	patch({
		efforts: { ...data.efforts, [alias]: 'minimal' },
		...(data.defaultEffort.trim() ? {} : { defaultEffort: alias }),
	});
}
</script>

<label class="facet-field">
	<FacetFieldLabel path="models.*" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ modelId: e.currentTarget.value })}
		value={data.modelId}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="models.*.protocol" />
	<Select
		onchange={(v) => onProtocolChange(v as Protocol)}
		options={protocolOptions}
		value={data.protocol}
	/>
</label>
<label class="facet-field">
	<FacetFieldLabel path="models.*.provider" />
	<Select
		onchange={(v) => onProviderChange(v as Provider)}
		options={providerOptions}
		value={data.provider}
	/>
</label>
<label class="facet-field">
	<FacetFieldLabel path="models.*.apiId" />
	{#if hubOpenRouter}
		<input class="field" readonly value={OPENROUTER_PLAYGROUND_API_ID}>
	{:else if hubGoogle}
		<Select
			onchange={(v) => onGeminiApiIdChange(v)}
			options={geminiModelOptions}
			value={geminiApiId}
		/>
	{:else}
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ apiId: e.currentTarget.value })}
			placeholder={apiIdPlaceholder}
			value={data.apiId}
		>
	{/if}
</label>
<fieldset class="facet-set">
	<legend>
		<FacetFieldLabel path="models.*.efforts" />
	</legend>
	{#each effortAliases as alias (alias)}
		<div class="facet-effort-row">
			<input
				class="field"
				autocomplete="off"
				oninput={(e) => patchEffortAlias(alias, e.currentTarget.value)}
				placeholder="alias"
				value={alias}
			>
			<Select
				onchange={(v) => patchEffortLevel(alias, v as ThinkingLevel)}
				options={effortLevelOptions}
				value={data.efforts[alias]}
			/>
			<button
				class="facet-action facet-action-inline"
				onclick={() => removeEffort(alias)}
				type="button"
			>
				Remove
			</button>
		</div>
	{/each}
	<button class="facet-action" onclick={addEffort} type="button">+ Add effort</button>
</fieldset>
<label class="facet-field">
	<FacetFieldLabel path="models.*.defaultEffort" />
	<Select
		onchange={(v) => patch({ defaultEffort: v })}
		options={effortAliases.map((alias) => ({ value: alias, label: alias }))}
		value={data.defaultEffort}
	/>
</label>
<label class="facet-check">
	<Checkbox checked={data.allowEffortSelect} onchange={(v) => patch({ allowEffortSelect: v })} />
	<FacetFieldLabel path="models.*.allowEffortSelect" />
</label>
<label class="facet-check">
	<Checkbox checked={data.summaries} onchange={(v) => patch({ summaries: v })} />
	<FacetFieldLabel path="models.*.summaries" />
</label>
<label class="facet-field">
	<FacetFieldLabel path="models.*.maxOutputTokens" />
	<input
		class="field"
		min="1"
		oninput={(e) => patch({ maxOutputTokens: Number(e.currentTarget.value) })}
		type="number"
		value={data.maxOutputTokens}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="models.*.temperature" />
	<input
		class="field"
		max="2"
		min="0"
		oninput={(e) => {
			const raw = e.currentTarget.value.trim();
			patch({ temperature: raw === '' ? undefined : Number(raw) });
		}}
		placeholder="provider default"
		step="0.1"
		type="number"
		value={data.temperature ?? ''}
	>
</label>
{#if hubGoogle}
	<fieldset class="facet-set">
		<legend>
			<FacetFieldLabel path="models.*.builtInTools" />
		</legend>
		<div class="facet-check-grid">
			{#each GOOGLE_BUILTIN_OPTIONS as opt (opt.value)}
				<label class="facet-check" class:facet-check-disabled={!geminiBuiltinAllowed(opt.value)}>
					<Checkbox
						checked={geminiBuiltIns.includes(opt.value)}
						disabled={!geminiBuiltinAllowed(opt.value)}
						onchange={(v) => onGeminiBuiltinToggle(opt.value, v)}
					/>
					<span>{opt.label}</span>
				</label>
			{/each}
		</div>
	</fieldset>
{:else}
	<label class="facet-field">
		<FacetFieldLabel path="models.*.builtInTools" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ builtInTools: e.currentTarget.value })}
			placeholder="googleMaps, urlContext"
			value={data.builtInTools}
		>
	</label>
{/if}
