<script lang="ts">
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import MimeAcceptGrid from '$lib/components/playground/MimeAcceptGrid.svelte';
import { ATTACHMENT_ACCEPT_OPTIONS, VOICE_ACCEPT_OPTIONS } from '$lib/playground/mime';
import type { InputsData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let { data, patch }: { data: InputsData; patch: FacetPatch } = $props();
</script>

{#snippet attachmentsAcceptLegend()}
	<FacetFieldLabel path="inputs.attachments.accept" />
{/snippet}
{#snippet voiceAcceptLegend()}
	<FacetFieldLabel path="inputs.voice.accept" />
{/snippet}

<label class="facet-check text-xs">
	<Checkbox checked={data.text} onchange={(v) => patch({ text: v })} />
	<FacetFieldLabel path="inputs.text" />
</label>
<MimeAcceptGrid
	legend={attachmentsAcceptLegend}
	onSelected={(next) => patch({ attachmentsAccept: next })}
	options={ATTACHMENT_ACCEPT_OPTIONS}
	selected={data.attachmentsAccept}
/>
<MimeAcceptGrid
	legend={voiceAcceptLegend}
	onSelected={(next) => patch({ voiceAccept: next })}
	options={VOICE_ACCEPT_OPTIONS}
	selected={data.voiceAccept}
/>
<label class="facet-field">
	<FacetFieldLabel path="inputs.maxFiles" />
	<input
		class="field"
		min="0"
		oninput={(e) => patch({ maxFiles: Number(e.currentTarget.value) })}
		type="number"
		value={data.maxFiles}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="inputs.maxBytes" />
	<input
		class="field"
		min="0"
		oninput={(e) => patch({ maxBytes: Number(e.currentTarget.value) })}
		type="number"
		value={data.maxBytes}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="inputs.maxTurnBytes" />
	<input
		class="field"
		min="0"
		oninput={(e) => patch({ maxTurnBytes: Number(e.currentTarget.value) })}
		type="number"
		value={data.maxTurnBytes}
	>
</label>
