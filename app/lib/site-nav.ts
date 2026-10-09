import { SITE_PAGES } from '@theoremjs/studio/ui/studio-nav.ts';
import { PACKAGE_ICONS, PAGE_ICONS } from '@theoremjs/studio/ui/studio-shell.tsx';
import { PACKAGE_LINKS } from './home-content';

/** The rail's rows with their icons, for the landing page's own copy of them. */
export const SITE_SECTIONS = SITE_PAGES.map((page) => ({
	...page,
	icon: PAGE_ICONS[page.label],
}));

export const SITE_PACKAGES = PACKAGE_LINKS.map((link) => ({
	...link,
	icon: PACKAGE_ICONS[link.label],
}));
