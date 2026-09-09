<script lang="ts">
import Checkbox from '$lib/components/playground/Checkbox.svelte';
import type { ObservabilityData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let { data, patch }: { data: ObservabilityData; patch: FacetPatch } = $props();

function patchInclude(key: string, value: boolean | undefined) {
	patch({ include: { ...data.include, [key]: value } });
}

function patchScrub(key: string, value: boolean | undefined) {
	patch({ scrub: { ...data.scrub, [key]: value } });
}
</script>

<label class="facet-field">
	<FacetFieldLabel path="observability.writeTo" />
	<div class="facet-check-grid">
		<label class="facet-check">
			<Checkbox
				checked={data.writeTo === false}
				onchange={(v) => patch({ writeTo: v ? false : '' })}
			/>
			<span>Off (false)</span>
		</label>
	</div>
	{#if data.writeTo !== false}
		<input
			class="field"
			autocomplete="off"
			oninput={(e) => patch({ writeTo: e.currentTarget.value })}
			placeholder="(omit — kernel default)"
			value={typeof data.writeTo === 'string' ? data.writeTo : ''}
		>
	{/if}
</label>

<label class="facet-field">
	<FacetFieldLabel path="observability.sampleRate" />
	<input
		class="field"
		max="1"
		min="0"
		oninput={(e) => {
			const raw = e.currentTarget.value.trim();
			patch({ sampleRate: raw === '' ? undefined : Number(raw) });
		}}
		placeholder="1 (default — every turn)"
		step="0.1"
		type="number"
		value={data.sampleRate ?? ''}
	>
</label>

<div class="facet-subgroup">
	<span class="facet-subgroup-title">Include</span>
	<p class="facet-field-hint">
		Checked = kernel default when a block is authored (or opt-in for wire/evidence/preview). Uncheck
		to author false. Empty writeTo with no include/scrub omits the whole block.
	</p>
	<div class="facet-check-grid">
		<label class="facet-check">
			<Checkbox
				checked={data.include?.upstreamLog !== false}
				onchange={(v) => patchInclude('upstreamLog', v ? undefined : false)}
			/>
			<FacetFieldLabel path="observability.include.upstreamLog" />
		</label>
		<label class="facet-check">
			<Checkbox
				checked={data.include?.outboundWire === true}
				onchange={(v) => patchInclude('outboundWire', v ? true : undefined)}
			/>
			<FacetFieldLabel path="observability.include.outboundWire" />
		</label>
		<label class="facet-check">
			<Checkbox
				checked={data.include?.evidenceRaw === true}
				onchange={(v) => patchInclude('evidenceRaw', v ? true : undefined)}
			/>
			<FacetFieldLabel path="observability.include.evidenceRaw" />
		</label>
		<label class="facet-check">
			<Checkbox
				checked={data.include?.usage !== false}
				onchange={(v) => patchInclude('usage', v ? undefined : false)}
			/>
			<FacetFieldLabel path="observability.include.usage" />
		</label>
		<label class="facet-check">
			<Checkbox
				checked={data.include?.guardrailDecisions !== false}
				onchange={(v) => patchInclude('guardrailDecisions', v ? undefined : false)}
			/>
			<FacetFieldLabel path="observability.include.guardrailDecisions" />
		</label>
		<label class="facet-check">
			<Checkbox
				checked={data.include?.guardrailMatchPreview === true}
				onchange={(v) => patchInclude('guardrailMatchPreview', v ? true : undefined)}
			/>
			<FacetFieldLabel path="observability.include.guardrailMatchPreview" />
		</label>
	</div>
</div>

<div class="facet-subgroup">
	<span class="facet-subgroup-title">Scrub</span>
	<p class="facet-field-hint">
		Checked = omit (kernel scrub on when authored). Uncheck to author false.
	</p>
	<div class="facet-check-grid">
		<label class="facet-check">
			<Checkbox
				checked={data.scrub?.sensitive !== false}
				onchange={(v) => patchScrub('sensitive', v ? undefined : false)}
			/>
			<FacetFieldLabel path="observability.scrub.sensitive" />
		</label>
		<label class="facet-check">
			<Checkbox
				checked={data.scrub?.injection !== false}
				onchange={(v) => patchScrub('injection', v ? undefined : false)}
			/>
			<FacetFieldLabel path="observability.scrub.injection" />
		</label>
		<label class="facet-check">
			<Checkbox
				checked={data.scrub?.canary !== false}
				onchange={(v) => patchScrub('canary', v ? undefined : false)}
			/>
			<FacetFieldLabel path="observability.scrub.canary" />
		</label>
	</div>
</div>

<label class="facet-field">
	<FacetFieldLabel path="observability.retainForDays" />
	<input
		class="field"
		min="1"
		oninput={(e) => {
			const raw = e.currentTarget.value.trim();
			patch({ retainForDays: raw === '' ? undefined : Number(raw) });
		}}
		placeholder="14 (default)"
		type="number"
		value={data.retainForDays ?? ''}
	>
</label>

<label class="facet-field">
	<FacetFieldLabel path="observability.rotateAfterMiB" />
	<input
		class="field"
		min="1"
		oninput={(e) => {
			const raw = e.currentTarget.value.trim();
			patch({ rotateAfterMiB: raw === '' ? undefined : Number(raw) });
		}}
		placeholder="32 (default)"
		type="number"
		value={data.rotateAfterMiB ?? ''}
	>
</label>
