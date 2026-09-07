<script lang="ts">
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import Select from '$lib/components/Select.svelte';
import { fieldSelectOptions, fieldVocabulary } from '$lib/playground/field-controls';
import type { LiveData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let { data, patch }: { data: LiveData; patch: FacetPatch } = $props();

const liveVoiceVocabulary = fieldVocabulary('live.voice');
const compressionOptions = fieldSelectOptions('live.contextCompression', { allowOmit: true });
const activityHandlingOptions = fieldSelectOptions('live.vad.activityHandling', { allowOmit: true });
const startSensitivityOptions = fieldSelectOptions('live.vad.startSensitivity', { allowOmit: true });
const endSensitivityOptions = fieldSelectOptions('live.vad.endSensitivity', { allowOmit: true });

function patchMs(key: 'vadPrefixPaddingMs' | 'vadSilenceDurationMs', raw: string): void {
	const trimmed = raw.trim();
	if (!trimmed) {
		patch({ [key]: '' });
		return;
	}
	const n = Number(trimmed);
	patch({ [key]: Number.isFinite(n) ? n : '' });
}
</script>

<fieldset class="facet-set">
	<legend><FacetFieldLabel path="live.ingress" /></legend>
	<div class="facet-check-grid">
		<label class="facet-check">
			<Checkbox checked={data.ingressAudio} onchange={(v) => patch({ ingressAudio: v })} />
			<FacetFieldLabel path="live.ingress.audio" />
		</label>
		<label class="facet-check">
			<Checkbox checked={data.ingressVideo} onchange={(v) => patch({ ingressVideo: v })} />
			<FacetFieldLabel path="live.ingress.video" />
		</label>
		<label class="facet-check">
			<Checkbox checked={data.ingressText} onchange={(v) => patch({ ingressText: v })} />
			<FacetFieldLabel path="live.ingress.text" />
		</label>
	</div>
</fieldset>

<label class="facet-field">
	<FacetFieldLabel path="live.voice" />
	<input
		class="field"
		autocomplete="off"
		list="live-voice-vocabulary"
		oninput={(e) => patch({ voice: e.currentTarget.value })}
		placeholder="omit"
		value={data.voice}
	>
	{#if liveVoiceVocabulary.length}
		<datalist id="live-voice-vocabulary">
			{#each liveVoiceVocabulary as voice (voice)}
				<option value={voice}></option>
			{/each}
		</datalist>
	{/if}
</label>

<div class="facet-check-grid">
	<label class="facet-check">
		<Checkbox checked={data.sessionResumption} onchange={(v) => patch({ sessionResumption: v })} />
		<FacetFieldLabel path="live.sessionResumption" />
	</label>
	<label class="facet-check">
		<Checkbox checked={data.proactiveAudio} onchange={(v) => patch({ proactiveAudio: v })} />
		<FacetFieldLabel path="live.proactiveAudio" />
	</label>
</div>

<label class="facet-field">
	<FacetFieldLabel path="live.contextCompression" />
	<Select
		onchange={(v) =>
			patch({
				contextCompression: v as LiveData['contextCompression'],
			})}
		options={compressionOptions}
		value={data.contextCompression}
	/>
</label>

<label class="facet-check">
	<Checkbox checked={data.vadEnabled} onchange={(v) => patch({ vadEnabled: v })} />
	<FacetFieldLabel path="live.vad" />
</label>

{#if data.vadEnabled}
	<label class="facet-field">
		<FacetFieldLabel path="live.vad.activityHandling" />
		<Select
			onchange={(v) =>
				patch({ vadActivityHandling: v as LiveData['vadActivityHandling'] })}
			options={activityHandlingOptions}
			value={data.vadActivityHandling}
		/>
	</label>

	<label class="facet-field">
		<FacetFieldLabel path="live.vad.startSensitivity" />
		<Select
			onchange={(v) =>
				patch({ vadStartSensitivity: v as LiveData['vadStartSensitivity'] })}
			options={startSensitivityOptions}
			value={data.vadStartSensitivity}
		/>
	</label>

	<label class="facet-field">
		<FacetFieldLabel path="live.vad.endSensitivity" />
		<Select
			onchange={(v) => patch({ vadEndSensitivity: v as LiveData['vadEndSensitivity'] })}
			options={endSensitivityOptions}
			value={data.vadEndSensitivity}
		/>
	</label>

	<label class="facet-field">
		<FacetFieldLabel path="live.vad.prefixPaddingMs" />
		<input
			class="field"
			min="0"
			oninput={(e) => patchMs('vadPrefixPaddingMs', e.currentTarget.value)}
			placeholder="omit"
			step="1"
			type="number"
			value={data.vadPrefixPaddingMs}
		>
	</label>

	<label class="facet-field">
		<FacetFieldLabel path="live.vad.silenceDurationMs" />
		<input
			class="field"
			min="0"
			oninput={(e) => patchMs('vadSilenceDurationMs', e.currentTarget.value)}
			placeholder="omit"
			step="1"
			type="number"
			value={data.vadSilenceDurationMs}
		>
	</label>
{/if}

<fieldset class="facet-set">
	<legend><FacetFieldLabel path="live.transcription" /></legend>
	<div class="facet-check-grid">
		<label class="facet-check">
			<Checkbox
				checked={data.transcriptionInput}
				onchange={(v) => patch({ transcriptionInput: v })}
			/>
			<FacetFieldLabel path="live.transcription.input" />
		</label>
		<label class="facet-check">
			<Checkbox
				checked={data.transcriptionOutput}
				onchange={(v) => patch({ transcriptionOutput: v })}
			/>
			<FacetFieldLabel path="live.transcription.output" />
		</label>
	</div>
</fieldset>
