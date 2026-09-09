<script lang="ts">
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import Select from '$lib/components/Select.svelte';
import { fieldEnumOptions } from '$lib/playground/field-controls';
import type { GuardrailsData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let { data, patch }: { data: GuardrailsData; patch: FacetPatch } = $props();

const onBlockOptions = fieldEnumOptions('guardrails.egress.onBlock');
</script>

<div class="facet-check-grid">
	<label class="facet-check">
		<Checkbox
			checked={data.canary !== false}
			onchange={(v) => patch({ canary: v ? undefined : false })}
		/>
		<FacetFieldLabel path="guardrails.canary" />
	</label>
	<label class="facet-check">
		<Checkbox
			checked={data.sanitizeInput !== false}
			onchange={(v) => patch({ sanitizeInput: v ? undefined : false })}
		/>
		<FacetFieldLabel path="guardrails.sanitizeInput" />
	</label>
	<label class="facet-check">
		<Checkbox
			checked={data.redactSensitive !== false}
			onchange={(v) => patch({ redactSensitive: v ? undefined : false })}
		/>
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
			value={data.perDay ?? ''}
		>
	</label>
{/if}
<label class="facet-check">
	<Checkbox
		checked={data.hasEgress === true}
		onchange={(v) => patch({ hasEgress: v ? true : undefined, onBlock: v ? data.onBlock : undefined })}
	/>
	<FacetFieldLabel path="guardrails.egress.enforce" />
</label>
{#if data.hasEgress === true}
	<label class="facet-field">
		<FacetFieldLabel path="guardrails.egress.onBlock" />
		<Select
			onchange={(v) => patch({ onBlock: v as 'reject_to_agent' | 'refuse_to_user' })}
			options={onBlockOptions}
			value={data.onBlock ?? ''}
		/>
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="guardrails.egress.maxRetries" />
		<input
			class="field"
			min="0"
			oninput={(e) => patch({ egressMaxRetries: Number(e.currentTarget.value) })}
			type="number"
			value={data.egressMaxRetries ?? ''}
		>
	</label>
{/if}

<div class="facet-subgroup">
	<span class="facet-subgroup-title">Network (HTTP / MCP tools)</span>
	<label class="facet-check">
		<Checkbox
			checked={Boolean(data.allowPrivateNetworks)}
			onchange={(v) => patch({ allowPrivateNetworks: v })}
		/>
		<FacetFieldLabel path="guardrails.network.allowPrivateNetworks" />
	</label>
	<label class="facet-field">
		<FacetFieldLabel path="guardrails.network.allowedHosts" />
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ allowedHosts: e.currentTarget.value })}
			placeholder="api.example.com, mcp.example.com"
			value={data.allowedHosts ?? ''}
		>
	</label>
	<p class="facet-field-hint">
		Comma-separated host allowlist for declarative HTTP and MCP tools. Private/loopback targets are
		blocked unless allowed above.
	</p>
</div>
