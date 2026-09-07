<script lang="ts">
import { IconChevronDown } from '@tabler/icons-svelte';
import { on } from 'svelte/events';
import {
	type ComposerProfileInterface,
	defaultInterfaceEffort,
	defaultInterfaceModel,
	effortSelectEnabled,
	generationSelectEnabled,
	interfaceEffortOptions,
	interfaceModelOptions,
	modelSelectEnabled,
} from 'theorum/interface';

let {
	iface,
	selectedModel = '',
	selectedEffort = '',
	disabled = false,
	onGenerationChange,
}: {
	iface: ComposerProfileInterface;
	selectedModel?: string;
	selectedEffort?: string;
	disabled?: boolean;
	onGenerationChange?: (next: { modelId: string; effort?: string }) => void;
} = $props();

let open = $state(false);
let rootEl = $state<HTMLDivElement | undefined>(undefined);

const modelId = $derived(selectedModel || defaultInterfaceModel(iface) || '');
const modelOptions = $derived(interfaceModelOptions(iface));
const effortOptions = $derived(interfaceEffortOptions(iface, modelId));
const showModels = $derived(modelSelectEnabled(iface));
const showEfforts = $derived(effortSelectEnabled(iface, modelId));
const visible = $derived(generationSelectEnabled(iface, modelId));

const effortValue = $derived(
	selectedEffort || defaultInterfaceEffort(iface, modelId) || effortOptions[0]?.alias || '',
);

const triggerLabel = $derived.by(() => {
	if (!modelId) return 'model';
	if (showEfforts && effortValue) return `${modelId} · ${effortValue}`;
	return modelId;
});

$effect(() => {
	if (!open) return;
	const onKey = (event: KeyboardEvent) => {
		if (event.key === 'Escape') open = false;
	};
	const onDocPointer = (event: PointerEvent) => {
		if (!rootEl) return;
		if (event.target instanceof Node && rootEl.contains(event.target)) return;
		open = false;
	};
	const offKey = on(document, 'keydown', onKey);
	const offPointer = on(document, 'pointerdown', onDocPointer, { capture: true });
	return () => {
		offKey();
		offPointer();
	};
});

function pickModel(nextModelId: string) {
	const nextEffort = defaultInterfaceEffort(iface, nextModelId);
	onGenerationChange?.({
		modelId: nextModelId,
		...(nextEffort ? { effort: nextEffort } : {}),
	});
}

function pickEffort(nextEffort: string) {
	if (!modelId) return;
	onGenerationChange?.({ modelId, effort: nextEffort });
}
</script>

{#if visible}
	<div bind:this={rootEl} class="iface-gen">
		<button
			class="iface-gen__trigger"
			aria-expanded={open}
			aria-haspopup="dialog"
			{disabled}
			onclick={() => {
				if (!disabled) open = !open;
			}}
			type="button"
		>
			<span class="iface-gen__trigger-label">{triggerLabel}</span>
			<IconChevronDown size={10} stroke={1.75} aria-hidden="true" />
		</button>

		{#if open}
			<button
				class="iface-gen__backdrop"
				aria-hidden="true"
				onclick={() => {
					open = false;
				}}
				tabindex="-1"
				type="button"
			></button>
			<div
				class="iface-gen__menu"
				class:iface-gen__menu--dual={showModels && showEfforts}
				role="dialog"
				aria-label="Generation settings"
			>
				{#if showModels}
					<div class="iface-gen__pane">
						<div class="iface-gen__pane-head">Model</div>
						<ul class="iface-gen__list" role="listbox" aria-label="Model">
							{#each modelOptions as option (option.id)}
								<li role="presentation">
									<button
										class="iface-gen__option"
										class:iface-gen__option--on={option.id === modelId}
										aria-selected={option.id === modelId}
										onclick={() => pickModel(option.id)}
										role="option"
										type="button"
									>
										<span class="iface-gen__option-id">{option.id}</span>
										{#if option.label !== option.id}
											<span class="iface-gen__option-meta">{option.label}</span>
										{/if}
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if showEfforts}
					<div class="iface-gen__pane">
						<div class="iface-gen__pane-head">Effort</div>
						<ul class="iface-gen__list" role="listbox" aria-label="Effort">
							{#each effortOptions as option (option.alias)}
								<li role="presentation">
									<button
										class="iface-gen__option"
										class:iface-gen__option--on={option.alias === effortValue}
										aria-selected={option.alias === effortValue}
										onclick={() => pickEffort(option.alias)}
										role="option"
										type="button"
									>
										<span class="iface-gen__option-id">{option.alias}</span>
										<span class="iface-gen__option-meta">{option.level}</span>
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{:else if !showModels}
					<p class="iface-gen__empty">No generation options.</p>
				{/if}
			</div>
		{/if}
	</div>
{/if}
