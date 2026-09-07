<script lang="ts">
import { SvelteMap } from 'svelte/reactivity';
import type { TranscriptBlock } from 'theorum/interface';
import type { ToolCredential } from 'theorum/kernel';
import TranscriptBlockView from './TranscriptBlockView.svelte';

let {
	blocks,
	handle,
	streaming = false,
	onBranch,
	onToolDecision,
	onAuthCredential,
}: {
	blocks: TranscriptBlock[];
	handle: string;
	streaming?: boolean;
	onBranch?: (index: number) => void;
	onToolDecision?: (
		index: number,
		action: 'allow' | 'allow_session' | 'deny',
		interactiveValue?: unknown,
	) => void;
	onAuthCredential?: (index: number, slot: string, credential: ToolCredential) => void;
} = $props();

let listEl = $state<HTMLUListElement | null>(null);
const blockTimes = new SvelteMap<string, number>();

$effect(() => {
	const t = Date.now();
	for (const block of blocks) {
		if (!blockTimes.has(block.id)) blockTimes.set(block.id, t);
	}
});

$effect(() => {
	void blocks.length;
	listEl?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
});

function blockAt(index: number): number {
	return blockTimes.get(blocks[index]?.id ?? '') ?? Date.now();
}
</script>

<div class="iface-transcript" role="log" aria-live="polite" aria-relevant="additions">
	{#if blocks.length > 0}
		<ul bind:this={listEl} class="iface-transcript__list">
			{#each blocks as block, index (block.id)}
				<li class="iface-transcript__item">
					<TranscriptBlockView
						{block}
						{handle}
						at={blockAt(index)}
						onAuthCredential={onAuthCredential ? (slot, credential) => onAuthCredential(index, slot, credential) : undefined}
						onBranch={onBranch ? () => onBranch(index) : undefined}
						onToolDecision={onToolDecision
							? (action, interactiveValue) => onToolDecision(index, action, interactiveValue)
							: undefined}
						showChrome={!(streaming && index === blocks.length - 1)}
						streaming={streaming && index === blocks.length - 1 && block.kind === 'text'}
					/>
				</li>
			{/each}
		</ul>
	{/if}
</div>
