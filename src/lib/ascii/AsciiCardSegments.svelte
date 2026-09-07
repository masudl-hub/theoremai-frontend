<script lang="ts">
import type { AsciiCardSegment } from '$lib/ascii/tip-card';

let {
	segments,
	onAction,
}: {
	segments: AsciiCardSegment[];
	onAction: (id: string) => void;
} = $props();
</script>

{#each segments as segment, i (i)}
	{#if segment.type === 'text'}
		{segment.value}
	{:else}
		<button type="button" class="ascii-card-action" onclick={() => onAction(segment.id)}>
			[ {segment.label} ]
		</button>
	{/if}
{/each}
