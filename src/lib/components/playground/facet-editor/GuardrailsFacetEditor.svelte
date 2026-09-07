<script lang="ts">
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import Select from '$lib/components/Select.svelte';
import type { GuardrailsData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let {
	data,
	patch,
	onBlockOptions,
	egressModeOptions,
}: {
	data: GuardrailsData;
	patch: FacetPatch;
	onBlockOptions: ReadonlyArray<{ value: string; label: string }>;
	egressModeOptions: ReadonlyArray<{ value: string; label: string }>;
} = $props();
</script>

<div class="facet-check-grid">
	<label class="facet-check">
		<Checkbox checked={data.canary} onchange={(v) => patch({ canary: v })} />
		<FacetFieldLabel path="guardrails.canary" />
	</label>
	<label class="facet-check">
		<Checkbox checked={data.sanitizeInput} onchange={(v) => patch({ sanitizeInput: v })} />
		<FacetFieldLabel path="guardrails.sanitizeInput" />
	</label>
	<label class="facet-check">
		<Checkbox checked={data.redactSensitive} onchange={(v) => patch({ redactSensitive: v })} />
		<FacetFieldLabel path="guardrails.redactSensitive" />
	</label>
	<label class="facet-check">
		<Checkbox checked={data.quotaEnabled} onchange={(v) => patch({ quotaEnabled: v })} />
		<FacetFieldLabel path="guardrails.quota" />
	</label>
</div>
{#if data.quotaEnabled}
	<label class="facet-field">
		<FacetFieldLabel path="guardrails.quota.perDay" />
		<input
			class="field"
			min="1"
			oninput={(e) => patch({ perDay: Number(e.currentTarget.value) })}
			type="number"
			value={data.perDay}
		>
	</label>
{/if}
<label class="facet-field">
	<FacetFieldLabel path="guardrails.egress" />
	<Select
		onchange={(v) => patch({ egressMode: v as 'default' | 'none' })}
		options={egressModeOptions}
		value={data.egressMode}
	/>
</label>
{#if data.egressMode === 'default'}
	<label class="facet-field">
		<FacetFieldLabel path="guardrails.egress.onBlock" />
		<Select
			onchange={(v) => patch({ onBlock: v as 'reject_to_agent' | 'refuse_to_user' })}
			options={onBlockOptions}
			value={data.onBlock}
		/>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="guardrails.egress.maxRetries" />
		<input
			class="field"
			min="0"
			oninput={(e) => patch({ egressMaxRetries: Number(e.currentTarget.value) })}
			type="number"
			value={data.egressMaxRetries}
		>
	</label>
{/if}
