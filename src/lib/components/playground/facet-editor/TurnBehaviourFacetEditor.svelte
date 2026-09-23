<script lang="ts">
import type { ContinueStopKind } from '@theoremai/agents/schema';
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

{#snippet continueKinds(
	key: 'allowContinue' | 'autoContinue',
	options: typeof allowContinueOptions,
)}
	<fieldset class="facet-set">
		<legend>
			<FacetFieldLabel path="turnBehaviour.resumption.{key}" />
		</legend>
		<div class="facet-check-grid">
			{#each options as opt (opt.value)}
				<label class="facet-check">
					<Checkbox
						checked={data[key].includes(opt.value as ContinueStopKind)}
						onchange={(v) =>
							patch({ [key]: toggleList(data[key], opt.value as ContinueStopKind, v) })}
					/>
					<span>{opt.label}</span>
				</label>
			{/each}
		</div>
	</fieldset>
{/snippet}

<label class="facet-check">
	<Checkbox checked={data.resumeEnabled} onchange={(v) => patch({ resumeEnabled: v })} />
	<FacetFieldLabel path="turnBehaviour.resumption" />
</label>
{#if data.resumeEnabled}
	{@render continueKinds('allowContinue', allowContinueOptions)}
	{@render continueKinds('autoContinue', autoContinueOptions)}
{/if}

<label class="facet-check">
	<Checkbox
		checked={data.allowSteering !== false}
		onchange={(v) => patch({ allowSteering: v ? undefined : false })}
	/>
	<FacetFieldLabel path="turnBehaviour.allowSteering" />
</label>
