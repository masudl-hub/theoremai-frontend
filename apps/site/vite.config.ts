import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import { kernelMetaDefine } from '../../scripts/kernel-meta.mjs';
import { resolveTheoremaiRoot } from '../../scripts/resolve-theoremai-root.mjs';

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteDir, '../..');
const theoremai = resolveTheoremaiRoot(repoRoot);

export default defineConfig({
	define: kernelMetaDefine(theoremai),
	plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), reactRouter()],
	resolve: {
		alias: {
			// Shared server + playground modules stay in the SvelteKit tree until cutover.
			$lib: path.join(repoRoot, 'src/lib'),
		},
		// The kernel packages live outside this workspace; pin React to the host install.
		dedupe: ['react', 'react-dom'],
	},
	server: {
		port: 5175,
		fs: { allow: [repoRoot, theoremai.root] },
	},
});
