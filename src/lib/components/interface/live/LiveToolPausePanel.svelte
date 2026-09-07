<script lang="ts">
import type { ToolPause } from 'theorum/kernel';
import ApprovalCard from '$lib/components/interface/ApprovalCard.svelte';
import AuthChallengeCard from '$lib/components/interface/AuthChallengeCard.svelte';
import type { ToolPauseResolution } from '$lib/interface/tool-resume';

let {
	pause,
	onResolve,
}: {
	pause: ToolPause;
	onResolve: (resolution: ToolPauseResolution) => void;
} = $props();

const toolName = $derived(pause.tool);
</script>

<div class="live-tool-pause" role="dialog" aria-labelledby="live-tool-pause-title">
	<p id="live-tool-pause-title" class="live-tool-pause__eyebrow">Tool paused</p>
	{#if pause.kind === 'auth'}
		<AuthChallengeCard
			{pause}
			{toolName}
			onSubmitCredential={(slot, credential) => {
				onResolve({ action: 'auth', credentials: { [slot]: credential } });
			}}
		/>
	{:else}
		<ApprovalCard
			{pause}
			{toolName}
			onDecision={(action, interactiveValue) => {
				onResolve(
					interactiveValue !== undefined
						? { action, interactiveValue }
						: { action },
				);
			}}
		/>
	{/if}
</div>

<style>
.live-tool-pause {
	position: absolute;
	inset: auto 1rem 5.5rem;
	z-index: 4;
	max-width: min(38rem, calc(100% - 2rem));
	margin-inline: auto;
	left: 0;
	right: 0;
}

.live-tool-pause__eyebrow {
	margin: 0 0 0.35rem;
	font-family: var(--font-mono, monospace);
	font-size: 0.65rem;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: rgba(0, 0, 0, 0.55);
}
</style>
