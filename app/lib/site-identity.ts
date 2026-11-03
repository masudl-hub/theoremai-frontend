/**
 * The site's name and links. Every page's shell reads these, so nothing here may import the kernel's
 * catalog the way the landing page's content does.
 */
import { packageLinks } from '@theoremjs/studio/ui/studio-nav.ts';

const repository: unknown = (import.meta.env as Record<string, unknown>).KERNEL_REPOSITORY;

export const SITE_NAME = 'theorem';
/** The site's own address, for a page built ahead of time, which has no request to read it from. */
export const SITE_ORIGIN = 'https://theorem.masudlewis.com';
export const KERNEL_NAME = '@theoremjs/agents';
export const REPO_URL =
	typeof repository === 'string' && repository
		? repository
		: 'https://github.com/masudl-hub/theoremai';
export const DISCORD_URL = 'https://discord.gg/X6RQvSWQ58';
export const PACKAGE_LINKS = packageLinks(KERNEL_NAME, REPO_URL);
