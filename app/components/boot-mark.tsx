import { useEffect, useRef, useState } from 'react';
import { TheoremMark } from './theorem-mark';
import './theorem-mark.css';

const DRAW_CAP_MS = 2800;
const HOLD_MS = 90;
const REDUCED_HOLD_MS = 200;
const FONT_CAP_MS = 500;

function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms);
	});
}

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

/** Resolves when the fonts are ready, or after the cap. */
function fontsSettled(): Promise<void> {
	return Promise.race([document.fonts.ready.then(() => undefined), sleep(FONT_CAP_MS)]);
}

/**
 * The cover's phase: it lifts once the mark has drawn and the fonts are in, after a short hold,
 * then fades out.
 */
function useBootPhase() {
	const [phase, setPhase] = useState<'draw' | 'leave' | 'done'>('draw');
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;

		const reduced = prefersReducedMotion();
		let cancelled = false;
		let revealed = false;

		const reveal = () => {
			if (cancelled || revealed) return;
			revealed = true;
			delete document.documentElement.dataset.bootPending;
			setPhase(reduced ? 'done' : 'leave');
		};

		const drawDone = markDrawn(root, reduced);
		const fontsDone = fontsSettled();

		void Promise.all([drawDone, fontsDone])
			.then(() => sleep(reduced ? REDUCED_HOLD_MS : HOLD_MS))
			.then(reveal);

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (phase !== 'leave') return;
		const id = window.setTimeout(() => {
			setPhase('done');
		}, 560);
		return () => {
			window.clearTimeout(id);
		};
	}, [phase]);

	return { phase, setPhase, rootRef };
}

/**
 * First paint is black, then the favicon mark draws, then the shell is revealed underneath.
 * The draw runs from CSS so it can start before hydration; this only decides when to lift the cover.
 */
export function BootMark() {
	const { phase, setPhase, rootRef } = useBootPhase();

	if (phase === 'done') return null;

	return (
		<div
			ref={rootRef}
			data-boot=""
			data-leaving={phase === 'leave' ? '' : undefined}
			role="status"
			aria-live="polite"
			aria-label="Loading"
			aria-hidden={phase === 'leave' ? true : undefined}
			onTransitionEnd={(event) => {
				if (event.target !== event.currentTarget || event.propertyName !== 'opacity') return;
				setPhase('done');
			}}
		>
			<TheoremMark ink="#fff" />
		</div>
	);
}
