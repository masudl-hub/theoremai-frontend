<script lang="ts">
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import Select from '$lib/components/Select.svelte';
import { PLAYGROUND_TURN_STOP_KINDS, toggleList } from '$lib/playground/compat';
import { OUTPUT_ROLE_OPTIONS, type OutputRole } from '$lib/playground/outputs';
import type { OutputsData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let {
	data,
	patch,
	outputRole,
	onOutputRoleChange,
	speechFormatOptions,
	enforcedOptions,
	streamModeOptions,
}: {
	data: OutputsData;
	patch: FacetPatch;
	outputRole: OutputRole;
	onOutputRoleChange: (role: OutputRole) => void;
	speechFormatOptions: ReadonlyArray<{ value: string; label: string }>;
	enforcedOptions: ReadonlyArray<{ value: string; label: string }>;
	streamModeOptions: ReadonlyArray<{ value: string; label: string }>;
} = $props();
</script>

<label class="facet-field">
	<span>Primary output</span>
	<Select
		onchange={(v) => onOutputRoleChange(v as OutputRole)}
		options={OUTPUT_ROLE_OPTIONS}
		value={outputRole}
	/>
</label>
<p class="facet-hint">
	Structured JSON, image, and speech are mutually exclusive provider wire formats. Image profiles
	can optionally include interleaved assistant text via outputs.image.includeText.
</p>
{#if outputRole === 'structured'}
	<label class="facet-field">
		<span>schema id</span>
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ schemaId: e.currentTarget.value })}
			placeholder="my.app.lead.schema"
			value={data.schemaId}
		>
	</label>
	<label class="facet-field">
		<span>registerStructured.enforced</span>
		<Select
			onchange={(v) => patch({ schemaEnforced: v as 'responseFormat' | 'prompt' })}
			options={enforcedOptions}
			value={data.schemaEnforced}
		/>
	</label>
	<label class="facet-field">
		<span>registerStructured.jsonSchema (optional JSON)</span>
		<textarea
			class="field facet-area"
			oninput={(e) => patch({ schemaJson: e.currentTarget.value })}
			placeholder={'{ "type": "object", "properties": { … } }'}
			rows="4"
			value={data.schemaJson}
		></textarea>
	</label>
	<p class="facet-hint">Profile stores the schema id only. Body goes through registerStructured.</p>
{/if}

{#if outputRole === 'image'}
	<label class="facet-field">
		<FacetFieldLabel path="outputs.image.aspectRatio" text="image.aspectRatio" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ imageAspectRatio: e.currentTarget.value })}
			value={data.imageAspectRatio}
		>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="outputs.image.size" text="image.size" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ imageSize: e.currentTarget.value })}
			value={data.imageSize}
		>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="outputs.image.mimeType" text="image.mimeType" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ imageMimeType: e.currentTarget.value })}
			value={data.imageMimeType}
		>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="outputs.image.maxInputImages" text="image.maxInputImages" />
		<input
			class="field"
			min="0"
			oninput={(e) => patch({ imageMaxInputImages: Number(e.currentTarget.value) })}
			type="number"
			value={data.imageMaxInputImages}
		>
	</label>
	<label class="facet-check text-xs">
		<Checkbox checked={data.imageIncludeText} onchange={(v) => patch({ imageIncludeText: v })} />
		<FacetFieldLabel path="outputs.image.includeText" text="image.includeText" />
	</label>
	<p class="facet-hint">
		When enabled, the provider may stream assistant text alongside generated images (Gemini:
		response_format array with text + image entries).
	</p>
{/if}

{#if outputRole === 'speech'}
	<label class="facet-field">
		<FacetFieldLabel path="outputs.speech.voice" text="speech.voice" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ speechVoice: e.currentTarget.value })}
			value={data.speechVoice}
		>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="outputs.speech.format" text="speech.format" />
		<Select
			onchange={(v) => patch({ speechFormat: v as 'pcm' | 'mp3' })}
			options={speechFormatOptions}
			value={data.speechFormat}
		/>
	</label>
{/if}

<label class="facet-check text-xs">
	<Checkbox checked={data.validationEnabled} onchange={(v) => patch({ validationEnabled: v })} />
	<FacetFieldLabel path="outputs.validation" />
</label>
{#if data.validationEnabled}
	<label class="facet-field">
		<FacetFieldLabel path="outputs.validation.maxRetries" text="validation.maxRetries" />
		<input
			class="field"
			min="0"
			oninput={(e) => patch({ maxRetries: Number(e.currentTarget.value) })}
			type="number"
			value={data.maxRetries}
		>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="outputs.validation.repairGuidance" text="validation.repairGuidance" />
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
<label class="facet-check text-xs">
	<Checkbox checked={data.streamThoughts} onchange={(v) => patch({ streamThoughts: v })} />
	<FacetFieldLabel path="outputs.streaming.streamThoughts" text="streaming.streamThoughts" />
</label>
<label class="facet-check text-xs">
	<Checkbox checked={data.gateMedia} onchange={(v) => patch({ gateMedia: v })} />
	<FacetFieldLabel path="outputs.streaming.gateMedia" text="streaming.gateMedia" />
</label>

<label class="facet-check text-xs">
	<Checkbox checked={data.resumeEnabled} onchange={(v) => patch({ resumeEnabled: v })} />
	<FacetFieldLabel path="outputs.resume" />
</label>
{#if data.resumeEnabled}
	<fieldset class="facet-set">
		<legend>
			<FacetFieldLabel path="outputs.resume.allowContinue" text="resume.allowContinue" />
		</legend>
		{#each PLAYGROUND_TURN_STOP_KINDS as opt (opt.value)}
			<label class="facet-check text-xs">
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
	</fieldset>
	<fieldset class="facet-set">
		<legend>
			<FacetFieldLabel path="outputs.resume.autoContinue" text="resume.autoContinue" />
		</legend>
		{#each PLAYGROUND_TURN_STOP_KINDS as opt (opt.value)}
			<label class="facet-check text-xs">
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
	</fieldset>
{/if}
