import { type RefObject, useLayoutEffect, useSyncExternalStore } from 'react';
import { SHELL_INTRO_DONE, shellIntroOwnsPull } from './shell-motion';

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

function setShellPull(value: number) {
	document.documentElement.style.setProperty('--home-shell-pull', String(value));
	const shell = document.querySelector<HTMLElement>('.theorem-home-shell');
	shell?.style.setProperty('--home-shell-pull', String(value));
	const root = document.documentElement;
	if (value > 0 && value < 1) root.dataset.homeFlight = '';
	else delete root.dataset.homeFlight;
	if (value >= 1) {
		if (!root.hasAttribute('data-home-intro-done')) root.dataset.homeIntroDone = '';
	} else if (root.hasAttribute('data-home-intro-done')) {
		delete root.dataset.homeIntroDone;
	}
}

function clearShellPull() {
	document.documentElement.style.removeProperty('--home-shell-pull');
	document
		.querySelector<HTMLElement>('.theorem-home-shell')
		?.style.removeProperty('--home-shell-pull');
	delete document.documentElement.dataset.homeIntroDone;
	delete document.documentElement.dataset.homeFlight;
	delete document.documentElement.dataset.homeReduced;
}

/** How far from a stop, in px, still counts as resting on it. */
export const REST_PX = 2;

type Flight = {
	node: HTMLElement;
	originX: number;
	originY: number;
	width: number;
	height: number;
	targetX: number;
	targetY: number;
	targetScale: number;
};

/**
 * Scroll contracts the one shell in place and moves the title icons into the rail.
 * The page content changes with that same scroll. Nothing writes scrollTop.
 */
export function useHomeIntroScroll(
	scrollRoot: RefObject<HTMLElement | null>,
	runRef: RefObject<HTMLElement | null>,
	itemRefs: RefObject<Record<string, HTMLElement | null>>,
	flightReady: boolean,
) {
	const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);

	useLayoutEffect(() => {
		const settle = () => {
			if (reduced) {
				document.documentElement.dataset.homeReduced = '';
				setShellPull(1);
				return;
			}
			delete document.documentElement.dataset.homeReduced;
		};
		if (document.documentElement.hasAttribute('data-boot-pending')) setShellPull(0);
		else settle();
		window.addEventListener(SHELL_INTRO_DONE, settle);
		return () => {
			window.removeEventListener(SHELL_INTRO_DONE, settle);
			clearShellPull();
		};
	}, [reduced]);

	useLayoutEffect(() => {
		if (reduced) return;
		const scroller = scrollRoot.current;
		const section = runRef.current;
		if (!scroller || !section) return;

		let travel = 0;
		let flights: Flight[] = [];
		let nextInert = false;
		let pinInert = false;
		const next = section.querySelector<HTMLElement>('.home-contract-next');
		const pin = section.querySelector<HTMLElement>('.home-intro-pin');

		const measure = () => {
			const settle = section.querySelector<HTMLElement>('.home-contract-settle');
			travel = settle ? settle.offsetTop : section.offsetHeight;
			if (!flightReady) {
				flights = [];
				return;
			}
			const next: Flight[] = [];
			for (const [href, node] of Object.entries(itemRefs.current)) {
				if (!node) continue;
				node.style.transform = '';
				const spacer = document.querySelector<HTMLElement>(
					`[data-home-nav-from="${CSS.escape(href)}"]`,
				);
				const target = document.querySelector<HTMLElement>(
					`[data-home-nav-anchor="${CSS.escape(href)}"]`,
				);
				if (!spacer || !target) continue;
				const from = spacer.getBoundingClientRect();
				const to = target.getBoundingClientRect();
				const width = node.offsetWidth;
				const height = node.offsetHeight;
				if (to.width < 1 || width < 1 || from.width < 1) continue;
				/* Fixed icons, sticky spacers: both rects are already viewport
				   coordinates. Adding scrollTop parks the landing end one
				   screen below the card whenever measure runs after a jump
				   to overview or showcase. */
				next.push({
					node,
					originX: from.left + from.width / 2,
					originY: from.top + from.height / 2,
					width,
					height,
					targetX: to.left + to.width / 2,
					targetY: to.top + to.height / 2,
					targetScale: to.width / width,
				});
			}
			flights = next;
		};

		const update = () => {
			if (shellIntroOwnsPull()) return;
			const top = scroller.scrollTop;
			// A snap can rest a pixel short of its stop. That is still the stop, not a flight in progress.
			const progress =
				travel <= 0 || top <= REST_PX
					? 0
					: travel - top <= REST_PX
						? 1
						: Math.min(1, Math.max(0, top / travel));
			setShellPull(progress);
			const hideNext = progress <= 0;
			if (next && hideNext !== nextInert) {
				nextInert = hideNext;
				next.toggleAttribute('inert', hideNext);
			}
			const hidePin = progress >= 1;
			if (pin && hidePin !== pinInert) {
				pinInert = hidePin;
				pin.toggleAttribute('inert', hidePin);
			}
			for (const flight of flights) {
				const scale = 1 + (flight.targetScale - 1) * progress;
				const x =
					flight.originX +
					(flight.targetX - flight.originX) * progress -
					(flight.width * scale) / 2;
				const y =
					flight.originY +
					(flight.targetY - flight.originY) * progress -
					(flight.height * scale) / 2;
				flight.node.style.transform = `translate(${String(x)}px, ${String(y)}px) scale(${String(scale)})`;
			}
		};

		const onResize = () => {
			measure();
			update();
		};

		measure();
		update();
		scroller.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', onResize, { passive: true });
		window.addEventListener(SHELL_INTRO_DONE, onResize);
		void document.fonts.ready.then(onResize);
		return () => {
			scroller.removeEventListener('scroll', update);
			window.removeEventListener('resize', onResize);
			window.removeEventListener(SHELL_INTRO_DONE, onResize);
			for (const flight of flights) flight.node.style.transform = '';
		};
	}, [flightReady, itemRefs, reduced, runRef, scrollRoot]);

	return { reduced };
}
