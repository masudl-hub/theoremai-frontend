<script lang="ts">
	import type { Snippet } from 'svelte';
	import { placeTip } from '$lib/ascii/tip-card';

	let {
		children,
		class: className = '',
		selector,
		resolveTip,
		variant = 'schema'
	}: {
		children: Snippet;
		class?: string;
		selector: string;
		resolveTip: (el: HTMLElement) => string | null;
		/** `schema` — dashed map keys (Use, code). `label` — quiet field titles (Playground). */
		variant?: 'schema' | 'label';
	} = $props();

	let tip = $state<string | null>(null);
	let tipX = $state(0);
	let tipY = $state(0);
	let visible = $state(false);

	function targetEl(e: Event): HTMLElement | null {
		const el = e.target;
		if (!(el instanceof Element)) return null;
		return el.closest(selector) as HTMLElement | null;
	}

	function moveTip(e: MouseEvent) {
		const pos = placeTip(e);
		tipX = pos.x;
		tipY = pos.y;
	}

	function showFrom(el: HTMLElement, e: MouseEvent) {
		const art = resolveTip(el);
		if (!art) return;
		tip = art;
		visible = true;
		moveTip(e);
	}

	function onEnter(e: MouseEvent) {
		const el = targetEl(e);
		if (!el) return;
		showFrom(el, e);
	}

	function onMove(e: MouseEvent) {
		const el = targetEl(e);
		if (!el) {
			visible = false;
			tip = null;
			return;
		}
		if (!visible) {
			showFrom(el, e);
			return;
		}
		moveTip(e);
	}

	function onLeave(e: MouseEvent) {
		const related = e.relatedTarget;
		if (related instanceof Element && related.closest(selector)) return;
		visible = false;
		tip = null;
	}

	function onFocusIn(e: FocusEvent) {
		const el = targetEl(e);
		if (!el) return;
		const art = resolveTip(el);
		if (!art) return;
		tip = art;
		visible = true;
		const rect = el.getBoundingClientRect();
		tipX = rect.left;
		tipY = rect.top;
	}

	function onFocusOut(e: FocusEvent) {
		const related = e.relatedTarget;
		if (related instanceof Node && (e.currentTarget as HTMLElement).contains(related)) return;
		visible = false;
		tip = null;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="ascii-hover-host {className}"
	data-hover-variant={variant}
	onmouseover={onEnter}
	onmousemove={onMove}
	onmouseout={onLeave}
	onfocusin={onFocusIn}
	onfocusout={onFocusOut}
>
	{@render children()}
	{#if visible && tip}
		<pre
			class="ascii map-tip pointer-events-none font-bold"
			style="left: {tipX}px; top: {tipY}px;"
			role="tooltip"
		>{tip}</pre>
	{/if}
</div>

<style>
	:global(.ascii-hover-host[data-hover-variant='schema'] .node) {
		display: inline;
		font: inherit;
		font-weight: inherit;
		background: transparent;
		border: none;
		border-bottom: 1px dashed #000;
		padding: 0;
		margin: 0;
		cursor: crosshair;
		color: inherit;
		transition:
			background-color 0.1s ease,
			color 0.1s ease,
			border-color 0.1s ease;
	}

	:global(.ascii-hover-host[data-hover-variant='schema'] .node:hover),
	:global(.ascii-hover-host[data-hover-variant='schema'] .node:focus-visible) {
		background: #000;
		color: #fff;
		border-bottom-style: solid;
		outline: none;
	}

	:global(.ascii-hover-host[data-hover-variant='label'] .type-label) {
		display: block;
		width: 100%;
		text-align: left;
		font: inherit;
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-mute);
		background: transparent;
		border: none;
		padding: 0;
		margin: 0;
		cursor: help;
		transition: color 0.1s ease, background-color 0.1s ease;
	}

	:global(.ascii-hover-host[data-hover-variant='label'] .type-label:hover),
	:global(.ascii-hover-host[data-hover-variant='label'] .type-label:focus-visible) {
		background: rgba(0, 0, 0, 0.04);
		color: var(--color-mute);
		outline: none;
	}

	:global(.map-tip) {
		position: fixed;
		z-index: 9999;
		margin: 0;
		max-height: 60vh;
		overflow: auto;
		background: var(--color-paper);
		color: #000;
		font-size: 10px;
		line-height: 1.35;
		white-space: pre;
		transform: translateY(calc(-100% - 8px));
	}

	@media (min-width: 768px) {
		:global(.map-tip) {
			font-size: 11px;
		}
	}
</style>
