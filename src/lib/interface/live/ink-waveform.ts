import type { LiveSessionStatus } from '$lib/client/live-client';

export const INK_WAVE_BAR_COUNT = 21;
export const INK_WAVE_EASE_MS = 300;

/** Per-bar phase offsets — stable undulation, not a fixed bell curve. */
export const INK_WAVE_PHASES: readonly number[] = Array.from(
	{ length: INK_WAVE_BAR_COUNT },
	(_, i) => i * 0.73 + Math.sin(i * 1.17) * 0.4,
);

export type InkWaveDriver = 'idle' | 'input' | 'output' | 'pulse';

export function inkWaveDriver(
	status: LiveSessionStatus,
	toolActive: boolean,
	_inputLevel: number,
	outputLevel: number,
	frozen = false,
): InkWaveDriver {
	if (frozen) return 'idle';
	if (toolActive) return 'pulse';
	if (status === 'speaking' || outputLevel > 0.04) return 'output';
	if (status === 'listening' || status === 'ready') return 'input';
	if (status === 'connecting') return 'pulse';
	return 'idle';
}

export function computeInkBarTargets(args: {
	phases: readonly number[];
	timeMs: number;
	driver: InkWaveDriver;
	inputLevel: number;
	outputLevel: number;
	frozen?: boolean;
}): number[] {
	const t = args.timeMs * 0.001;
	if (args.frozen) {
		return args.phases.map(() => 0.06);
	}
	const master =
		args.driver === 'output'
			? 0.14 + args.outputLevel * 0.86
			: args.driver === 'input'
				? 0.1 + args.inputLevel * 0.9
				: args.driver === 'pulse'
					? 0.16 + 0.1 * Math.sin(t * 2.8)
					: 0.06;

	return args.phases.map((phase, index) => {
		const wobble = 0.55 + 0.45 * Math.sin(t * 3.4 + phase);
		const ripple = 0.45 + 0.55 * Math.sin(t * 5.3 + index * 0.62);
		const height = master * wobble * ripple;
		return Math.min(1, Math.max(0.035, height));
	});
}

/** Smooth toward targets each animation frame (orchid ease feel). */
export function stepInkBarHeights(current: number[], targets: number[], alpha = 0.14): number[] {
	return current.map((value, index) => value + (targets[index] - value) * alpha);
}
