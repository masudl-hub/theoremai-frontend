<script lang="ts">
type StatusLineMode = 'connecting' | 'listening' | 'speaking' | 'thinking' | 'muted';

interface Props {
	statusLineMode: StatusLineMode | null;
	navFrameActive: boolean;
	showBye: boolean;
	activeActionLabel: string | null;
}

let { statusLineMode, navFrameActive, showBye, activeActionLabel }: Props = $props();
</script>

{#if statusLineMode}
	<div
		class="th30-status-line"
		class:connecting={statusLineMode === 'connecting'}
		class:listening={statusLineMode === 'listening'}
		class:speaking={statusLineMode === 'speaking'}
		class:thinking={statusLineMode === 'thinking'}
		class:muted={statusLineMode === 'muted'}
		aria-hidden="true"
	>
		{#if statusLineMode === 'thinking' || statusLineMode === 'connecting'}
			<span class="th30-status-segment"></span>
		{/if}
	</div>
{/if}

{#if navFrameActive}
	<div class="th30-nav-frame" aria-hidden="true"></div>
{/if}

{#if showBye}
	<div class="th30-bye" role="status" aria-live="polite">Bye bye.</div>
{/if}

{#if activeActionLabel}
	<div class="th30-action-pill text-xs" role="status" aria-live="polite">
		{activeActionLabel}
	</div>
{/if}

<style>
/* Top status line — orchidcare developer loader idiom, state-driven. */
.th30-status-line {
	pointer-events: none;
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	height: 2px;
	z-index: 70;
	overflow: hidden;
	background: var(--color-ink);
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

.th30-nav-frame {
	pointer-events: none;
	position: fixed;
	inset: 0;
	z-index: 45;
	border: 2px solid var(--color-ink);
	animation: th30-nav-frame-out 1.2s ease both;
}

@keyframes th30-nav-frame-out {
	0% {
		opacity: 1;
	}
	70% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}

.th30-bye {
	position: fixed;
	left: 50%;
	top: 42%;
	z-index: 80;
	transform: translate(-50%, -50%);
	font-family: var(--font-mono);
	font-size: 0.95rem;
	font-weight: 500;
	letter-spacing: 0.02em;
	color: var(--color-ink);
	background: transparent;
	border: none;
	padding: 0;
	animation: th30-bye-fade 1.6s ease both;
	pointer-events: none;
}

:global(.code-line.th30-line-selected) {
	background: rgba(255, 230, 0, 0.35);
	border-left-color: var(--color-ink);
	box-shadow:
		inset 0 0 0 1px rgba(0, 0, 0, 0.4),
		0 0 14px rgba(255, 215, 0, 0.55);
	animation: th30-line-glow 1.6s ease-in-out infinite alternate;
}

@keyframes th30-line-glow {
	0% {
		background: rgba(255, 230, 0, 0.25);
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.3),
			0 0 8px rgba(255, 215, 0, 0.4);
	}
	100% {
		background: rgba(255, 230, 0, 0.55);
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.7),
			0 0 20px rgba(255, 210, 0, 0.85);
	}
}

@keyframes th30-bye-fade {
	0% {
		opacity: 0;
		transform: translate(-50%, -46%);
	}
	15%,
	70% {
		opacity: 1;
		transform: translate(-50%, -50%);
	}
	100% {
		opacity: 0;
		transform: translate(-50%, -54%);
	}
}
</style>
