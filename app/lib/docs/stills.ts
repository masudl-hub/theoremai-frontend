/**
 * The WebP renditions `npm run docs:stills` writes beside each PNG still the docs use. The PNG
 * stays the one source (chapters and figures name it, and link previews use it); pages draw the
 * renditions, which weigh about a tenth as much.
 */

/** Width of the small rendition, enough for a landing tile on a 2x screen. */
export const TILE_WIDTH = 800;

export function stillRenditions(src: string): { full: string; tile: string } {
	const base = src.replace(/\.png$/, '');
	return { full: `${base}.webp`, tile: `${base}.${String(TILE_WIDTH)}w.webp` };
}
