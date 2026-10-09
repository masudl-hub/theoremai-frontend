import { type RefObject, useEffect } from 'react';
import { REST_PX } from './home-shell-pull';

function lengthOf(value: string): number {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
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
	// An effect, not a layout effect: the scroller is the parent's node, and its ref is not set
	// until this component's layout effects have run.
	useEffect(() => {
		if (reduced) return;
		const scroller = scrollRoot.current;
		const run = runRef.current;
		if (!scroller || !run) return;

		const stops = [...run.querySelectorAll<HTMLElement>('.home-goal-stop')];
		const beats = [...run.querySelectorAll<HTMLElement>('[data-home-beat]')];
		const frame = run.querySelector<HTMLElement>('.home-stage-frame');
		const stack = run.querySelector<HTMLElement>('.home-stage-stills');
		let start = 0;
		let step = 0;
		let current = -1;

		const clear = () => {
			run.style.removeProperty('--home-goals-pull');
			run.style.removeProperty('--home-goal-ratio');
			for (const beat of beats) beat.removeAttribute('inert');
			current = -1;
		};

		const measure = () => {
			// The stops are not laid out on a phone, so there are no beats to count there.
			step = stops[0]?.offsetHeight ?? 0;
			start = step > 0 ? (stops[0]?.offsetTop ?? 0) - step : 0;
			const figure = stack?.querySelector<HTMLElement>('.home-stage-still');
			const tile = stack?.querySelector<HTMLElement>('.home-stage-still-media');
			if (step <= 0 || !frame || !stack || !figure || !tile || tile.offsetWidth < 1) return;
			// The large square is as wide as its column. Tile one keeps its top edge and tile three its
			// bottom edge, so it is also no taller than what is left of the frame from there, once
			// the two small tiles and the gaps are taken out.
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
		};

		const update = () => {
			if (step <= 0) {
				clear();
				return;
			}
			const raw = Math.min(stops.length, Math.max(0, (scroller.scrollTop - start) / step));
			const nearest = Math.round(raw);
			// A snap can rest a pixel short of its stop. That is still the stop.
			const pull = Math.abs(raw - nearest) * step <= REST_PX ? nearest : raw;
			run.style.setProperty('--home-goals-pull', String(pull));
			if (nearest === current) return;
			current = nearest;
			for (const beat of beats) {
				beat.toggleAttribute('inert', Number(beat.dataset.homeBeat) !== nearest);
			}
		};

		const onResize = () => {
			measure();
			update();
		};

		onResize();
		scroller.addEventListener('scroll', update, { passive: true });
		const observer = new ResizeObserver(onResize);
		if (frame) observer.observe(frame);
		return () => {
			scroller.removeEventListener('scroll', update);
			observer.disconnect();
			clear();
		};
	}, [reduced, runRef, scrollRoot]);
}
