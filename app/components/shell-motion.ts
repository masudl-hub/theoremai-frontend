/** This document has already drawn the mark. A full reload clears it; a route change does not. */
let played = false;

export function bootHasPlayed(): boolean {
	return played;
}

/** Fired when the mark gives way, before the shell moves, so the cover attribute can drop. */
export const SHELL_REVEAL = 'theorem-shell-reveal';

/** Fired when the shell has settled and scroll may own it again. */
export const SHELL_INTRO_DONE = 'theorem-shell-intro-done';

/**
 * The shell is one surface. It rests in one of three shapes, and a route change moves it from the
 * shape of the page it leaves to the shape of the page it opens:
 * - open: the whole viewport. The landing screen.
 * - regular: the panel beside the rail. Every other page.
 * - frame: the panel's start edge, as wide as the page's own surface. The playground's editor.
 */
export type ShellShape = { kind: 'open' } | { kind: 'regular' } | { kind: 'frame'; width: number };

export type ShellKind = ShellShape['kind'];

export const OPEN_SHAPE: ShellShape = { kind: 'open' };
export const REGULAR_SHAPE: ShellShape = { kind: 'regular' };

/** Pages whose shell is a surface inside the page area. That surface carries `data-shell-frame`. */
const FRAME_PATHS = new Set(['/playground']);

const FRAME_WIDTH = '--shell-frame-width';
const MAIN_ID = 'astryx-app-shell-main';
const MOVE_CAP_MS = 1000;

/** How long content takes to fade out. Keep in step with `--shell-hold-ms` in shell.css. */
export const HOLD_MS = 140;

/** The landing screen rests full-bleed. */
export function shellRestsOpen(pathname: string, hash: string): boolean {
	if (pathname !== '/') return false;
	const id = decodeURIComponent(hash.replace(/^#/, ''));
	return id === '' || id === 'landing';
}

export function shellKindFor(pathname: string, hash: string): ShellKind {
	if (shellRestsOpen(pathname, hash)) return 'open';
	return FRAME_PATHS.has(pathname) ? 'frame' : 'regular';
}

/** Overview and showcase are screens of the landing page; their routes redirect to it. */
const LANDING_SCREENS: Record<string, string | undefined> = {
	'/overview': '#overview',
	'/examples': '#showcase',
};

/** The kind of shell a link opens, or null when it is not a page of this site. */
export function shellKindOfHref(href: string): { pathname: string; kind: ShellKind } | null {
	if (!href.startsWith('/') || href.startsWith('//')) return null;
	const url = new URL(href, 'http://theorem.invalid');
	const screen = LANDING_SCREENS[url.pathname];
	const pathname = screen ? '/' : url.pathname;
	return { pathname, kind: shellKindFor(pathname, screen ?? url.hash) };
}

/** The shape this location rests in, measured from the page that is on screen. */
export function shapeAt(pathname: string, hash: string): ShellShape {
	const kind = shellKindFor(pathname, hash);
	if (kind === 'open') return OPEN_SHAPE;
	if (kind === 'frame') {
		const frame = document.querySelector<HTMLElement>('[data-shell-frame]');
		return frame ? { kind, width: frame.offsetWidth } : REGULAR_SHAPE;
	}
	return REGULAR_SHAPE;
}

/** Where the shell last came to rest, for a route change that gave no warning. */
let rest: ShellShape = OPEN_SHAPE;

/** The shape measured when a route change began, while the page it leaves was still on screen. */
let captured: ShellShape | null = null;

export function captureShape(pathname: string, hash: string): void {
	captured = shapeAt(pathname, hash);
}

export function hasCapturedShape(): boolean {
	return captured !== null;
}

export function peekShape(): ShellShape {
	return captured ?? rest;
}

/** The shape the shell is leaving, and the claim on it: the next route change starts afresh. */
export function takeShape(): ShellShape {
	const shape = captured ?? rest;
	captured = null;
	return shape;
}

export function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms);
	});
}

/** Whether the shell can move. A narrow screen, reduced motion and th30's side panels cannot. */
export function shellCanMove(): boolean {
	const root = document.documentElement;
	return (
		window.matchMedia('(min-width: 768px)').matches &&
		!window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
		!root.classList.contains('th30-live') &&
		!root.classList.contains('th30-messages')
	);
}

