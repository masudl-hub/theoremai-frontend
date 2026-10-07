import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { bootHasPlayed, prefersReducedMotion, revealShell, shapeAt, sleep } from './shell-motion';
import { TheoremMark } from './theorem-mark';
import './theorem-mark.css';

const DRAW_CAP_MS = 2800;
const HOLD_MS = 90;
const REDUCED_HOLD_MS = 200;
const FONT_CAP_MS = 500;

/** Resolves when the mark's dot has drawn in, at once with reduced motion, or after the cap. */
function markDrawn(root: HTMLDivElement, reduced: boolean): Promise<void> {
	return new Promise<void>((resolve) => {
		if (reduced) {
			resolve();
			return;
		}
		const dot = root.querySelector('.theorem-mark-dot');
		const cap = window.setTimeout(resolve, DRAW_CAP_MS);
		const finish = () => {
			window.clearTimeout(cap);
			resolve();
		};
		if (!(dot instanceof SVGCircleElement)) {
			finish();
			return;
		}
		const finished = dot.getAnimations().some((animation) => animation.playState === 'finished');
		if (finished) {
			finish();
			return;
		}
		const onEnd = (event: AnimationEvent) => {
			if (event.animationName !== 'theorem-mark-dot-in') return;
			dot.removeEventListener('animationend', onEnd);
			finish();
		};
		dot.addEventListener('animationend', onEnd);
	});
}

/** Whether the pen has begun. Until it does, the panel is blank and there is nothing to wait out. */
function penHasStarted(root: HTMLDivElement): boolean {
	const pen = root.querySelector('.theorem-mark-stroke')?.getAnimations()[0];
	const delay = pen?.effect?.getTiming().delay ?? 0;
	return Number(pen?.currentTime ?? 0) > delay;
}

/** Resolves when the fonts are ready, or after the cap. */
function fontsSettled(): Promise<void> {
	return Promise.race([document.fonts.ready.then(() => undefined), sleep(FONT_CAP_MS)]);
}

/**
 * The mark draws in the shell only when the page is still loading. When the dot lands, or at once
 * when the page was ready first, that same panel pulls in over the page. Landing stays full-bleed; scroll still owns that pull.
 */
function useBootPhase() {
	const [phase, setPhase] = useState<'draw' | 'done'>(() => (bootHasPlayed() ? 'done' : 'draw'));
	const rootRef = useRef<HTMLDivElement>(null);
	const { pathname, hash } = useLocation();
	const place = useRef({ pathname, hash });
	place.current = { pathname, hash };

	useEffect(() => {
		const root = rootRef.current;
		if (!root || bootHasPlayed()) return;

		const reduced = prefersReducedMotion();
		let cancelled = false;
		let revealed = false;

		const reveal = () => {
			if (cancelled || revealed) return;
			revealed = true;
			const { pathname: path, hash: at } = place.current;
			revealShell(shapeAt(path, at));
			setPhase('done');
		};

		/* The page is ready once the fonts are. If that comes before the pen starts (its delay in
		   theorem-mark.css), no mark was ever on screen and the panel pulls in at once. Once the
		   pen has started, it finishes. */
		void fontsSettled()
			.then(() => {
				if (!reduced && !penHasStarted(root)) return undefined;
				return markDrawn(root, reduced).then(() => sleep(reduced ? REDUCED_HOLD_MS : HOLD_MS));
			})
			.then(reveal);

		return () => {
			cancelled = true;
		};
	}, []);

	return { phase, rootRef };
}

/**
 * Draws inside the shell panel. The shell starts full-bleed; this only decides when that panel
 * pulls in over the page.
 */
export function BootMark() {
	const { phase, rootRef } = useBootPhase();

	if (phase === 'done') return null;

	return (
		<div ref={rootRef} data-boot="" role="status" aria-live="polite" aria-label="Loading">
			<TheoremMark />
		</div>
	);
}
