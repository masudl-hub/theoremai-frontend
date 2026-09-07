<script lang="ts">
import { IconApi, IconCode } from '@tabler/icons-svelte';
import type { CustomToolType } from 'theorum/schema';
import McpMark from './McpMark.svelte';

let {
	toolType,
	size = 14,
	class: className = '',
}: {
	toolType: CustomToolType;
	size?: number;
	class?: string;
} = $props();
</script>

{#if toolType === 'mcp'}
	<McpMark {size} class={className} />
{:else if toolType === 'http'}
	<IconApi {size} stroke={1.75} class={className} />
{:else}
	<IconCode {size} stroke={1.75} class={className} />
{/if}
