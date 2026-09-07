<script lang="ts">
import AsciiCardSegments from '$lib/ascii/AsciiCardSegments.svelte';
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
	<div class="ascii-modal-root th30-consent-root" role="presentation">
		<button
			type="button"
			class="ascii-modal-backdrop"
			aria-label="Dismiss consent dialog"
			onclick={() => onDecline?.()}
		></button>
		<div
			class="ascii-modal-panel"
			role="dialog"
			aria-modal="true"
			aria-label="Before you talk to Th30"
		>
			<pre
				class="ascii ascii-card-surface th30-consent-card text-xs font-bold"
			><AsciiCardSegments {segments} onAction={onAction} /></pre>
		</div>
	</div>
{/if}

<style>
.th30-consent-root {
	z-index: 70;
}

.th30-consent-card {
	position: static;
	z-index: auto;
	max-height: calc(100dvh - 24px);
	max-width: calc(100vw - 24px);
	overflow: auto;
}
</style>
