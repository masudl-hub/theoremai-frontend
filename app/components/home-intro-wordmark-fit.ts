import { type RefObject, useLayoutEffect } from 'react';

/** Binary-search font size so the word fills the track width without stretching or letter-spacing tricks. */
export function useHomeIntroWordmarkFit(
	trackRef: RefObject<HTMLElement | null>,
	wordRef: RefObject<HTMLElement | null>,
) {
	useLayoutEffect(() => {
		const track = trackRef.current;
		const word = wordRef.current;
		if (!track || !word) return;

		let alive = true;

		const fit = () => {
			if (!alive) return;
			const style = getComputedStyle(track);
			const width =
				track.clientWidth -
				Number.parseFloat(style.paddingLeft) -
				Number.parseFloat(style.paddingRight);
			if (width < 1) return;

			let lo = 8;
			let hi = 4000;
			while (lo < hi) {
				const mid = Math.ceil((lo + hi) / 2);
				track.style.setProperty('--home-intro-wordmark-size', `${String(mid)}px`);
				if (word.scrollWidth > width) hi = mid - 1;
				else lo = mid;
			}
			track.style.setProperty('--home-intro-wordmark-size', `${String(lo)}px`);
		};

		fit();
		const observer = new ResizeObserver(fit);
		observer.observe(track);
		void document.fonts.ready.then(fit);
		return () => {
			alive = false;
			observer.disconnect();
			track.style.removeProperty('--home-intro-wordmark-size');
		};
	}, [trackRef, wordRef]);
}
