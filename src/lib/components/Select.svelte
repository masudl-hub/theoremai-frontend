<script lang="ts">
import { on } from 'svelte/events';

type Option = { value: string; label: string };

let {
	value,
	options,
	onchange,
	disabled = false,
	id: inputId = undefined,
}: {
	value: string;
	options: readonly Option[] | Option[];
	onchange: (_value: string) => void;
	disabled?: boolean;
	id?: string;
} = $props();

let open = $state(false);
let rootEl: HTMLDivElement | undefined = $state();

const selected = $derived(options.find((o) => o.value === value) ?? null);

function pick(next: string) {
	onchange(next);
	open = false;
}

function onDocPointer(e: PointerEvent) {
	if (!open || !rootEl) return;
	if (e.target instanceof Node && rootEl.contains(e.target)) return;
	open = false;
}

$effect(() => {
	if (!open) return;
	const onKey = (e: KeyboardEvent) => {
		if (e.key === 'Escape') open = false;
	};
	const offPointer = on(document, 'pointerdown', onDocPointer, { capture: true });
	const offKey = on(document, 'keydown', onKey);
	return () => {
		offPointer();
		offKey();
	};
});
</script>

<div bind:this={rootEl} class="select nodrag nowheel" class:select-open={open}>
	<button
		id={inputId}
		class="select-trigger field"
		aria-expanded={open}
		aria-haspopup="listbox"
		{disabled}
		onclick={() => {
			if (!disabled) open = !open;
		}}
		type="button"
	>
		<span class="select-value">{selected?.label ?? value}</span>
		<span class="select-caret" aria-hidden="true">{open ? '▴' : '▾'}</span>
	</button>

	{#if open}
		<ul class="select-menu">
			{#each options as opt (opt.value)}
				<li role="presentation">
					<button
						class="select-option"
						class:select-option-on={opt.value === value}
						aria-selected={opt.value === value}
						onclick={() => pick(opt.value)}
						role="option"
						type="button"
					>
						{opt.label}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
.select {
	position: relative;
	width: 100%;
}

.select-trigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	width: 100%;
	text-align: left;
	cursor: pointer;
	font: inherit;
	font-size: 0.8rem;
	font-weight: 700;
}

.select-trigger:focus,
.select-trigger:focus-visible {
	background: transparent;
	color: inherit;
	outline: 1.5px solid #000;
	outline-offset: 0;
}

.select-trigger:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

.select-value {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.select-caret {
	flex-shrink: 0;
	opacity: 0.55;
	font-size: 0.7rem;
}

.select-menu {
	position: absolute;
	z-index: 40;
	top: calc(100% - 1.5px);
	left: 0;
	right: 0;
	margin: 0;
	padding: 0;
	list-style: none;
	border: 1.5px solid #000;
	background: var(--color-paper);
	max-height: 12rem;
	overflow-y: auto;
}

.select-option {
	display: block;
	width: 100%;
	border: 0;
	border-bottom: 1px solid #000;
	background: transparent;
	padding: 0.55rem 0.75rem;
	font: inherit;
	font-size: 0.75rem;
	font-weight: 700;
	text-align: left;
	cursor: pointer;
	color: #000;
}

.select-option:last-child {
	border-bottom: 0;
}

.select-option:hover {
	background: rgba(0, 0, 0, 0.04);
}

.select-option-on {
	background: rgba(0, 0, 0, 0.06);
	font-weight: 800;
}

.select-option:focus-visible {
	outline: 1.5px solid #000;
	outline-offset: -1.5px;
	background: rgba(0, 0, 0, 0.04);
}
</style>
