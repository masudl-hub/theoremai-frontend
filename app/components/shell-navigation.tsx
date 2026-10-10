import {
	captureShape,
	HOLD_MS,
	hasCapturedShape,
	holdShell,
	moveShell,
	peekShape,
	prefersReducedMotion,
	REGULAR_SHAPE,
	settleShell,
	shellCanMove,
	sleep,
	takeShape,
} from '@theoremjs/studio/ui/shell-motion.ts';
import { TheoremMark } from '@theoremjs/studio/ui/theorem-mark.tsx';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigation } from 'react-router';
import { shapeAt } from './shell-motion';

const SHOW_AFTER_MS = 180;
const HOLD_AFTER_DRAW_MS = 80;
const MARK_OUT_MS = 180;
const DRAW_CAP_MS = 2800;
const MAIN_ID = 'astryx-app-shell-main';

/** A navigation that has been pending long enough to need the mark. */
type Flight = { loading: Promise<boolean> | null };

/**
 * Runs every route change in the shell. A change that is ready at once is the page fading out, the
 * shell moving to the next page's shape, and the page fading in. One that has to load goes to the
 * regular shell first, draws the mark there, then moves to the next page's shape. The mark is only
 * ever on the shell, never on the black ground, and only when the page is not ready.
 */
export function NavMark() {
	const { pathname, hash } = useLocation();
	const pending = useNavigation().state === 'loading';
	const [mark, setMark] = useState<'off' | 'draw' | 'out'>('off');
	const [host, setHost] = useState<HTMLElement | null>(null);
	const flight = useRef<Flight | null>(null);
	const timer = useRef(0);
	const here = useRef(pathname);
	const drawn = useRef({ done: false, resolve: () => {} });

	const markDrawn = useCallback(() => {
		drawn.current.done = true;
		drawn.current.resolve();
	}, []);

	useLayoutEffect(() => {
		if (pending) {
			if (flight.current) return;
			if (!hasCapturedShape()) captureShape(shapeAt(here.current, hash));
			const own: Flight = { loading: null };
			drawn.current.done = false;
			flight.current = own;
			timer.current = window.setTimeout(() => {
				own.loading = (async () => {
					const from = peekShape();
					const held = document.documentElement.hasAttribute('data-shell-hold');
					holdShell();
					if (!held && shellCanMove()) await sleep(HOLD_MS);
					if (from.kind !== 'regular' && !(await moveShell(from, REGULAR_SHAPE))) return false;
					setMark('draw');
					return true;
				})();
			}, SHOW_AFTER_MS);
			return;
		}

		const own = flight.current;
		const moved = pathname !== here.current;
		here.current = pathname;
		if (!own && !moved) {
			if (document.documentElement.hasAttribute('data-shell-hold')) {
				settleShell(shapeAt(pathname, hash));
			}
			return;
		}
		window.clearTimeout(timer.current);
		flight.current = null;
		const to = shapeAt(pathname, hash);
		const from = takeShape();

		const loading = own?.loading;
		if (!loading) {
			if (from.kind === to.kind) {
				settleShell(to);
				return;
			}
			void moveShell(from, to).then((arrived) => {
				if (arrived) settleShell(to);
			});
			return;
		}

		void (async () => {
			if (!(await loading)) return;
			if (!drawn.current.done) {
				const dot = new Promise<void>((resolve) => {
					drawn.current.resolve = resolve;
				});
				await Promise.race([dot, sleep(DRAW_CAP_MS)]);
			}
			await sleep(HOLD_AFTER_DRAW_MS);
			setMark('out');
			await sleep(MARK_OUT_MS);
			if (to.kind !== 'regular' && !(await moveShell(REGULAR_SHAPE, to))) return;
			settleShell(to);
			setMark('off');
		})();
	}, [pathname, hash, pending]);

	useEffect(() => {
		return () => {
			window.clearTimeout(timer.current);
		};
	}, []);

	useEffect(() => {
		if (mark === 'off') return;
		setHost(document.getElementById(MAIN_ID));
		if (mark === 'draw' && prefersReducedMotion()) markDrawn();
	}, [mark, markDrawn]);

	if (mark === 'off' || !host) return null;

	return createPortal(
		<div
			className="nav-mark"
			data-out={mark === 'out' ? '' : undefined}
			role="status"
			aria-live="polite"
			aria-label="Loading"
			onAnimationEnd={(event) => {
				if (event.animationName === 'theorem-mark-dot-in') markDrawn();
			}}
		>
			<TheoremMark ink="#fff" />
		</div>,
		host,
	);
}
