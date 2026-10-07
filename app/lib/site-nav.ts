import { IconBook2, IconBrandGithub, IconBrandNpm, IconPlayerPlay } from '@tabler/icons-react';
import { IconJsr } from '../components/jsr-icon';
import { PACKAGE_LINKS, SITE_PAGES } from './home-content';

const SECTION_ICONS = { Playground: IconPlayerPlay, Docs: IconBook2 } as const;
const PACKAGE_ICONS = { GitHub: IconBrandGithub, JSR: IconJsr, npm: IconBrandNpm } as const;

export const SITE_SECTIONS = SITE_PAGES.map((page) => ({
	...page,
	icon: SECTION_ICONS[page.label],
}));

export const SITE_PACKAGES = PACKAGE_LINKS.map((link) => ({
	...link,
	icon: PACKAGE_ICONS[link.label],
}));
