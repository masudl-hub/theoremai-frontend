<script lang="ts">
	import type { Snippet } from 'svelte';
	import AsciiHover from '$lib/components/AsciiHover.svelte';
	import { fieldTipArt } from '$lib/theorum/annotate';

	let {
		children,
		class: className = '',
		variant = 'schema'
	}: {
		children: Snippet;
		class?: string;
		/** `schema` for code/map keys; `label` for Playground field titles */
		variant?: 'schema' | 'label';
	} = $props();

	function resolveTip(el: HTMLElement): string | null {
		const path = el.getAttribute('data-type-path');
		if (!path) return null;
		return fieldTipArt(path);
	}
</script>

<AsciiHover class={className} selector="[data-type-path]" resolveTip={resolveTip} {variant}>
	{@render children()}
</AsciiHover>
