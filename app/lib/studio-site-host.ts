import type { StudioHost } from '@theoremjs/studio/ui/studio-host.ts';
import { KERNEL_PACKAGE_VERSION } from './kernel-version';
import { SITE_SUPPLIES } from './studio-supplies';
import { reportTh30Studio } from './th30-studio-state';
import { th30Surfaces } from './th30-surfaces';

/** What the site gives the studio screen, wherever it shows it: its build's pieces, and th30 following along. */
export const SITE_STUDIO_HOST: StudioHost = {
	kernelVersion: KERNEL_PACKAGE_VERSION,
	mountSurface: (surface) => th30Surfaces.mount(surface),
	onReport: reportTh30Studio,
	...SITE_SUPPLIES,
};
