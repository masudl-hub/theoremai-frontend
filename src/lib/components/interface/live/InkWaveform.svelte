<script lang="ts">
import { onMount } from 'svelte';
import type { LiveSessionStatus } from '$lib/client/live-client';
import {
	computeInkBarTargets,
	INK_WAVE_BAR_COUNT,
	INK_WAVE_PHASES,
	inkWaveDriver,
	stepInkBarHeights,
} from '$lib/interface/live/ink-waveform';

let {
	status = 'disconnected',
	inputLevel = 0,
	outputLevel = 0,
	toolActive = false,
	frozen = false,
}: {
	status?: LiveSessionStatus;
	inputLevel?: number;
	outputLevel?: number;
	toolActive?: boolean;
	frozen?: boolean;
} = $props();

const viewWidth = 480;
const viewHeight = 320;
const strokeWidth = 2;
const barCount = INK_WAVE_BAR_COUNT;
const gap = (viewWidth - strokeWidth * barCount) / (barCount + 1);
const phases = INK_WAVE_PHASES;

let heights = $state<number[]>(Array.from({ length: barCount }, () => 0.06));

type Snap = {
	status: LiveSessionStatus;
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
	const tick = (time: number) => {
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
	aria-hidden="true"
	viewBox="0 0 {viewWidth} {viewHeight}"
	preserveAspectRatio="xMidYMax meet"
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
