<script lang="ts">
import type { ToolLoadTier } from 'theorum/schema';
import Select from '$lib/components/Select.svelte';
import {
	TOOL_ACCESS_OPTIONS,
	TOOL_LOAD_TIER_OPTIONS,
	TOOL_PERMISSION_OPTIONS,
} from '$lib/playground/compat';
import type { ToolAccessValue, ToolPermissionValue, ToolSpecData } from '$lib/playground/types';
import FacetFieldLabel from './FacetFieldLabel.svelte';
import type { FacetPatch } from './types';

let { data, patch }: { data: ToolSpecData; patch: FacetPatch } = $props();
</script>

<label class="facet-field">
	<FacetFieldLabel path="name" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ toolName: e.currentTarget.value })}
		placeholder="lookup_crm"
		value={data.toolName}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="type" />
	<input class="field" disabled readonly value="function">
</label>
<label class="facet-field">
	<FacetFieldLabel path="description" />
	<textarea
		class="field facet-textarea"
		oninput={(e) => patch({ description: e.currentTarget.value })}
		rows="2"
		value={data.description}
	></textarea>
</label>
<label class="facet-field">
	<FacetFieldLabel path="category" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ category: e.currentTarget.value })}
		value={data.category}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="access" />
	<Select
		onchange={(v) => patch({ access: v as ToolAccessValue })}
		options={TOOL_ACCESS_OPTIONS}
		value={data.access}
	/>
</label>
<label class="facet-field">
	<FacetFieldLabel path="permission" />
	<Select
		onchange={(v) => patch({ permission: v as ToolPermissionValue })}
		options={TOOL_PERMISSION_OPTIONS}
		value={data.permission}
	/>
</label>
<label class="facet-field">
	<FacetFieldLabel path="loadTier" />
	<Select
		onchange={(v) => patch({ loadTier: v as ToolLoadTier })}
		options={TOOL_LOAD_TIER_OPTIONS}
		value={data.loadTier}
	/>
</label>
<label class="facet-field">
	<FacetFieldLabel path="paths" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ paths: e.currentTarget.value })}
		placeholder="*"
		value={data.paths}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="input" />
	<textarea
		class="field facet-textarea facet-code"
		oninput={(e) => patch({ inputJson: e.currentTarget.value })}
		rows="8"
		spellcheck="false"
		value={data.inputJson}
	></textarea>
</label>
<label class="facet-field">
	<FacetFieldLabel path="output" />
	<textarea
		class="field facet-textarea facet-code"
		oninput={(e) => patch({ outputJson: e.currentTarget.value })}
		rows="8"
		spellcheck="false"
		value={data.outputJson}
	></textarea>
</label>
