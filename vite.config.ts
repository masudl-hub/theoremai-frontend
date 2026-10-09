import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import { studioVite } from '@theoremjs/studio/vite';
import { defineConfig, type Plugin } from 'vite';
import { docsIndexPlugin } from './scripts/docs-index-plugin.mjs';
import { kernelMetaDefine } from './scripts/kernel-meta.mjs';
import { resolveTheoremaiRoot } from './scripts/resolve-theoremai-root.mjs';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const theoremai = resolveTheoremaiRoot(repoRoot);

/**
 * Dev only: each named import from the Tabler barrel becomes an import of that
 * icon's own file, so the dev server never prebundles and parses all ~6,000
 * icons (about 15 MB of JS per tab). Builds tree-shake the barrel already.
 */
function tablerIconFiles(): Plugin {
	return {
		name: 'tabler-icon-files',
		apply: 'serve',
		transform(code, id, options) {
			// The server keeps the barrel: its per-icon files would load a second React there.
			if (options?.ssr || id.includes('/node_modules/') || !code.includes('@tabler/icons-react'))
				return;
			// Joined with spaces, so the module keeps its line numbers.
			return code.replace(
				/import\s*\{([^}]*)\}\s*from\s*['"]@tabler\/icons-react['"];?/g,
				(_, names: string) =>
					names
						.split(',')
						.map((name) => name.trim())
						.filter(Boolean)
						.map((name) => {
							const [icon, local = icon] = name.split(/\s+as\s+/);
							return `import ${local} from '@tabler/icons-react/dist/esm/icons/${icon}.mjs';`;
						})
						.join(' '),
			);
		},
	};
}

export default defineConfig({
	define: kernelMetaDefine(theoremai),
	plugins: [
		tablerIconFiles(),
		docsIndexPlugin({ repoRoot, theoremai }),
		studioVite({ hostRoot: repoRoot }),
		cloudflare({ viteEnvironment: { name: 'ssr' } }),
		reactRouter(),
	],
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
	optimizeDeps: {
		// Scan every source up front, lazy chunks included, so a dependency first reached mid-session
		// (the trace's PowerSearch) never forces a re-optimize that strands open tabs on a 504.
		entries: [
			'app/**/*.tsx',
			`${theoremai.root}/react/src/**/*.tsx`,
			`${theoremai.root}/studio/**/*.{ts,tsx}`,
			`!${theoremai.root}/studio/app/**`,
			`!${theoremai.root}/**/*.test.*`,
		],
		// Served per icon by tablerIconFiles instead.
		exclude: ['@tabler/icons-react'],
	},
	server: {
		// Dual-stack: browsers resolve `localhost` to ::1 first; IPv4-only binds look dead.
		host: true,
		port: 5173,
		strictPort: true,
		fs: { allow: [repoRoot, theoremai.root] },
	},
});
