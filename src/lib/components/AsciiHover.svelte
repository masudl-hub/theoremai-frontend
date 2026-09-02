<script lang="ts">
import type { Snippet } from 'svelte';
import { computeTipPosition, computeTipPositionForRect } from '$lib/ascii/tip-card';

let {
	children,
	class: className = '',
	selector,
	onResolveTip,
	variant = 'schema',
}: {
	children: Snippet;
	class?: string;
	selector: string;
	onResolveTip: (_el: HTMLElement) => string | null;
	/** `schema` — dashed map keys (Use, code). `label` — quiet field titles (Playground). */
	variant?: 'schema' | 'label';
} = $props();

let tip = $state<string | null>(null);
let tipX = $state(0);
let tipY = $state(0);
let visible = $state(false);
let activeEl = $state<HTMLElement | null>(null);
let tipEl = $state<HTMLElement | null>(null);
let lastPointer = $state<{ clientX: number; clientY: number } | null>(null);
let focusedRect = $state<DOMRect | null>(null);

function targetEl(e: Event): HTMLElement | null {
	const el = e.target;
	if (!(el instanceof Element)) return null;
	return el.closest(selector) as HTMLElement | null;
}

function estimateDimensions(text: string) {
	const lines = text.split('\n');
	const maxLen = Math.max(...lines.map((l) => l.length), 40);
	// In monospace: ~7.5px per char on mobile (11px), ~8.2px on desktop (12px)
	const charW = typeof window !== 'undefined' && window.innerWidth >= 768 ? 8.2 : 7.5;
	const lineH = typeof window !== 'undefined' && window.innerWidth >= 768 ? 16.8 : 15.2;
	return {
		w: Math.min(maxLen * charW + 24, typeof window !== 'undefined' ? window.innerWidth - 24 : 400),
		h: Math.min(
			lines.length * lineH + 16,
			typeof window !== 'undefined' ? window.innerHeight - 24 : 300,
		),
	};
}

function updatePointerPosition(clientX: number, clientY: number) {
	lastPointer = { clientX, clientY };
	focusedRect = null;
	const rect = tipEl?.getBoundingClientRect();
	const est = tip ? estimateDimensions(tip) : { w: 380, h: 200 };
	const w = rect?.width || est.w;
	const h = rect?.height || est.h;
	const pos = computeTipPosition(clientX, clientY, w, h);
	tipX = pos.x;
	tipY = pos.y;
}

function showFrom(el: HTMLElement, e: MouseEvent) {
	const art = onResolveTip(el);
	if (!art) return;
	activeEl = el;
	tip = art;
	visible = true;
	updatePointerPosition(e.clientX, e.clientY);
}

$effect(() => {
	if (visible && tip && tipEl) {
		const rect = tipEl.getBoundingClientRect();
		if (focusedRect) {
			const pos = computeTipPositionForRect(focusedRect, rect.width, rect.height);
			tipX = pos.x;
			tipY = pos.y;
		} else if (lastPointer) {
			const pos = computeTipPosition(
				lastPointer.clientX,
				lastPointer.clientY,
				rect.width,
				rect.height,
			);
			tipX = pos.x;
			tipY = pos.y;
		}
	}
});

$effect(() => {
	if (!tipEl || !visible) return;
	tipEl.style.left = `${tipX}px`;
	tipEl.style.top = `${tipY}px`;
});

function onEnter(e: MouseEvent) {
	const el = targetEl(e);
	if (!el) return;
	showFrom(el, e);
}

function onMove(e: MouseEvent) {
	const el = targetEl(e);
	if (!el) {
		activeEl = null;
		visible = false;
		tip = null;
		lastPointer = null;
		return;
	}
	if (!visible || el !== activeEl) {
		showFrom(el, e);
		return;
	}
	updatePointerPosition(e.clientX, e.clientY);
}

function onLeave(e: MouseEvent) {
	const related = e.relatedTarget;
	if (related instanceof Element && related.closest(selector)) return;
	activeEl = null;
	visible = false;
	tip = null;
	lastPointer = null;
	focusedRect = null;
}

function onFocusIn(e: FocusEvent) {
	const el = targetEl(e);
	if (!el) return;
	const art = onResolveTip(el);
	if (!art) return;
	activeEl = el;
	tip = art;
	visible = true;
	lastPointer = null;
	const rect = el.getBoundingClientRect();
	focusedRect = rect;
	const tipRect = tipEl?.getBoundingClientRect();
	const est = estimateDimensions(art);
	const w = tipRect?.width || est.w;
	const h = tipRect?.height || est.h;
	const pos = computeTipPositionForRect(rect, w, h);
	tipX = pos.x;
	tipY = pos.y;
}

function onFocusOut(e: FocusEvent) {
	const related = e.relatedTarget;
	if (related instanceof Node && (e.currentTarget as HTMLElement).contains(related)) return;
	activeEl = null;
	visible = false;
	tip = null;
	lastPointer = null;
	focusedRect = null;
}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="ascii-hover-host {className}"
	data-hover-variant={variant}
	onfocusin={onFocusIn}
	onfocusout={onFocusOut}
	onmousemove={onMove}
	onmouseout={onLeave}
	onmouseover={onEnter}
>
	{@render children()}
	{#if visible && tip}
		<pre
			bind:this={tipEl}
			class="ascii map-tip pointer-events-none font-bold"
			role="tooltip"
		>{tip}</pre>
	{/if}
</div>

<style>
:global(.ascii-hover-host[data-hover-variant="schema"] .node) {
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

:global(.ascii-hover-host[data-hover-variant="schema"] .node:hover),
:global(.ascii-hover-host[data-hover-variant="schema"] .node:focus-visible) {
	background: #000;
	color: #fff;
	border-bottom-style: solid;
	outline: none;
}

:global(.ascii-hover-host[data-hover-variant="label"] .type-label) {
	display: block;
	width: 100%;
	text-align: left;
	font: inherit;
	font-size: 0.68rem;
	font-weight: 800;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--color-mute);
	background: transparent;
	border: none;
	padding: 0;
	margin: 0;
	cursor: help;
	transition:
		color 0.1s ease,
		background-color 0.1s ease;
}

:global(.ascii-hover-host[data-hover-variant="label"] .type-label:hover),
:global(.ascii-hover-host[data-hover-variant="label"] .type-label:focus-visible) {
	background: rgba(0, 0, 0, 0.04);
	color: #000;
	outline: none;
}

:global(.map-tip) {
	position: fixed;
	z-index: 9999;
	margin: 0;
	max-height: calc(100dvh - 24px);
	max-width: calc(100vw - 24px);
	overflow: auto;
	background: var(--color-paper);
	color: #000;
	font-size: 11px;
	line-height: 1.38;
	white-space: pre;
}

@media (min-width: 768px) {
	:global(.map-tip) {
		font-size: 12px;
	}
}
</style>
