<script lang="ts">
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import Select from '$lib/components/Select.svelte';
import { PLAYGROUND_TURN_STOP_KINDS, toggleList } from '$lib/playground/compat';
import type { OutputsData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let {
	data,
	patch,
	enforcedOptions,
	streamModeOptions,
}: {
	data: OutputsData;
	patch: FacetPatch;
	enforcedOptions: ReadonlyArray<{ value: string; label: string }>;
	streamModeOptions: ReadonlyArray<{ value: string; label: string }>;
} = $props();

const OUTPUT_MODE_OPTIONS = [
	{ value: 'text', label: 'Free text / streaming' },
	{ value: 'structured', label: 'Structured JSON schema' },
];
</script>

<label class="facet-field">
	<FacetFieldLabel path="outputs.format" />
	<Select
		onchange={(v) => patch({ mode: v as 'text' | 'structured' })}
		options={OUTPUT_MODE_OPTIONS}
		value={data.mode}
	/>
</label>

{#if data.mode === 'structured'}
	<label class="facet-field">
		<FacetFieldLabel path="outputs.structured" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ schemaId: e.currentTarget.value })}
			placeholder="my.app.output.schema"
			value={data.schemaId}
		>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="registerStructured.enforced" />
		<Select
			onchange={(v) => patch({ schemaEnforced: v as 'responseFormat' | 'prompt' })}
			options={enforcedOptions}
			value={data.schemaEnforced}
		/>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="registerStructured.jsonSchema" />
		<textarea
			class="field facet-area"
			oninput={(e) => patch({ schemaJson: e.currentTarget.value })}
			placeholder={'{ "type": "object", "properties": { … } }'}
			rows="4"
			value={data.schemaJson}
		></textarea>
	</label>
{/if}

<label class="facet-check">
	<Checkbox checked={data.validationEnabled} onchange={(v) => patch({ validationEnabled: v })} />
	<FacetFieldLabel path="outputs.validation" />
</label>
{#if data.validationEnabled}
	<label class="facet-field">
		<FacetFieldLabel path="outputs.validation.maxRetries" />
		<input
			class="field"
			min="0"
			oninput={(e) => patch({ maxRetries: Number(e.currentTarget.value) })}
			type="number"
			value={data.maxRetries}
		>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="outputs.validation.repairGuidance" />
		<textarea
			class="field facet-area"
			oninput={(e) => patch({ repairGuidance: e.currentTarget.value })}
			rows="2"
			value={data.repairGuidance}
		></textarea>
	</label>
{/if}

<label class="facet-field">
	<FacetFieldLabel path="outputs.streaming.mode" />
	<Select
		onchange={(v) => patch({ streamMode: v as 'sse' | 'buffered' })}
		options={streamModeOptions}
		value={data.streamMode}
	/>
</label>

<div class="facet-check-grid">
	<label class="facet-check">
		<Checkbox checked={data.streamThoughts} onchange={(v) => patch({ streamThoughts: v })} />
		<FacetFieldLabel path="outputs.streaming.streamThoughts" />
	</label>
</div>

<label class="facet-check">
	<Checkbox checked={data.resumeEnabled} onchange={(v) => patch({ resumeEnabled: v })} />
	<FacetFieldLabel path="turnResumption" />
</label>
{#if data.resumeEnabled}
	<fieldset class="facet-set">
		<legend>
			<FacetFieldLabel path="turnResumption.allowContinue" />
		</legend>
		<div class="facet-check-grid">
			{#each PLAYGROUND_TURN_STOP_KINDS as opt (opt.value)}
				<label class="facet-check">
					<Checkbox
						checked={data.allowContinue.includes(opt.value)}
						onchange={(v) =>
							patch({
								allowContinue: toggleList(
									data.allowContinue,
									opt.value,
									v
								)
							})}
					/>
					<span>{opt.label}</span>
				</label>
			{/each}
		</div>
	</fieldset>
	<fieldset class="facet-set">
		<legend>
			<FacetFieldLabel path="turnResumption.autoContinue" />
		</legend>
		<div class="facet-check-grid">
			{#each PLAYGROUND_TURN_STOP_KINDS as opt (opt.value)}
				<label class="facet-check">
					<Checkbox
						checked={data.autoContinue.includes(opt.value)}
						onchange={(v) =>
							patch({
								autoContinue: toggleList(
									data.autoContinue,
									opt.value,
									v
								)
							})}
					/>
					<span>{opt.label}</span>
				</label>
			{/each}
		</div>
	</fieldset>
{/if}
