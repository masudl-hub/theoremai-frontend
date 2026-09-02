<script lang="ts">
/* eslint-disable svelte/no-at-html-tags -- package-map markup is generated internally by renderPackageTree */
import { on } from 'svelte/events';
import { renderAsciiCard } from '$lib/ascii/tip-card';
import AsciiHover from '$lib/components/AsciiHover.svelte';
import CloudSky from '$lib/components/CloudSky.svelte';
import { type ArchNode, architectureMap, renderPackageTree } from '$lib/data/architecture';
import { cloudParadeSparse } from '$lib/data/clouds';

let hint = $state('[ Click to copy ]');
let sectionEl: HTMLElement | undefined = $state();
let mapScrollEl: HTMLElement | undefined = $state();

function n(id: string, label: string) {
	return `<button type="button" class="node" data-node="${id}">${label}</button>`;
}

const tree = $derived(renderPackageTree(n));

function archTipArt(node: ArchNode, action: string): string {
	const foot = action
		.replace(/^\[|\]$/g, '')
		.trim()
		.toLowerCase();
	return renderAsciiCard({
		title: `${node.title.toUpperCase()} · ${node.type}`,
		body: node.desc,
		specs: node.specs.map(([label, value]) => ({ label, value })),
		usage: node.usage,
		copyable: node.copyable,
		footer: foot,
	});
}

function onResolveTip(el: HTMLElement): string | null {
	const id = el.getAttribute('data-node');
	if (!id) return null;
	const data = architectureMap[id];
	if (!data) return null;
	hint = data.copyable ? '[ Click to copy ]' : '[ Internal ]';
	return archTipArt(data, hint);
}

async function onHostClick(e: MouseEvent) {
	const el = (e.target as Element | null)?.closest('[data-node]') as HTMLElement | null;
	if (!el) return;
	const id = el.getAttribute('data-node');
	if (!id) return;
	const data = architectureMap[id];
	if (!data.copyable) return;
	try {
		await navigator.clipboard.writeText(data.usage);
		hint = 'Copied';
		setTimeout(() => {
			hint = '[ Click to copy ]';
		}, 1200);
	} catch {
		hint = 'Copy failed';
	}
}

$effect(() => {
	const section = sectionEl;
	const mapScroll = mapScrollEl;
	if (!section || !mapScroll) return;

	const scroller = section.closest('.landing-scroll') as HTMLElement | null;
	let coolingDown = false;
	let cooldownTimer: ReturnType<typeof setTimeout> | undefined;
	let overscrollAccumulator = 0;
	let resetAccumulatorTimer: ReturnType<typeof setTimeout> | undefined;
	const OVERSCROLL_THRESHOLD = 160;

	const onWheel = (e: WheelEvent) => {
		if (!mapScroll.contains(e.target as Node)) return;

		const max = mapScroll.scrollHeight - mapScroll.clientHeight;
		if (max <= 1) return;

		const top = mapScroll.scrollTop;
		const atTop = top <= 0;
		const atBottom = top >= max - 1;
		const goingDown = e.deltaY > 0;
		const goingUp = e.deltaY < 0;

		if ((goingDown && atBottom) || (goingUp && atTop)) {
			e.preventDefault();
			if (coolingDown) return;

			// Reset buffer decay timer on every event
			clearTimeout(resetAccumulatorTimer);
			resetAccumulatorTimer = setTimeout(() => {
				overscrollAccumulator = 0;
			}, 200);

			// Accumulate delta only in the active overflow direction
			if (goingDown && overscrollAccumulator < 0) overscrollAccumulator = 0;
			if (goingUp && overscrollAccumulator > 0) overscrollAccumulator = 0;
			overscrollAccumulator += e.deltaY;

			if (Math.abs(overscrollAccumulator) < OVERSCROLL_THRESHOLD) {
				return;
			}

			overscrollAccumulator = 0;
			coolingDown = true;
			clearTimeout(cooldownTimer);
			cooldownTimer = setTimeout(() => {
				coolingDown = false;
			}, 800);

			if (goingDown) {
				const next =
					(section.nextElementSibling as HTMLElement | null) ??
					(section.closest('main')?.nextElementSibling as HTMLElement | null) ??
					document.querySelector('footer');
				if (next) {
					if (scroller) {
						const targetTop =
							next.getBoundingClientRect().top -
							scroller.getBoundingClientRect().top +
							scroller.scrollTop;
						scroller.scrollTo({ top: targetTop, behavior: 'smooth' });
					} else {
						next.scrollIntoView({ behavior: 'smooth' });
					}
				}
			} else if (goingUp) {
				const prev =
					(section.previousElementSibling as HTMLElement | null) ??
					document.getElementById('playground');
				if (prev) {
					const steps = prev.querySelectorAll<HTMLElement>('[data-pillar-step]');
					const target = steps.length > 0 ? steps[steps.length - 1] : prev;
					if (scroller) {
						const targetTop =
							target.getBoundingClientRect().top -
							scroller.getBoundingClientRect().top +
							scroller.scrollTop;
						scroller.scrollTo({ top: targetTop, behavior: 'smooth' });
					} else {
						target.scrollIntoView({ behavior: 'smooth' });
					}
				}
			}
		} else {
			// While scrolling normally within bounds, keep the buffer empty
			overscrollAccumulator = 0;
		}
	};

	const offWheel = on(section, 'wheel', onWheel, { passive: false });
	return () => {
		offWheel();
		clearTimeout(cooldownTimer);
		clearTimeout(resetAccumulatorTimer);
	};
});
</script>

<section bind:this={sectionEl} id="architecture" class="architecture-root relative w-full">
	<div
		class="architecture-pin landing-section relative z-10 flex max-h-dvh min-h-dvh w-full flex-col items-center justify-start overflow-hidden border-b-[3px] border-black px-6 py-20 md:px-14 md:py-12"
	>
		<CloudSky
			band="absolute inset-x-0 top-[8%] bottom-[8%] z-0 select-none overflow-visible text-black"
			clouds={cloudParadeSparse}
		/>

		<div class="relative z-10 mb-6 w-full max-w-6xl shrink-0 text-center md:mb-5">
			<h3 class="text-sm font-extrabold tracking-[0.22em] uppercase">Package map</h3>
		</div>

		<div class="relative z-10 flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden">
			<AsciiHover
				class="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
				{onResolveTip}
				selector="[data-node]"
			>
				<div
					bind:this={mapScrollEl}
					class="architecture-map-scroll min-h-0 flex-1 overflow-x-auto overflow-y-auto pb-4"
					onclick={onHostClick}
					role="presentation"
				>
					<pre
						class="ascii text-xs leading-snug font-bold md:text-sm md:leading-[1.4]"
					>{@html tree}</pre>
				</div>
			</AsciiHover>
		</div>
	</div>
</section>

<style>
.architecture-map-scroll {
	-webkit-overflow-scrolling: touch;
	scrollbar-gutter: stable;
}
</style>
