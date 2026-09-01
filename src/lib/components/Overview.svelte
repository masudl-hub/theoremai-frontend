<script lang="ts">
	import CloudSky from '$lib/components/CloudSky.svelte';
	import { cloudParadeSparse } from '$lib/data/clouds';
</script>

<section
	id="overview"
	class="landing-section relative flex min-h-dvh w-full flex-col items-center justify-center border-b-[3px] border-black px-6 py-20 md:px-14 md:py-12"
>
	<CloudSky
		clouds={cloudParadeSparse}
		band="absolute inset-x-0 top-[8%] bottom-[8%] z-0 select-none overflow-visible text-black"
	/>

	<div class="relative z-10 w-full max-w-6xl text-center">
		<h3 class="mb-8 text-sm font-extrabold tracking-[0.22em] uppercase md:mb-10">Overview</h3>
		<h2
			class="mx-auto mb-6 max-w-3xl text-3xl leading-[0.95] font-extrabold tracking-tighter uppercase md:mb-8 md:text-5xl"
		>
			A unified runtime<br />for agentic execution.
		</h2>
		<p class="mx-auto max-w-2xl text-base leading-relaxed font-bold md:text-xl">
			Theorum turns ad-hoc agent scripts into a typed execution kernel. One contract per agent —
			predictable at every boundary.
		</p>
	</div>
</section>
