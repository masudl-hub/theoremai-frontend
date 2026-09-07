<script lang="ts">
/* eslint-disable svelte/no-at-html-tags, svelte/no-inline-styles -- annotateProfileCode escapes HTML before render; height transition requires dynamic style */
import { annotateProfileCode } from '$lib/theorum/annotate';

let { source, toolRegistration = false }: { source: string; toolRegistration?: boolean } = $props();

const html = $derived(annotateProfileCode(source, { toolRegistration }));

let stage = $state<HTMLDivElement | null>(null);
let pre = $state<HTMLPreElement | null>(null);
let height = $state<number | null>(null);
let ready = $state(false);

$effect(() => {
	void html;
	const stageEl = stage;
	const preEl = pre;
	if (!stageEl || !preEl) return;

	const to = preEl.offsetHeight;
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	if (!ready || reduce) {
		height = to;
		ready = true;
		return;
	}

	const from = height ?? stageEl.offsetHeight;
	height = from;
	const frame = requestAnimationFrame(() => {
		height = to;
	});
	return () => cancelAnimationFrame(frame);
});
</script>

<div
	bind:this={stage}
	class="code-stage"
	style:height={height === null ? undefined : `${height}px`}
>
	<pre
		bind:this={pre}
		class="ascii profile-code overflow-x-auto overflow-y-visible pr-8 text-xs font-bold md:text-sm"
	>{@html html}</pre>
</div>

<style>
.code-stage {
	overflow: hidden;
	transition: height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.code-stage > :global(pre) {
	margin: 0;
}

:global(.code-line) {
	display: block;
	width: 100%;
	transition:
		background-color 0.2s ease,
		box-shadow 0.2s ease;
	border-left: 3px solid transparent;
	padding-left: 4px;
	margin-left: -7px;
}

@media (prefers-reduced-motion: reduce) {
	.code-stage {
		transition: none;
	}
}
</style>
