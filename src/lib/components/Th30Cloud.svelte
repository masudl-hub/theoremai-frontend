<script lang="ts">
import { onMount } from 'svelte';
import { CUMULUS, thunderStipple } from '$lib/data/clouds';
import type { Th30Caption, Th30CloudState } from '$lib/types/th30';

let {
	mode = 'idle',
	muted = false,
	caption = 'none',
	onActivate,
	onMute,
	onDisconnect,
}: {
	mode?: Th30CloudState;
	muted?: boolean;
	caption?: Th30Caption;
	onActivate?: () => void;
	onMute?: () => void;
	onDisconnect?: () => void;
} = $props();

const RAW_TEMPLATE = CUMULUS.split('\n');
const STIPPLE_ROWS = thunderStipple.split('\n');
const CLOUD_WIDTH = Math.max(...RAW_TEMPLATE.map((l) => l.length));

const INTERIOR_DUST = new Set(['.', ':']);

let tick = $state(0);
let renderedAscii = $state(CUMULUS);
let stippleAscii = $state('');
let hovering = $state(false);

/** Hover thunder is idle-only — never during a call. */
const thundering = $derived(hovering && mode === 'idle');

function renderCloud() {
	if (!thundering) {
		renderedAscii = CUMULUS;
		return;
	}

	const lines = RAW_TEMPLATE.map((line, r) =>
		[...line]
			.map((char, c) => {
				if (!INTERIOR_DUST.has(char)) return char;
				const n = Math.sin(tick * 8 + c * 1.7 + r * 2.1) * Math.cos(tick * 5 + r * 0.9);
				return n > 0 ? ':' : '.';
			})
			.join(''),
	);

	renderedAscii = lines.join('\n');
}

function renderStipple() {
	if (!thundering) {
		stippleAscii = '';
		return;
	}

	const rowOff = Math.floor(tick * 2.2) % STIPPLE_ROWS.length;
	const visibleRows = Math.min(6, STIPPLE_ROWS.length);
	const lines: string[] = [];

	for (let r = 0; r < visibleRows; r++) {
		const srcIdx = (r - rowOff + STIPPLE_ROWS.length * 8) % STIPPLE_ROWS.length;
		const src = STIPPLE_ROWS[srcIdx] ?? '';
		let line = '';
		for (let c = 0; c < CLOUD_WIDTH; c++) {
			const ch = src[c % src.length] ?? ' ';
			line += ch === '.' ? '.' : ' ';
		}
		lines.push(line);
	}

	stippleAscii = lines.join('\n');
}

const shownCaption = $derived.by((): Th30Caption => {
	if (
		caption === 'live' ||
		caption === 'requesting' ||
		caption === 'denied' ||
		caption === 'connecting'
	)
		return caption;
	if (caption === 'hover' || (caption === 'none' && hovering && mode === 'idle')) return 'hover';
	return 'none';
});

onMount(() => {
	let frameId = 0;

	const loop = () => {
		if (thundering) {
			tick += 0.09;
			renderCloud();
			renderStipple();
		} else if (stippleAscii) {
			stippleAscii = '';
			renderedAscii = CUMULUS;
		}
		frameId = requestAnimationFrame(loop);
	};
	frameId = requestAnimationFrame(loop);

	return () => cancelAnimationFrame(frameId);
});

$effect(() => {
	void mode;
	void thundering;
	renderCloud();
	renderStipple();
});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="th30-cloud-wrap"
	class:thundering
	onmouseenter={() => (hovering = true)}
	onmouseleave={() => (hovering = false)}
>
	<button
		type="button"
		class="th30-fab"
		class:muted
		aria-label={caption === 'live' ? 'Th30 voice agent active' : 'Start Th30 voice agent'}
		onclick={() => onActivate?.()}
	>
		<pre class="ascii-layer" aria-hidden="true">{renderedAscii}</pre>
	</button>

	{#if stippleAscii}
		<pre class="th30-stipple" aria-hidden="true">{stippleAscii}</pre>
	{/if}

	<div class="th30-caption" aria-live="polite">
		{#if shownCaption === 'live'}
			<button
				type="button"
				class="node th30-node"
				onclick={(e) => {
					e.stopPropagation();
					onDisconnect?.();
				}}
			>
				[end call]
			</button>
			<button
				type="button"
				class="node th30-node"
				onclick={(e) => {
					e.stopPropagation();
					onMute?.();
				}}
			>
				{muted ? '[unmute call]' : '[mute call]'}
			</button>
		{:else if shownCaption === 'requesting'}
			Requesting permission...
		{:else if shownCaption === 'connecting'}
			Connecting...
		{:else if shownCaption === 'denied'}
			Permission denied...
		{:else if shownCaption === 'hover'}
			connect with Th30
		{/if}
	</div>
</div>

<style>
.th30-cloud-wrap {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	width: fit-content;
	gap: 0;
}

.th30-caption {
	position: absolute;
	top: calc(100% + 0.35rem);
	bottom: auto;
	right: 0;
	min-height: 1em;
	font-family: var(--font-mono);
	font-size: 10px;
	font-weight: 500;
	line-height: 1.35;
	letter-spacing: 0.01em;
	color: var(--color-ink);
	text-align: right;
	user-select: none;
	white-space: nowrap;
	pointer-events: none;
	z-index: 3;
}

.th30-caption .th30-node {
	pointer-events: auto;
}

.th30-fab {
	position: relative;
	background: transparent;
	border: none;
	padding: 0;
	cursor: pointer;
	font-family: var(--font-mono);
	font-size: 3.5px;
	line-height: 1.05;
	letter-spacing: 0;
	user-select: none;
	color: var(--color-ink);
	transition: transform 0.15s ease;
	z-index: 2;
}

.th30-stipple {
	position: absolute;
	top: calc(100% + 0.1rem);
	right: 0;
	z-index: 1;
	margin: 0;
	padding: 0;
	font-family: var(--font-mono);
	font-size: 3.5px;
	font-weight: 400;
	line-height: 2.2;
	letter-spacing: 0;
	white-space: pre;
	color: var(--color-ink);
	opacity: 0.14;
	pointer-events: none;
	user-select: none;
}

@media (min-width: 768px) {
	.th30-fab {
		font-size: 4px;
	}

	.th30-stipple {
		font-size: 4px;
		line-height: 2.4;
		opacity: 0.12;
	}

	.th30-caption {
		font-size: 11px;
	}
}

.th30-fab:hover {
	transform: scale(1.06);
}

.th30-fab:active {
	transform: scale(0.97);
}

.th30-fab.muted {
	opacity: 0.45;
}

.ascii-layer {
	margin: 0;
	white-space: pre;
	font-weight: 700;
	color: var(--color-ink);
}
</style>
