<script lang="ts">
import { onMount } from 'svelte';
import {
	computeInkBarTargets,
	INK_WAVE_BAR_COUNT,
	INK_WAVE_HERO_BAR_COUNT,
	type InkWaveStatus,
	inkWaveDriver,
	inkWavePhases,
	stepInkBarHeights,
} from '$lib/interface/ink-waveform';

let {
	status = 'disconnected',
	inputLevel = 0,
	outputLevel = 0,
	toolActive = false,
	frozen = false,
	variant = 'default',
}: {
	status?: InkWaveStatus;
	inputLevel?: number;
	outputLevel?: number;
	toolActive?: boolean;
	frozen?: boolean;
	variant?: 'default' | 'hero';
} = $props();

const viewWidth = $derived(variant === 'hero' ? 960 : 480);
const viewHeight = $derived(variant === 'hero' ? 720 : 320);
const preserveAspect = $derived(variant === 'hero' ? 'xMidYMax slice' : 'xMidYMax meet');
const strokeWidth = 2;
const barCount = $derived(variant === 'hero' ? INK_WAVE_HERO_BAR_COUNT : INK_WAVE_BAR_COUNT);
const gap = $derived((viewWidth - strokeWidth * barCount) / (barCount + 1));
const phases = $derived(inkWavePhases(barCount));

let heights = $state<number[]>([]);

type Snap = {
	status: InkWaveStatus;
	inputLevel: number;
	outputLevel: number;
	toolActive: boolean;
	frozen: boolean;
};

const snap = $state<Snap>({
	status: 'disconnected',
	inputLevel: 0,
	outputLevel: 0,
	toolActive: false,
	frozen: false,
});

$effect(() => {
	snap.status = status;
	snap.inputLevel = inputLevel;
	snap.outputLevel = outputLevel;
	snap.toolActive = toolActive;
	snap.frozen = frozen;
});

const bars = $derived(
	heights.map((height, index) => {
		const x = gap + index * (strokeWidth + gap) + strokeWidth / 2;
		const barHeight = height * (viewHeight - 4);
		return { x, y2: viewHeight - barHeight };
	}),
);

onMount(() => {
	let frame = 0;
	heights = Array.from({ length: barCount }, () => 0.06);
	const tick = (time: number) => {
		if (heights.length !== barCount) {
			heights = Array.from({ length: barCount }, () => 0.06);
		}
		const targets = computeInkBarTargets({
			phases,
			timeMs: time,
			driver: inkWaveDriver(
				snap.status,
				snap.toolActive,
				snap.inputLevel,
				snap.outputLevel,
				snap.frozen,
			),
			inputLevel: snap.frozen ? 0 : snap.inputLevel,
			outputLevel: snap.frozen ? 0 : snap.outputLevel,
			frozen: snap.frozen,
		});
		heights = stepInkBarHeights(heights, targets, snap.frozen ? 0.2 : 0.14);
		frame = requestAnimationFrame(tick);
	};
	frame = requestAnimationFrame(tick);
	return () => cancelAnimationFrame(frame);
});
</script>

<svg
	class="ink-wave"
	class:ink-wave--hero={variant === 'hero'}
	aria-hidden="true"
	viewBox="0 0 {viewWidth} {viewHeight}"
	preserveAspectRatio={preserveAspect}
>
	{#each bars as bar, index (index)}
		<line
			class="ink-wave__bar"
			x1={bar.x}
			x2={bar.x}
			y1={viewHeight}
			y2={bar.y2}
			stroke-width={strokeWidth}
		/>
	{/each}
</svg>
