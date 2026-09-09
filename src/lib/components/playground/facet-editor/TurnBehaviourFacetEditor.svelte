<script lang="ts">
import type { ContinueStopKind } from 'theorum/schema';
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import { toggleList } from '$lib/playground/compat';
import { fieldEnumOptions } from '$lib/playground/field-controls';
import type { TurnBehaviourData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let { data, patch }: { data: TurnBehaviourData; patch: FacetPatch } = $props();

const allowContinueOptions = fieldEnumOptions('turnBehaviour.resumption.allowContinue');
const autoContinueOptions = fieldEnumOptions('turnBehaviour.resumption.autoContinue');
</script>

<label class="facet-check">
	<Checkbox checked={data.resumeEnabled} onchange={(v) => patch({ resumeEnabled: v })} />
	<FacetFieldLabel path="turnBehaviour.resumption" />
</label>
{#if data.resumeEnabled}
	<fieldset class="facet-set">
		<legend>
			<FacetFieldLabel path="turnBehaviour.resumption.allowContinue" />
		</legend>
		<div class="facet-check-grid">
			{#each allowContinueOptions as opt (opt.value)}
				<label class="facet-check">
					<Checkbox
						checked={data.allowContinue.includes(opt.value as ContinueStopKind)}
						onchange={(v) =>
							patch({
								allowContinue: toggleList(
									data.allowContinue,
									opt.value as ContinueStopKind,
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
			<FacetFieldLabel path="turnBehaviour.resumption.autoContinue" />
		</legend>
		<div class="facet-check-grid">
			{#each autoContinueOptions as opt (opt.value)}
				<label class="facet-check">
					<Checkbox
						checked={data.autoContinue.includes(opt.value as ContinueStopKind)}
						onchange={(v) =>
							patch({
								autoContinue: toggleList(
									data.autoContinue,
									opt.value as ContinueStopKind,
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

<label class="facet-check">
	<Checkbox
		checked={data.allowSteering !== false}
		onchange={(v) => patch({ allowSteering: v ? undefined : false })}
	/>
	<FacetFieldLabel path="turnBehaviour.allowSteering" />
</label>
