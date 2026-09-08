<script lang="ts">
import { SvelteMap } from 'svelte/reactivity';
import type { TranscriptBlock } from 'theorum/interface';
import type { ToolCredential } from 'theorum/kernel';
import {
	findLastUserTurnEndIndex,
	pinElementBottomToViewportTop,
	resolveTranscriptRunwayHeight,
} from '$lib/interface/transcript-scroll';
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

let scrollEl = $state<HTMLDivElement | null>(null);
let listEl = $state<HTMLUListElement | null>(null);
let runwayEl = $state<HTMLDivElement | null>(null);
let runwayPx = $state(0);
const blockTimes = new SvelteMap<string, number>();
/** Last user-turn end block we already pinned for. */
let pinnedUserBlockId = $state<string | null>(null);

$effect(() => {
	const t = Date.now();
	for (const block of blocks) {
		if (!blockTimes.has(block.id)) blockTimes.set(block.id, t);
	}
});

$effect(() => {
	const el = scrollEl;
	if (!el) return;

	const syncRunway = () => {
		runwayPx = resolveTranscriptRunwayHeight({
			clientHeight: el.clientHeight,
			reserveTopPx: 0,
		});
	};
	syncRunway();
	const observer = new ResizeObserver(syncRunway);
	observer.observe(el);
	return () => observer.disconnect();
});

$effect(() => {
	if (!runwayEl) return;
	runwayEl.style.minHeight = `${String(runwayPx)}px`;
});

$effect(() => {
	if (blocks.length === 0) {
		pinnedUserBlockId = null;
	}
});

$effect(() => {
	const endIndex = findLastUserTurnEndIndex(blocks);
	if (endIndex == null || !scrollEl || !listEl) return;

	const endBlock = blocks[endIndex];
	if (!endBlock || pinnedUserBlockId === endBlock.id) return;

	const item = listEl.children[endIndex] as HTMLElement | undefined;
	if (!item) return;

	pinnedUserBlockId = endBlock.id;
	const container = scrollEl;
	requestAnimationFrame(() => {
		pinElementBottomToViewportTop(container, item, 'smooth');
	});
});

function blockAt(index: number): number {
	return blockTimes.get(blocks[index]?.id ?? '') ?? Date.now();
}
</script>

<div
	bind:this={scrollEl}
	class="iface-transcript"
	role="log"
	aria-live="polite"
	aria-relevant="additions"
>
	{#if blocks.length > 0}
		<div class="iface-transcript__rail">
			<ul bind:this={listEl} class="iface-transcript__list">
				{#each blocks as block, index (block.id)}
					<li class="iface-transcript__item">
						<TranscriptBlockView
							{block}
							{handle}
							at={blockAt(index)}
							onAuthCredential={onAuthCredential
								? (slot, credential) => onAuthCredential(index, slot, credential)
								: undefined}
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
			<div bind:this={runwayEl} class="iface-transcript__runway" aria-hidden="true"></div>
		</div>
	{/if}
</div>
