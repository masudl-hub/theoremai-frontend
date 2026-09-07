<script lang="ts">
import Select from '$lib/components/Select.svelte';
import { SPEECH_FORMAT_OPTIONS } from '$lib/playground/compat';
import type { SpeechData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let { data, patch }: { data: SpeechData; patch: FacetPatch } = $props();
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
		options={SPEECH_FORMAT_OPTIONS}
		value={data.format}
	/>
</label>
