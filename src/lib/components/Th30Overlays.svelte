<script lang="ts">
interface Props {
	navFrameActive: boolean;
	showBye: boolean;
	activeActionLabel: string | null;
}

let { navFrameActive, showBye, activeActionLabel }: Props = $props();
</script>

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
