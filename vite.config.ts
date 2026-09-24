import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import { kernelMetaDefine } from './scripts/kernel-meta.mjs';
import { resolveTheoremaiRoot } from './scripts/resolve-theoremai-root.mjs';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const theoremai = resolveTheoremaiRoot(repoRoot);

export default defineConfig({
	define: kernelMetaDefine(theoremai),
	plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), reactRouter()],
	resolve: {
		// The kernel packages live outside this repo; pin React, Astryx, and icons to the host
		// install so the package and the site share one copy (and one ThemeContext).
		dedupe: [
			'react',
			'react-dom',
			'@astryxdesign/core',
			'@astryxdesign/theme-neutral',
			'@tabler/icons-react',
		],
	},
	server: {
		fs: { allow: [repoRoot, theoremai.root] },
	},
});
