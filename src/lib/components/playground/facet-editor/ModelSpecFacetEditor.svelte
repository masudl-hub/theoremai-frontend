<script lang="ts">
import type { ThinkingLevel } from 'theorum/schema';
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import Select from '$lib/components/Select.svelte';
import { toggleList } from '$lib/playground/compat';
import { fieldEnumOptions } from '$lib/playground/field-controls';
import {
	GOOGLE_BUILTIN_OPTIONS,
	type GoogleBuiltinId,
	OPENROUTER_PLAYGROUND_API_ID,
} from '$lib/playground/playground-policy';
import type { ModelSpecData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let {
	data,
	patch,
	hubOpenRouter,
	hubGoogle,
	geminiModelOptions,
	geminiApiId,
	allowedGeminiBuiltins,
	geminiBuiltIns,
	apiIdPlaceholder,
	onGeminiApiIdChange,
	onGeminiBuiltinToggle,
}: {
	data: ModelSpecData;
	patch: FacetPatch;
	hubOpenRouter: boolean;
	hubGoogle: boolean;
	geminiModelOptions: ReadonlyArray<{ value: string; label: string }>;
	geminiApiId: string;
	allowedGeminiBuiltins: GoogleBuiltinId[];
	geminiBuiltIns: GoogleBuiltinId[];
	apiIdPlaceholder: string;
	onGeminiApiIdChange: (next: string) => void;
	onGeminiBuiltinToggle: (builtin: GoogleBuiltinId, on: boolean) => void;
} = $props();

const thinkingOptions = fieldEnumOptions('model.config.*.thinking.on');
const thinkingLevelOptions = fieldEnumOptions('model.config.*.thinkingLevels');
const summaryOptions = fieldEnumOptions('model.config.*.summaries.on');

function geminiBuiltinAllowed(builtin: GoogleBuiltinId): boolean {
	return allowedGeminiBuiltins.includes(builtin);
}
</script>

<label class="facet-field">
	<FacetFieldLabel path="model.config.*" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ modelId: e.currentTarget.value })}
		value={data.modelId}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="model.select.*" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ selectLabel: e.currentTarget.value })}
		placeholder="fast"
		value={data.selectLabel}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="model.config.*.apiId" />
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
<label class="facet-field">
	<FacetFieldLabel path="model.config.*.thinking.on" />
	<Select
		onchange={(v) => patch({ thinkingOn: v as ThinkingLevel })}
		options={thinkingOptions}
		value={data.thinkingOn}
	/>
</label>
<label class="facet-field">
	<FacetFieldLabel path="model.config.*.thinking.off" />
	<Select
		onchange={(v) => patch({ thinkingOff: v as ThinkingLevel })}
		options={thinkingOptions}
		value={data.thinkingOff}
	/>
</label>
<fieldset class="facet-set">
	<legend>
		<FacetFieldLabel path="model.config.*.thinkingLevels" />
	</legend>
	<div class="facet-check-grid">
		{#each thinkingLevelOptions as opt (opt.value)}
			<label class="facet-check">
				<Checkbox
					checked={data.thinkingLevels.includes(opt.value as ThinkingLevel)}
					onchange={(v) =>
						patch({
							thinkingLevels: toggleList(
								data.thinkingLevels,
								opt.value as ThinkingLevel,
								v
							) as ThinkingLevel[]
						})}
				/>
				<span>{opt.label}</span>
			</label>
		{/each}
	</div>
</fieldset>
<label class="facet-field">
	<FacetFieldLabel path="model.config.*.summaries.on" />
	<Select
		onchange={(v) => patch({ summariesOn: v as 'auto' | 'none' })}
		options={summaryOptions}
		value={data.summariesOn}
	/>
</label>
<label class="facet-field">
	<FacetFieldLabel path="model.config.*.summaries.off" />
	<Select
		onchange={(v) => patch({ summariesOff: v as 'auto' | 'none' })}
		options={summaryOptions}
		value={data.summariesOff}
	/>
</label>
<label class="facet-field">
	<FacetFieldLabel path="model.config.*.maxOutputTokens" />
	<input
		class="field"
		min="1"
		oninput={(e) => patch({ maxOutputTokens: Number(e.currentTarget.value) })}
		type="number"
		value={data.maxOutputTokens}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="model.config.*.temperature" />
	<input
		class="field"
		max="2"
		min="0"
		oninput={(e) => patch({ temperature: Number(e.currentTarget.value) })}
		step="0.1"
		type="number"
		value={data.temperature}
	>
</label>
{#if hubGoogle}
	<fieldset class="facet-set">
		<legend>
			<FacetFieldLabel path="model.config.*.builtInTools" />
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
		<FacetFieldLabel path="model.config.*.builtInTools" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ builtInTools: e.currentTarget.value })}
			placeholder="googleMaps, urlContext"
			value={data.builtInTools}
		>
	</label>
{/if}
