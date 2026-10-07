import { type RefObject, useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';

function subscribeReducedMotion(onStoreChange: () => void): () => void {
	const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
	mq.addEventListener('change', onStoreChange);
	return () => {
		mq.removeEventListener('change', onStoreChange);
	};
}

function getReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function homeShell(): HTMLElement | null {
	return document.querySelector<HTMLElement>('.theorem-home-shell');
}

function readPull(shell: HTMLElement | null): number {
	const raw =
		shell?.style.getPropertyValue('--home-shell-pull') ||
		document.documentElement.style.getPropertyValue('--home-shell-pull');
	const value = Number.parseFloat(raw);
	return Number.isFinite(value) ? value : 0;
}

function setShellPull(value: number) {
	const shell = homeShell();
	const next = String(value);
	document.documentElement.style.setProperty('--home-shell-pull', next);
	shell?.style.setProperty('--home-shell-pull', next);
	if (value >= 1) {
		document.documentElement.dataset.homeIntroDone = '';
	} else {
		delete document.documentElement.dataset.homeIntroDone;
	}
}

function clearShellPull() {
	document.documentElement.style.removeProperty('--home-shell-pull');
	homeShell()?.style.removeProperty('--home-shell-pull');
	delete document.documentElement.dataset.homeIntroDone;
}

export function useHomeIntroScroll(
	scrollRoot: RefObject<HTMLElement | null>,
	runRef: RefObject<HTMLElement | null>,
) {
	const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
	const [flight, setFlight] = useState(0);

	useLayoutEffect(() => {
		if (reduced) {
			setShellPull(1);
			setFlight(1);
			return clearShellPull;
		}
		setShellPull(0);
		setFlight(0);
		return clearShellPull;
	}, [reduced]);

	useEffect(() => {
		if (reduced) return;
		const scroller = scrollRoot.current;
		const section = runRef.current;
		if (!scroller || !section) return;

		const update = () => {
			const room = section.querySelector<HTMLElement>('.home-intro-scroll-room');
			const travel = room?.offsetHeight ?? window.innerHeight;
			const progress = travel > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / travel)) : 0;
			setShellPull(progress);
			setFlight(progress);
		};

		update();
		scroller.addEventListener('scroll', update, { passive: true });
		return () => {
			scroller.removeEventListener('scroll', update);
		};
	}, [reduced, scrollRoot, runRef]);

	return { flight, reduced };
}

type FlightDelta = { x: number; y: number; scale: number };

export function useHomeNavFlight(
	flight: number,
	itemRefs: RefObject<Record<string, HTMLElement | null>>,
) {
	const [deltas, setDeltas] = useState<Record<string, FlightDelta>>({});

	useLayoutEffect(() => {
		const measure = () => {
			const shell = homeShell();
			if (!shell) return;
			const previous = readPull(shell);
			setShellPull(1);
			const next: Record<string, FlightDelta> = {};
			for (const [href, node] of Object.entries(itemRefs.current)) {
				if (!node) continue;
				const target = document.querySelector<HTMLElement>(
					`[data-home-nav-anchor="${CSS.escape(href)}"]`,
				);
				if (!target) continue;
				const from = node.getBoundingClientRect();
				const to = target.getBoundingClientRect();
				if (to.width < 1 || from.width < 1) continue;
				const fromCx = from.left + from.width / 2;
				const fromCy = from.top + from.height / 2;
				const toCx = to.left + to.width / 2;
				const toCy = to.top + to.height / 2;
				next[href] = {
					x: toCx - fromCx,
					y: toCy - fromCy,
					scale: to.width / from.width,
				};
			}
			setShellPull(previous);
			setDeltas((current) => (shallowEqualDeltas(current, next) ? current : next));
		};
		measure();
		window.addEventListener('resize', measure, { passive: true });
		void document.fonts.ready.then(measure);
		return () => {
			window.removeEventListener('resize', measure);
		};
	}, [itemRefs]);

	useLayoutEffect(() => {
		const t = easeInOutCubic(flight);
		for (const [href, node] of Object.entries(itemRefs.current)) {
			if (!node) continue;
			const delta = deltas[href];
			if (!delta) continue;
			const x = delta.x * t;
			const y = delta.y * t;
			const scale = 1 + (delta.scale - 1) * t;
			node.style.transform = t > 0 && t < 1 ? `translate(${x}px, ${y}px) scale(${scale})` : '';
			node.style.zIndex = t > 0 && t < 1 ? '20' : '';
		}
	}, [deltas, flight, itemRefs]);
}

function shallowEqualDeltas(a: Record<string, FlightDelta>, b: Record<string, FlightDelta>): boolean {
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	if (keysA.length !== keysB.length) return false;
	for (const key of keysA) {
		const left = a[key];
		const right = b[key];
		if (!right || left.x !== right.x || left.y !== right.y || left.scale !== right.scale) return false;
	}
	return true;
}
