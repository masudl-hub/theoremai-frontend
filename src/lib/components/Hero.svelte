<script lang="ts">
import CloudSky from '$lib/components/CloudSky.svelte';

let { versionLabel }: { versionLabel: string } = $props();
</script>

<section
	class="hero landing-section relative flex h-dvh w-full flex-col justify-end border-b-[3px] border-black px-6 pb-12 pt-8 md:px-14 md:pb-16"
	aria-label="Hero"
>
	<CloudSky
		band="absolute inset-x-0 top-[30%] bottom-[calc(3rem+2.75rem)] z-0 select-none overflow-visible text-black md:top-[28%] md:bottom-[calc(4rem+3.5rem)]"
	/>

	<div class="relative z-10 flex w-full items-end justify-between gap-6 md:gap-10">
		<div class="min-w-0 flex-1">
			<p class="anim-rise-d1 mb-3 text-xs font-bold tracking-[0.06em] text-black/60 md:text-sm">
				{versionLabel}
			</p>
			<h1
				class="anim-brand text-[clamp(3.75rem,15vw,10.5rem)] leading-[0.82] font-extrabold tracking-tighter text-black uppercase"
			>
				Theorum
			</h1>
			<p class="anim-rise-d2 mt-4 max-w-[42ch] text-sm font-bold text-black md:mt-5 md:text-xl">
				A TypeScript kernel for typed agent profiles and deterministic turns.
			</p>
		</div>

		<nav
			class="anim-rise-d3 flex shrink-0 items-center gap-2 pb-1 md:gap-3 md:pb-3"
			aria-label="Package links"
		>
			<a
				class="invert-link p-1.5"
				aria-label="GitHub"
				href="https://github.com/masudl-hub/theorum"
				rel="noopener noreferrer"
				target="_blank"
			>
				<svg class="h-5 w-5 md:h-7 md:w-7" fill="currentColor" viewBox="0 0 24 24">
					<path
						d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
					/>
				</svg>
			</a>
			<a
				class="invert-link inline-flex items-center justify-center p-1.5"
				aria-label="JSR"
				href="https://jsr.io/@theorum/core"
				rel="noopener noreferrer"
				target="_blank"
			>
				<img class="h-5 w-5 md:h-7 md:w-7" alt="JSR" draggable="false" src="/jsr.png">
			</a>
			<a
				class="invert-link px-1.5 py-1.5"
				aria-label="npm"
				href="https://www.npmjs.com/package/theorum"
				rel="noopener noreferrer"
				target="_blank"
			>
				<svg class="h-4 w-auto md:h-5" fill="currentColor" viewBox="0 0 780 250">
					<path
						d="M240,250h100v-50h100V0H240V250z M340,50h50v100h-50V50z M480,0v200h100V50h50v150h50V50h50v150h50V0H480z M0,200h100V50h50v150h50V0H0V200z"
					/>
				</svg>
			</a>
		</nav>
	</div>
</section>

<style>
.hero {
	overflow: visible;
}
</style>
