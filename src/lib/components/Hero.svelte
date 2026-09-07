<script lang="ts">
import CloudSky from '$lib/components/CloudSky.svelte';
import PackageLinks from '$lib/components/PackageLinks.svelte';

let { versionLabel }: { versionLabel: string } = $props();
</script>

<section
	id="hero"
	class="hero landing-section relative flex h-dvh w-full flex-col justify-end px-6 pb-12 pt-8 md:px-14 md:pb-16"
	aria-label="Hero"
>
	<CloudSky band="hero-cloud-band absolute inset-x-0 z-0 select-none overflow-visible text-black" />

	<div class="relative z-10 flex w-full items-end justify-between gap-6 md:gap-10">
		<div class="min-w-0 flex-1">
			<p class="hero-version anim-rise-d1 mb-3 text-xs font-bold text-black/60 md:text-sm">
				{versionLabel}
			</p>
			<h1 class="hero-title anim-brand font-extrabold tracking-tighter text-black uppercase">
				Theorum
			</h1>
			<p class="hero-lead anim-rise-d2 mt-4 text-sm font-bold text-black md:mt-5 md:text-xl">
				A TypeScript kernel for typed agent profiles and deterministic turns.
			</p>
		</div>

		<nav
			class="anim-rise-d3 flex shrink-0 items-center gap-2 pb-1 md:gap-3 md:pb-3"
			aria-label="Package links"
		>
			<PackageLinks variant="hero" />
		</nav>
	</div>
</section>

<style>
.hero {
	overflow: visible;
}
</style>
