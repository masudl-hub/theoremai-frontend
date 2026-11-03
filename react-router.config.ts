import type { Config } from '@react-router/dev/config';

export default {
	ssr: true,
	// Served as a static file, so opening the docs never waits on a Worker starting.
	prerender: ['/docs'],
} satisfies Config;
