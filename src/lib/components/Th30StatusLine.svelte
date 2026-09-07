<script lang="ts">
import type { StatusLineMode } from '$lib/th30/ui-context';

interface Props {
	mode: StatusLineMode;
	/** `nav` sits on the site nav bottom edge; `viewport` spans the top of the screen. */
	placement?: 'nav' | 'viewport';
}

let { mode, placement = 'viewport' }: Props = $props();
</script>

<div
	class="th30-status-line"
	class:th30-status-line--nav={placement === 'nav'}
	class:connecting={mode === 'connecting'}
	class:listening={mode === 'listening'}
	class:speaking={mode === 'speaking'}
	class:thinking={mode === 'thinking'}
	class:muted={mode === 'muted'}
	aria-hidden="true"
>
	{#if mode === 'thinking' || mode === 'connecting'}
		<span class="th30-status-segment"></span>
	{/if}
</div>

<style>
.th30-status-line {
	pointer-events: none;
	height: 2px;
	overflow: hidden;
	background: var(--color-ink);
}

.th30-status-line:not(.th30-status-line--nav) {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 70;
}

.th30-status-line--nav {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 2;
}

.th30-status-line.listening {
	background: repeating-linear-gradient(
		90deg,
		var(--color-ink) 0,
		var(--color-ink) 5px,
		transparent 5px,
		transparent 13px
	);
	background-size: 26px 100%;
	animation: th30-status-dash 1.4s linear infinite;
}

.th30-status-line.speaking {
	background: repeating-linear-gradient(
		90deg,
		var(--color-ink) 0,
		var(--color-ink) 7px,
		transparent 7px,
		transparent 11px
	);
	background-size: 22px 100%;
	animation: th30-status-dash 0.35s linear infinite;
}

.th30-status-line.muted {
	background: var(--color-ink);
	animation: none;
}

.th30-status-line.thinking,
.th30-status-line.connecting {
	background: transparent;
	animation: none;
}

.th30-status-segment {
	display: block;
	height: 100%;
	width: 28%;
	background: var(--color-ink);
	animation: th30-status-sweep 1.3s ease-in-out infinite;
}

@keyframes th30-status-dash {
	to {
		background-position: 26px 0;
	}
}

@keyframes th30-status-sweep {
	0% {
		transform: translateX(-120%);
	}
	100% {
		transform: translateX(420%);
	}
}
</style>
