<script lang="ts">
import type { Snippet } from 'svelte';
import AsciiHover from '$lib/components/AsciiHover.svelte';
import { fieldTipArt } from '$lib/theoremai/annotate';

let {
	children,
	class: className = '',
	variant = 'schema',
}: {
	children: Snippet;
	class?: string;
	/** `schema` for code/map keys; `label` for Playground field titles */
	variant?: 'schema' | 'label';
} = $props();

function onResolveTip(el: HTMLElement): string | null {
	const path = el.getAttribute('data-type-path');
	if (!path) return null;
	return fieldTipArt(path);
}
</script>

<AsciiHover class={className} {onResolveTip} selector="[data-type-path]" {variant}>
	{@render children()}
</AsciiHover>
