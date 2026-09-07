<script lang="ts">
import type { TranscriptBlock } from 'theorum/interface';
import TranscriptBlockView from './TranscriptBlockView.svelte';

let {
	blocks,
	handle,
	streaming = false,
}: {
	blocks: TranscriptBlock[];
	handle: string;
	streaming?: boolean;
} = $props();

let listEl = $state<HTMLUListElement | null>(null);

$effect(() => {
	void blocks.length;
	listEl?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
});
</script>

<div class="iface-transcript" role="log" aria-live="polite" aria-relevant="additions">
	{#if blocks.length > 0}
		<ul bind:this={listEl} class="iface-transcript__list">
			{#each blocks as block, index (block.id)}
				<li class="iface-transcript__item">
					<TranscriptBlockView
						{block}
						{handle}
						streaming={streaming && index === blocks.length - 1 && block.kind === 'text'}
					/>
				</li>
			{/each}
		</ul>
	{/if}
</div>
