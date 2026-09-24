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
		// The kernel packages live outside this repo; pin React to the host install.
		dedupe: ['react', 'react-dom'],
	},
	server: {
		fs: { allow: [repoRoot, theoremai.root] },
	},
});
