<script lang="ts">
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import { MODALITY_OPTIONS } from '$lib/playground/compat';
import type { IdentityData, ProfileType } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let { data, patch }: { data: IdentityData; patch: FacetPatch } = $props();

function selectType(t: ProfileType) {
	patch({ profileType: t });
}
</script>

<label class="facet-field">
	<FacetFieldLabel path="id" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ agentId: e.currentTarget.value })}
		placeholder="e.g. sales.agent"
		value={data.agentId}
	>
</label>

<div class="facet-field">
	<FacetFieldLabel path="type" />
	<div class="modality-grid">
		{#each MODALITY_OPTIONS as opt (opt.value)}
			<button
				class="modality-card"
				class:modality-card--active={data.profileType === opt.value}
				onclick={() => selectType(opt.value)}
				type="button"
			>
				<span class="modality-name">{opt.label}</span>
				<span class="modality-desc">{opt.desc}</span>
			</button>
		{/each}
	</div>
	<p class="facet-field-hint">
		Select a profile modality above to instantiate and wire the nested nodes below.
	</p>
</div>

<label class="facet-field">
	<FacetFieldLabel path="identity.handle" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ handle: e.currentTarget.value })}
		placeholder="e.g. sales"
		value={data.handle}
	>
</label>

<label class="facet-field">
	<FacetFieldLabel path="identity.system" />
	<textarea
		class="field facet-area"
		oninput={(e) => patch({ system: e.currentTarget.value })}
		placeholder="System instructions for the agent..."
		rows="3"
		value={data.system}
	></textarea>
</label>

{#if data.profileType}
	<div class="facet-subgroup">
		<span class="facet-subgroup-title">Nested Nodes on Canvas</span>

		<div class="facet-checks-list">
			<div class="facet-check-row">
				<span class="check-fixed">✓</span>
				<span class="check-label">Models (spec & wire configs)</span>
			</div>

			{#if data.profileType === 'image'}
				<div class="facet-check-row">
					<span class="check-fixed">✓</span>
					<span class="check-label">Image specification (ratio, size, MIME)</span>
				</div>
			{:else if data.profileType === 'speech'}
				<div class="facet-check-row">
					<span class="check-fixed">✓</span>
					<span class="check-label">Speech specification (voice, format)</span>
				</div>
			{:else if data.profileType === 'live'}
				<div class="facet-check-row">
					<span class="check-fixed">✓</span>
					<span class="check-label">Live streaming specification</span>
				</div>
			{/if}

			{#if data.profileType !== 'speech'}
				<label class="facet-check">
					<Checkbox
						checked={data.includeTools !== false}
						onchange={(v) => patch({ includeTools: v })}
					/>
					<span class="check-label">Tools (custom function registry)</span>
				</label>

				{#if data.profileType !== 'live'}
					<label class="facet-check">
						<Checkbox
							checked={data.includeInputs !== false}
							onchange={(v) => patch({ includeInputs: v })}
						/>
						<span class="check-label">Inputs (attachments & voice rules)</span>
					</label>
				{/if}
			{/if}

			{#if data.profileType !== 'live'}
				<label class="facet-check">
					<Checkbox
						checked={data.includeOutputs !== false}
						onchange={(v) => patch({ includeOutputs: v })}
					/>
					<span class="check-label">Outputs (schemas & streaming)</span>
				</label>
			{/if}

			<label class="facet-check">
				<Checkbox
					checked={data.includeGuardrails !== false}
					onchange={(v) => patch({ includeGuardrails: v })}
				/>
				<span class="check-label">Guardrails (canary, sanitize, quota, egress)</span>
			</label>
		</div>
	</div>
{/if}