function introOwnsShell(): boolean {
	const root = document.documentElement;
	return root.hasAttribute('data-boot-pending') || root.hasAttribute('data-shell-move');
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

/** The page's content fades out and stays out until the shell settles. */
export function holdShell(): void {
	document.documentElement.dataset.shellHold = '';
}

/**
 * Put the shell into move mode at the shape it is in. A route that mounts under it, the landing
 * page above all, then finds the shell already drawn as a clip and cannot snap it to its own shape.
 */
export function enterShell(from: ShellShape): void {
	const root = document.documentElement;
	const main = document.getElementById(MAIN_ID);
	if (!main || !shellCanMove() || root.hasAttribute('data-shell-move')) return;
	if (from.kind === 'frame') root.style.setProperty(FRAME_WIDTH, `${String(from.width)}px`);
	root.dataset.shellClip = from.kind;
	root.dataset.shellMove = '';
	getComputedStyle(main).getPropertyValue('clip-path');
}

/** Each move claims the shell; a claim that was overtaken must not settle it. */
let claim = 0;

/**
 * Move the shell from one shape to another, content hidden. If it is already moving, it carries on
 * from the shape it is in. Resolves true when it arrives, false when a newer move overtook it. It
 * stays in its last shape until `settleShell`, so a page that is still loading can wait on it.
 */
export function moveShell(from: ShellShape, to: ShellShape): Promise<boolean> {
	const root = document.documentElement;
	const main = document.getElementById(MAIN_ID);
	const mine = ++claim;
	if (!main || !shellCanMove()) return Promise.resolve(true);

	const moving = root.hasAttribute('data-shell-move');
	if (moving && root.dataset.shellClip === to.kind) return Promise.resolve(true);
	const frame = from.kind === 'frame' ? from : to.kind === 'frame' ? to : null;
	if (frame) root.style.setProperty(FRAME_WIDTH, `${String(frame.width)}px`);
	if (!moving) {
		root.dataset.shellClip = from.kind;
		root.dataset.shellMove = '';
	}
	/* The first shape has to be drawn once, so the second one is a change to ease and not a start. */
	getComputedStyle(main).getPropertyValue('clip-path');
	root.dataset.shellClip = to.kind;

	return new Promise((resolve) => {
		const done = () => {
			main.removeEventListener('transitionend', onEnd);
			window.clearTimeout(cap);
			resolve(claim === mine);
		};
		const onEnd = (event: TransitionEvent) => {
			if (event.target === main && event.propertyName === 'clip-path') done();
		};
		main.addEventListener('transitionend', onEnd);
		const cap = window.setTimeout(done, MOVE_CAP_MS);
	});
}

/** The shell rests. The page's content comes in at the size it will keep. */
export function settleShell(to: ShellShape): void {
	const root = document.documentElement;
	const shown = root.hasAttribute('data-shell-move') || root.hasAttribute('data-shell-hold');
	delete root.dataset.shellMove;
	delete root.dataset.shellClip;
	delete root.dataset.shellHold;
	root.style.removeProperty(FRAME_WIDTH);
	if (shown) showContent(root);
	rest = to;
	window.dispatchEvent(new Event(SHELL_INTRO_DONE));
}

/**
 * The mark has finished inside the full-bleed shell. The page stays hidden while the shell moves to
 * the shape of the page it opens, then comes in. Landing stays open.
 */
export function revealShell(to: ShellShape) {
	played = true;
	const root = document.documentElement;
	const main = document.getElementById(MAIN_ID);
	const moves = Boolean(main) && shellCanMove() && to.kind !== 'open';
	if (moves) {
		root.dataset.shellClip = 'open';
		root.dataset.shellMove = '';
	}
	delete root.dataset.bootPending;
	window.dispatchEvent(new Event(SHELL_REVEAL));
	if (!moves) {
		showContent(root);
		rest = to;
		window.dispatchEvent(new Event(SHELL_INTRO_DONE));
		return;
	}
	void moveShell(OPEN_SHAPE, to).then((arrived) => {
		if (arrived) settleShell(to);
	});
}
