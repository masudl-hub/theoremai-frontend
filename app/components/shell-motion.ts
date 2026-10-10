import {
	frameShape,
	OPEN_SHAPE,
	pinShellWhile,
	REGULAR_SHAPE,
	type ShellKind,
	type ShellShape,
} from '@theoremjs/studio/ui/shell-motion.ts';

/* The shell and how it moves are the studio package's (shell-motion.ts there). This is the site's
   part: which of its pages rests in which shape. */

/** Pages whose shell is a surface inside the page area. That surface carries `data-shell-frame`. */
const FRAME_PATHS = new Set(['/studio']);

/** th30's side panels sit beside the shell, so it holds still while one is open. */
pinShellWhile(() => {
	const root = document.documentElement;
	return root.classList.contains('th30-live') || root.classList.contains('th30-messages');
});

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

/** Overview, showcase and contribute are screens of the landing page; their routes redirect to it. */
const LANDING_SCREENS: Record<string, string | undefined> = {
	'/overview': '#overview',
	'/examples': '#showcase',
	'/contribute': '#contribute',
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
	return kind === 'frame' ? frameShape() : REGULAR_SHAPE;
}
