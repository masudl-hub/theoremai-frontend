import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigation } from 'react-router';
import { TheoremMark } from './theorem-mark';

const SHOW_AFTER_MS = 180;
const HOLD_AFTER_DRAW_MS = 80;
const MAIN_ID = 'astryx-app-shell-main';

function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The page panel to cover, looked up once the cover first shows. */
function useMainHost(shown: boolean): HTMLElement | null {
	const [host, setHost] = useState<HTMLElement | null>(null);
	useEffect(() => {
		if (!shown) return;
		setHost(document.getElementById(MAIN_ID));
	}, [shown]);
	return host;
}

/** When the cover shows and leaves: after a short wait for a pending navigation, until the mark has drawn. */
function useNavMarkCover() {
	const pending = useNavigation().state === 'loading';
	const pendingRef = useRef(pending);
	pendingRef.current = pending;

	const [shown, setShown] = useState(false);
	const [leaving, setLeaving] = useState(false);
	const [drawn, setDrawn] = useState(false);

	useEffect(() => {
		if (!pending) return;
		setDrawn(false);
		const id = window.setTimeout(() => {
			setLeaving(false);
			setShown(true);
		}, SHOW_AFTER_MS);
		return () => {
			window.clearTimeout(id);
		};
	}, [pending]);

	const host = useMainHost(shown);

	useEffect(() => {
		if (!leaving) return;
		const id = window.setTimeout(() => {
			setShown(false);
			setLeaving(false);
			setDrawn(false);
		}, 480);
		return () => {
			window.clearTimeout(id);
		};
	}, [leaving]);

	useEffect(() => {
		if (pending || !shown) return;
		if (prefersReducedMotion()) {
			setShown(false);
			setLeaving(false);
			return;
		}
		if (!drawn) return;
		const id = window.setTimeout(() => {
			if (!pendingRef.current) setLeaving(true);
		}, HOLD_AFTER_DRAW_MS);
		return () => {
			window.clearTimeout(id);
		};
	}, [pending, shown, drawn]);

	return { shown, leaving, host, setShown, setLeaving, setDrawn };
}

/**
 * Covers the page panel while a navigation is actually pending. The rail stays.
 * A fast client transition never mounts this.
 */
export function NavMark() {
	const { shown, leaving, host, setShown, setLeaving, setDrawn } = useNavMarkCover();

	if (!shown || !host) return null;

	return createPortal(
		<div
			className="nav-mark"
			data-leaving={leaving ? '' : undefined}
			role="status"
			aria-live="polite"
			aria-label="Loading"
			onAnimationEnd={(event) => {
				if (event.animationName === 'nav-mark-out' && event.target === event.currentTarget) {
					setShown(false);
					setLeaving(false);
					setDrawn(false);
					return;
				}
				if (event.animationName !== 'theorem-mark-dot-in') return;
				setDrawn(true);
			}}
		>
			<TheoremMark ink="#fff" />
		</div>,
		host,
	);
}
