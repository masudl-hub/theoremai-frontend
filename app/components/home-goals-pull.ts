import type { RefObject } from 'react';
import { setGoalBeat } from './home-goals-beat';
import { useScrollStops } from './home-scroll-stops';

function lengthOf(value: string): number {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The large tile is as wide as its column. Tile one keeps its top edge and tile three its bottom
 * edge, so it is also no taller than what is left of the frame from there, once the two small tiles
 * and the gaps are taken out.
 */
function measureTiles(run: HTMLElement, step: number) {
	const frame = run.querySelector<HTMLElement>('.home-stage-frame');
	const stack = run.querySelector<HTMLElement>('.home-stage-stills');
	const figure = stack?.querySelector<HTMLElement>('.home-stage-still');
	const tile = stack?.querySelector<HTMLElement>('.home-stage-still-media');
	if (step <= 0 || !frame || !stack || !figure || !tile || tile.offsetWidth < 1) return;
	const frameStyle = getComputedStyle(frame);
	const stackStyle = getComputedStyle(stack);
	const room =
		frame.clientHeight - lengthOf(frameStyle.paddingTop) - lengthOf(frameStyle.paddingBottom);
	const size = tile.offsetWidth;
	const small = lengthOf(stackStyle.getPropertyValue('--home-goal-small'));
	const large = Math.min(
		figure.offsetWidth,
		room / 2 + (1.5 - 2 * small) * size - lengthOf(stackStyle.rowGap),
	);
	run.style.setProperty('--home-goal-ratio', String(Math.max(1, large / size)));
}

function pullGoals(run: HTMLElement, pull: number) {
	run.style.setProperty('--home-goals-pull', String(pull));
}

/** Every beat but `nearest` is inert. With no beat (`null`), none is. */
function setInert(run: HTMLElement, nearest: number | null) {
	for (const beat of run.querySelectorAll<HTMLElement>('[data-home-beat]')) {
		beat.toggleAttribute('inert', nearest !== null && Number(beat.dataset.homeBeat) !== nearest);
	}
}

function restGoals(nearest: number, run: HTMLElement) {
	setInert(run, nearest);
	setGoalBeat(nearest);
}

function clearGoals(run: HTMLElement) {
	run.style.removeProperty('--home-goals-pull');
	run.style.removeProperty('--home-goal-ratio');
	setInert(run, null);
	setGoalBeat(0);
}

/**
 * Past overview, scroll counts beats. `--home-goals-pull` runs from 0 on overview to the number
 * of beats, and the tiles and the left column move from it in CSS. Whatever is not the current
 * beat is inert. Nothing writes scrollTop.
 */
export function useHomeGoalsScroll(
	scrollRoot: RefObject<HTMLElement | null>,
	runRef: RefObject<HTMLElement | null>,
	reduced: boolean,
) {
	useScrollStops({
		scrollRoot,
		runRef,
		stop: 'home-goal-stop',
		lead: true,
		reduced,
		measure: measureTiles,
		onPull: pullGoals,
		onRest: restGoals,
		onClear: clearGoals,
	});
}
