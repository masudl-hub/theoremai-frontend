/**
 * The WebP renditions `npm run stills` writes beside each PNG still in public/imagery. The PNG
 * stays the one source (code and chapters name it, and link previews use it); pages draw the
 * renditions. They are near-lossless: the eye cannot tell them from the PNG.
 */

/** Width of the small rendition, enough for a tile up to 400px wide on a 2x screen. */
export const TILE_WIDTH = 800;

export function stillRenditions(src: string): { full: string; tile: string } {
	const base = src.replace(/\.png$/, '');
	return { full: `${base}.webp`, tile: `${base}.${String(TILE_WIDTH)}w.webp` };
}
