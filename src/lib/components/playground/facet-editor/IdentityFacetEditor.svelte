<script lang="ts">
import type { ProfileType as KernelProfileType, ProfileGraphFacetId } from '@theoremai/agents/schema';
import { spineFacetsForProfileType } from '@theoremai/agents/schema';
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import { MODALITY_OPTIONS } from '$lib/playground/compat';
import type { IdentityData, ProfileType } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let { data, patch }: { data: IdentityData; patch: FacetPatch } = $props();

function selectType(t: ProfileType) {
	patch({ profileType: t });
}

const optionalFacets = $derived.by(() => {
	if (!data.profileType) return [];
	return spineFacetsForProfileType(data.profileType as KernelProfileType).filter((f) => f.optional);
});

function toggleOptionalFacet(id: ProfileGraphFacetId, on: boolean) {
	const current = data.includedOptionalFacets;
	const next = on ? [...current.filter((f) => f !== id), id] : current.filter((f) => f !== id);
	patch({ includedOptionalFacets: next });
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

{#if data.profileType && optionalFacets.length}
	<div class="facet-subgroup">
		<span class="facet-subgroup-title">Optional Sections</span>
		<p class="facet-field-hint">
			Toggle optional profile sections. Required facets (models, modality spec) always appear.
		</p>

		<div class="facet-checks-list">
			{#each optionalFacets as facet (facet.id)}
				<label class="facet-check">
					<Checkbox
						checked={data.includedOptionalFacets.includes(facet.id)}
						onchange={(v) => toggleOptionalFacet(facet.id, v)}
					/>
					<span class="check-label">{facet.label}</span>
				</label>
			{/each}
		</div>
	</div>
{/if}
