<script lang="ts">
import {
	type AsciiCardSegment,
	parseAsciiCardSegments,
	renderAsciiCard,
} from '$lib/ascii/tip-card';

let {
	open = false,
	onAccept,
	onDecline,
}: {
	open?: boolean;
	onAccept?: () => void;
	onDecline?: () => void;
} = $props();

const cardArt = renderAsciiCard({
	title: 'BEFORE YOU TALK TO Th30',
	body: 'Th30 uses Google’s free Gemini Live endpoint. Audio and text you share on this session may be used by Google to improve their models.',
	inner: 52,
	actions: [
		{ id: 'cancel', label: 'cancel' },
		{ id: 'accept', label: 'accept' },
	],
});

const segments: AsciiCardSegment[] = parseAsciiCardSegments(cardArt);

function onAction(id: string) {
	if (id === 'accept') onAccept?.();
	else if (id === 'cancel') onDecline?.();
}
</script>

{#if open}
	<div class="th30-consent-root" role="presentation">
		<button
			type="button"
			class="th30-consent-backdrop"
			aria-label="Dismiss consent dialog"
			onclick={() => onDecline?.()}
		></button>
		<div
			class="th30-consent-panel"
			role="dialog"
			aria-modal="true"
			aria-label="Before you talk to Th30"
		>
			<pre
				class="ascii th30-consent-card text-xs font-bold"
			>{#each segments as segment, i (i)}{#if segment.type === 'text'}{segment.value}{:else}<button
						type="button"
						class="ascii-card-action"
						onclick={() => onAction(segment.id)}
					>[ {segment.label} ]</button
					>{/if}{/each}</pre>
		</div>
	</div>
{/if}

<style>
.th30-consent-root {
	position: fixed;
	inset: 0;
	z-index: 70;
	display: grid;
	place-items: center;
	padding: 1.25rem;
}

.th30-consent-backdrop {
	position: absolute;
	inset: 0;
	border: 0;
	background: transparent;
	cursor: pointer;
}

.th30-consent-panel {
	position: relative;
	z-index: 1;
}

/* Same surface as AsciiHover map-tip / pillar cards. */
.th30-consent-card {
	position: static;
	z-index: auto;
	max-height: calc(100dvh - 24px);
	max-width: calc(100vw - 24px);
	overflow: auto;
	margin: 0;
	background: var(--color-paper);
	color: var(--color-ink);
	line-height: 1.38;
	white-space: pre;
}

.ascii-card-action {
	display: inline;
	font: inherit;
	font-weight: inherit;
	background: transparent;
	border: none;
	padding: 0;
	margin: 0;
	color: inherit;
	cursor: pointer;
}

.ascii-card-action:hover,
.ascii-card-action:focus-visible {
	background: var(--color-ink);
	color: var(--color-paper-bright);
	outline: none;
}
</style>
