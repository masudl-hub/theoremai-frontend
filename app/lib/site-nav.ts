import { IconBook2, IconBrandGithub, IconBrandNpm, IconPlayerPlay } from '@tabler/icons-react';
import { IconJsr } from '../components/jsr-icon';

export const SITE_SECTIONS = [
	{ label: 'Playground', href: '/playground', icon: IconPlayerPlay },
	{ label: 'Docs', href: '/docs', icon: IconBook2 },
] as const;

export const SITE_PACKAGES = [
	{ label: 'GitHub', href: 'https://github.com/masudl-hub/theoremai', icon: IconBrandGithub },
	{ label: 'JSR', href: 'https://jsr.io/@theoremjs/agents', icon: IconJsr },
	{ label: 'npm', href: 'https://www.npmjs.com/package/@theoremjs%2Fagents', icon: IconBrandNpm },
] as const;

export const KERNEL_INSTALL_CMD = 'npm install @theoremjs/agents zod';

export const HOME_TAGLINE =
	'Typed, composable agents for text, image, speech, and live voice — guarded on every turn.';
