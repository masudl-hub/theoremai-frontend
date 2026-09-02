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
	<FacetFieldLabel path="name" text="name" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ toolName: e.currentTarget.value })}
		placeholder="lookup_crm"
		value={data.toolName}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="type" text="type" />
	<input class="field" disabled readonly value="function">
</label>
<label class="facet-field">
	<FacetFieldLabel path="description" text="description" />
	<textarea
		class="field facet-textarea"
		oninput={(e) => patch({ description: e.currentTarget.value })}
		rows="2"
		value={data.description}
	></textarea>
</label>
<label class="facet-field">
	<FacetFieldLabel path="category" text="category" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ category: e.currentTarget.value })}
		value={data.category}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="access" text="access" />
	<Select
		onchange={(v) => patch({ access: v as ToolAccessValue })}
		options={TOOL_ACCESS_OPTIONS}
		value={data.access}
	/>
</label>
<label class="facet-field">
	<FacetFieldLabel path="permission" text="permission" />
	<Select
		onchange={(v) => patch({ permission: v as ToolPermissionValue })}
		options={TOOL_PERMISSION_OPTIONS}
		value={data.permission}
	/>
</label>
<label class="facet-field">
	<FacetFieldLabel path="loadTier" text="loadTier" />
	<Select
		onchange={(v) => patch({ loadTier: v as ToolLoadTier })}
		options={TOOL_LOAD_TIER_OPTIONS}
		value={data.loadTier}
	/>
</label>
<p class="facet-hint">
	T2 (<code>loadTier: "T2"</code>) stays off the wire until
	<code>profile.tools.t2Loader</code>
	returns <code>{'{ loaded: string[] }'}</code> — promotion lasts for that turn only.
</p>
<label class="facet-field">
	<FacetFieldLabel path="paths" text="paths" />
	<input
		class="field"
		autocomplete="off"
		oninput={(e) => patch({ paths: e.currentTarget.value })}
		placeholder="*"
		value={data.paths}
	>
</label>
<label class="facet-field">
	<FacetFieldLabel path="input" text="input (JSON Schema)" />
	<textarea
		class="field facet-textarea facet-code"
		oninput={(e) => patch({ inputJson: e.currentTarget.value })}
		rows="8"
		spellcheck="false"
		value={data.inputJson}
	></textarea>
</label>
<label class="facet-field">
	<FacetFieldLabel path="output" text="output (JSON Schema)" />
	<textarea
		class="field facet-textarea facet-code"
		oninput={(e) => patch({ outputJson: e.currentTarget.value })}
		rows="8"
		spellcheck="false"
		value={data.outputJson}
	></textarea>
</label>
<p class="facet-hint">
	Listed in <code>tools.allow</code> when compiled. Visibility follows
	<code>loadTier</code>
	(T0 / T1 / T2). Handler is a stub at runtime.
</p>
