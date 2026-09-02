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
		<Use />
		<Playground />
		<Architecture />
	</main>

	<footer class="site-footer px-6 py-10 md:px-14">
		<div
			class="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<p class="text-xs font-extrabold tracking-[0.22em] uppercase md:text-sm">Theorum</p>
				<p class="mt-2 max-w-sm text-xs leading-relaxed text-mute md:text-sm">
					The flat TypeScript agent kernel. Host-owned profiles, one runner, injected traces.
				</p>
			</div>
			<nav class="flex flex-wrap gap-4 text-xs font-bold md:text-sm" aria-label="Footer">
				<a
					class="invert-link px-1"
					href="https://github.com/masudl-hub/theorum"
					rel="noopener noreferrer"
					target="_blank"
					>GitHub</a
				>
				<a
					class="invert-link px-1"
					href="https://jsr.io/@theorum/core"
					rel="noopener noreferrer"
					target="_blank"
					>JSR</a
				>
				<a
					class="invert-link px-1"
					href="https://www.npmjs.com/package/theorum"
					rel="noopener noreferrer"
					target="_blank"
					>npm</a
				>
			</nav>
		</div>
	</footer>
</div>
