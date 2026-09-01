<script lang="ts">
	import Architecture from '$lib/components/Architecture.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import Overview from '$lib/components/Overview.svelte';
	import Pillars from '$lib/components/Pillars.svelte';
	import Playground from '$lib/components/Playground.svelte';
	import Use from '$lib/components/Use.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="landing-scroll">
	<main>
		<Hero versionLabel={data.kernel.versionLabel} />
		<Overview />
		<Pillars />
		<Architecture />
		<Use />
		<Playground />
	</main>

	<footer class="border-t-[3px] border-black px-6 py-10 md:px-14">
		<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
			<div>
				<p class="text-xs font-extrabold tracking-[0.22em] uppercase">Theorum</p>
				<p class="mt-2 max-w-sm text-xs text-[var(--color-mute)]">
					The flat TypeScript agent kernel. Host-owned profiles, one runner, injected traces.
				</p>
			</div>
			<nav class="flex flex-wrap gap-4 text-xs font-bold" aria-label="Footer">
				<a class="invert-link px-1" href="#playground">Playground</a>
				<a
					class="invert-link px-1"
					href="https://github.com/masudl-hub/theorum"
					target="_blank"
					rel="noreferrer">GitHub</a
				>
				<a
					class="invert-link px-1"
					href="https://jsr.io/@theorum/core"
					target="_blank"
					rel="noreferrer">JSR</a
				>
				<a
					class="invert-link px-1"
					href="https://www.npmjs.com/package/theorum"
					target="_blank"
					rel="noreferrer">npm</a
				>
			</nav>
		</div>
	</footer>
</div>
