/** This document has already drawn the mark. A full reload clears it; a route change does not. */
let played = false;

export function bootHasPlayed(): boolean {
	return played;
}

/** Fired when the mark gives way, before the pull, so the cover attribute can drop. */
export const SHELL_REVEAL = 'theorem-shell-reveal';

/** Fired when the pull has settled and scroll may own the shell again. */
export const SHELL_INTRO_DONE = 'theorem-shell-intro-done';

const PULL = '--home-shell-pull';

function setPull(value: string) {
	document.documentElement.style.setProperty(PULL, value);
	document.querySelector<HTMLElement>('.astryx-app-shell')?.style.setProperty(PULL, value);
}

/** The landing screen rests full-bleed. Every other screen contracts to the rail. */
export function shellRestsOpen(pathname: string, hash: string): boolean {
	if (pathname !== '/') return false;
	const id = decodeURIComponent(hash.replace(/^#/, ''));
	return id === '' || id === 'landing';
}

function introOwnsShell(): boolean {
	const root = document.documentElement;
	return root.hasAttribute('data-boot-pending') || root.hasAttribute('data-shell-pull');
}

export function shellIntroOwnsPull(): boolean {
	return introOwnsShell();
}

function showContent(root: HTMLElement) {
	root.dataset.shellIn = '';
	window.setTimeout(() => {
		delete root.dataset.shellIn;
	}, 320);
}

/**
 * The mark has finished inside the full-bleed shell. The page stays hidden while
 * the panel contracts, then comes in at the settled size. Landing stays open.
 */
export function revealShell(restsOpen: boolean) {
	played = true;
	const root = document.documentElement;
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const wide = window.matchMedia('(min-width: 768px)').matches;
	const pull = !restsOpen && !reduced && wide;
	if (pull) {
		root.dataset.shellPull = '';
		setPull('0');
	}
	delete root.dataset.bootPending;
	window.dispatchEvent(new Event(SHELL_REVEAL));
	if (!pull) {
		showContent(root);
		window.dispatchEvent(new Event(SHELL_INTRO_DONE));
		return;
	}

	const main = document.getElementById('astryx-app-shell-main');
	let settled = false;
	const settle = () => {
		if (settled) return;
		settled = true;
		main?.removeEventListener('transitionend', onEnd);
		window.clearTimeout(cap);
		delete root.dataset.shellPull;
		showContent(root);
		window.dispatchEvent(new Event(SHELL_INTRO_DONE));
		if (!document.querySelector('.theorem-home-shell')) {
			root.style.removeProperty(PULL);
			document.querySelector<HTMLElement>('.astryx-app-shell')?.style.removeProperty(PULL);
		}
	};
	const onEnd = (event: TransitionEvent) => {
		if (event.target !== main || event.propertyName !== 'clip-path') return;
		settle();
	};
	main?.addEventListener('transitionend', onEnd);
	const cap = window.setTimeout(settle, 1000);
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			setPull('1');
		});
	});
}
