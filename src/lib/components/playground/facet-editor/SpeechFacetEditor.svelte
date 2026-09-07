<script lang="ts">
import type { Protocol } from 'theorum/schema';
import Select from '$lib/components/Select.svelte';
import { coerceSpeechFormat, speechFormatOptions } from '$lib/playground/field-controls';
import type { SpeechData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let {
	data,
	patch,
	protocol,
}: {
	data: SpeechData;
	patch: FacetPatch;
	protocol: Protocol;
} = $props();

const formatOptions = $derived(speechFormatOptions(protocol));

$effect(() => {
	const legal = coerceSpeechFormat(protocol, data.format);
	if (legal !== data.format) patch({ format: legal });
});
</script>

<label class="facet-field">
	<FacetFieldLabel path="speech.voice" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ voice: e.currentTarget.value })}
		placeholder="omit"
		value={data.voice}
	>
</label>

<label class="facet-field">
	<FacetFieldLabel path="speech.format" />
	<Select
		onchange={(v) => patch({ format: v as 'pcm' | 'mp3' })}
		options={formatOptions}
		value={data.format}
	/>
</label>
