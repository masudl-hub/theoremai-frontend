import { type RefObject, useEffect } from 'react';
import { REST_PX } from './home-shell-pull';

/** Where an element sits in the scroller's scrollable area. `offsetTop` is from its own offset parent. */
export function scrollTopOf(scroller: HTMLElement, element: HTMLElement): number {
	return (
		element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
	);
}

/**
 * A run of pinned screens counts its stops as the page scrolls. The pull runs from 0 at the run's
 * origin to the last stop, and the stop the scroll rests on is reported once it changes. Nothing
 * writes scrollTop. With `lead`, a screen comes before the first stop, as overview does for the
 * goals, and that screen is stop 0.
 */
export function useScrollStops({
	scrollRoot,
	runRef,
	stop,
	lead,
	reduced = false,
	measure,
	onPull,
	onRest,
	onClear,
}: {
	scrollRoot: RefObject<HTMLElement | null>;
	runRef: RefObject<HTMLElement | null>;
	/** The class of the stop elements in the run, in order. */
	stop: string;
	lead: boolean;
	reduced?: boolean;
	/** Lay out what depends on the stops. `step` is the height of one stop, or 0 if none is shown. */
	measure?: (run: HTMLElement, step: number) => void;
	onPull?: (run: HTMLElement, pull: number) => void;
	/** The index of the stop the scroll rests on, from 0. */
	onRest: (index: number, run: HTMLElement) => void;
	onClear?: (run: HTMLElement) => void;
}) {
	// An effect, not a layout effect: the scroller is the parent's node, and its ref is not set
	// until this component's layout effects have run.
	useEffect(() => {
		if (reduced) return;
		const scroller = scrollRoot.current;
		const run = runRef.current;
		if (!scroller || !run) return;

		const stops = [...run.querySelectorAll<HTMLElement>(`.${stop}`)];
		let origin = 0;
		let step = 0;
		let last = 0;
		let current = -1;

		const clear = () => {
			onClear?.(run);
			current = -1;
		};

		const update = () => {
			if (step <= 0) {
				clear();
				return;
			}
			const raw = Math.min(last, Math.max(0, (scroller.scrollTop - origin) / step));
			const nearest = Math.round(raw);
			// A snap can rest a pixel short of its stop. That is still the stop.
			const pull = Math.abs(raw - nearest) * step <= REST_PX ? nearest : raw;
			onPull?.(run, pull);
			if (nearest === current) return;
			current = nearest;
			onRest(nearest, run);
		};

		const onResize = () => {
			// The stops are not laid out on a phone, so there is nothing to count there.
			step = stops[0]?.offsetHeight ?? 0;
			origin = step > 0 && stops[0] ? scrollTopOf(scroller, stops[0]) - (lead ? step : 0) : 0;
			last = lead ? stops.length : stops.length - 1;
			measure?.(run, step);
			update();
		};

		onResize();
		scroller.addEventListener('scroll', update, { passive: true });
		const observer = new ResizeObserver(onResize);
		observer.observe(run);
		return () => {
			scroller.removeEventListener('scroll', update);
			observer.disconnect();
			clear();
		};
	}, [lead, measure, onClear, onPull, onRest, reduced, runRef, scrollRoot, stop]);
}
