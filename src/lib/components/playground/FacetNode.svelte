<script lang="ts">
import {
	IconAdjustments,
	IconBox,
	IconBroadcast,
	IconChevronDown,
	IconChevronRight,
	IconCpu,
	IconMessage,
	IconPaperclip,
	IconPhoto,
	IconShield,
	IconTools,
	IconVolume,
} from '@tabler/icons-svelte';
import type { ProfileGraphFacetId } from '@theoremai/agents/schema';
import { Handle, type NodeProps, Position } from '@xyflow/svelte';
import { getContext } from 'svelte';
import ToolSpecTypeIcon from '$lib/components/playground/icons/ToolSpecTypeIcon.svelte';
import { PLAYGROUND_CTX, type PlaygroundCtx } from '$lib/playground/context';
import { facetChips, facetTitle } from '$lib/playground/facet-ui';
import { spineFacetKinds } from '$lib/playground/graph-layout';
import type { IdentityData, PlaygroundNode } from '$lib/playground/types';

let { id, data }: NodeProps<PlaygroundNode> = $props();

const playground = getContext<PlaygroundCtx>(PLAYGROUND_CTX);

const kind = $derived(data.kind as ProfileGraphFacetId);
const isHub = $derived(kind === 'identity');
const isBranchHub = $derived(kind === 'models' || kind === 'tools');
const isActive = $derived(playground.ui.panelNodeId === id);

const title = $derived(facetTitle(data));

const identityData = $derived(
	playground.getNodes().find((n) => n.id === 'identity')?.data as IdentityData | undefined,
);
const spineIds = $derived(identityData ? spineFacetKinds(identityData) : []);

const branchCollapsed = $derived(
	isBranchHub && (data.kind === 'models' || data.kind === 'tools') && data.branchCollapsed,
);

const toolChildren = $derived(
	kind === 'tools'
		? playground
				.getNodes()
				.filter((n) => n.data.kind === 'toolSpec')
				.map((n) => (n.data.kind === 'toolSpec' ? n.data.toolName.trim() || '…' : ''))
				.filter(Boolean)
		: [],
);

const chips = $derived(facetChips(data, toolChildren));

const IconComponent = $derived.by(() => {
	switch (kind) {
		case 'identity': {
			const pt = (data as IdentityData).profileType;
			if (pt === 'live') return IconBroadcast;
			if (pt === 'speech') return IconVolume;
			if (pt === 'image') return IconPhoto;
			return IconMessage;
		}
		case 'models':
			return IconCpu;
		case 'modelBinding':
			return IconAdjustments;
		case 'tools':
			return IconTools;
		case 'toolSpec':
			return null;
		case 'inputs':
			return IconPaperclip;
		case 'outputs':
			return IconBox;
		case 'guardrails':
			return IconShield;
		case 'image':
			return IconPhoto;
		case 'speech':
			return IconVolume;
		case 'live':
			return IconBroadcast;
		default:
			return IconBox;
	}
});

function toggle() {
	playground.togglePanel(id, !isActive);
}

/** Enter and Space toggle the panel, as a click would. */
function onToggleKey(e: KeyboardEvent) {
	if (e.key !== 'Enter' && e.key !== ' ') return;
	e.preventDefault();
	toggle();
}

function toggleBranch(e: MouseEvent) {
	e.stopPropagation();
	playground.toggleBranchCollapsed(id);
}

let startX = 0;
let startY = 0;
let moved = false;

function onHeadPointerDown(e: PointerEvent) {
	startX = e.clientX;
	startY = e.clientY;
	moved = false;
}

function onHeadPointerMove(e: PointerEvent) {
	if (e.buttons) {
		const dx = Math.abs(e.clientX - startX);
		const dy = Math.abs(e.clientY - startY);
		if (dx > 3 || dy > 3) moved = true;
	}
}

function onHeadClick() {
	if (moved) return;
	toggle();
}

function onBranchAdd(e: MouseEvent) {
	e.stopPropagation();
	playground.addBranchSpec(id);
}
</script>

<div class="facet" class:facet-hub={isHub} class:facet-active={isActive}>
	{#if !isHub}
		<Handle
			id="in-left"
			class="facet-handle facet-handle--branch"
			position={Position.Left}
			type="target"
		/>
	{/if}

	<div
		class="facet-head"
		aria-expanded={isActive}
		onclick={onHeadClick}
		onkeydown={onToggleKey}
		onpointerdown={onHeadPointerDown}
		onpointermove={onHeadPointerMove}
		role="button"
		tabindex="0"
	>
		<div class="facet-head__label">
			{#if kind === 'toolSpec' && data.kind === 'toolSpec'}
				<ToolSpecTypeIcon toolType={data.toolType} size={14} class="facet-head__icon" />
			{:else if IconComponent}
				<IconComponent size={14} stroke={1.75} class="facet-head__icon" />
			{/if}
			<span class="facet-head__title">{title}</span>
		</div>
		<div class="facet-head__actions">
			{#if isBranchHub}
				<button
					class="facet-branch-toggle nodrag"
					type="button"
					aria-label={branchCollapsed ? 'Expand branch' : 'Collapse branch'}
					aria-expanded={!branchCollapsed}
					onclick={toggleBranch}
				>
					{#if branchCollapsed}
						<IconChevronRight size={14} stroke={1.75} aria-hidden="true" />
					{:else}
						<IconChevronDown size={14} stroke={1.75} aria-hidden="true" />
					{/if}
				</button>
			{/if}
			{#if isActive}
				<span class="facet-head__dot" aria-hidden="true"></span>
			{/if}
		</div>
	</div>

	{#if chips.length}
		<div
			class="facet-chips nodrag"
			onclick={toggle}
			onkeydown={onToggleKey}
			role="button"
			tabindex="0"
		>
			{#each chips as chip, idx (chip + String(idx))}
				<span class="facet-chip" class:facet-chip--meta={chip.startsWith('+')}>{chip}</span>
			{/each}
		</div>
	{/if}

	{#if isHub && spineIds.length > 0}
		<Handle
			id="out"
			class="facet-handle facet-handle--spine"
			position={Position.Bottom}
			type="source"
		/>
	{/if}
	{#if isBranchHub}
		<div class="facet-branch-port nodrag nopan">
			<button
				type="button"
				class="facet-branch-add"
				aria-label={kind === 'models' ? 'Add model' : 'Add tool'}
				onclick={onBranchAdd}
			></button>
			{#if !branchCollapsed}
				<Handle
					id="branch"
					class="facet-handle facet-handle--branch facet-handle--branch-source"
					position={Position.Right}
					type="source"
				/>
			{/if}
		</div>
	{/if}
</div>
