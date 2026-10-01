import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import { docsIndexPlugin } from './scripts/docs-index-plugin.mjs';
import { kernelMetaDefine } from './scripts/kernel-meta.mjs';
import { resolveTheoremaiRoot } from './scripts/resolve-theoremai-root.mjs';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const theoremai = resolveTheoremaiRoot(repoRoot);

export default defineConfig({
	define: kernelMetaDefine(theoremai),
	plugins: [
		docsIndexPlugin({ repoRoot, theoremai }),
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
		holdUntilCrawlEnd: true,
		include: [
			'@astryxdesign/core/AppShell',
			'@astryxdesign/core/Banner',
			'@astryxdesign/core/Button',
			'@astryxdesign/core/Card',
			'@astryxdesign/core/CodeBlock',
			'@astryxdesign/core/Dialog',
			'@astryxdesign/core/HStack',
			'@astryxdesign/core/Heading',
			'@astryxdesign/core/IconButton',
			'@astryxdesign/core/Layout',
			'@astryxdesign/core/Link',
			'@astryxdesign/core/Outline',
			'@astryxdesign/core/Resizable',
			'@astryxdesign/core/ScrollableArea',
			'@astryxdesign/core/Section',
			'@astryxdesign/core/SideNav',
			'@astryxdesign/core/Stack',
			'@astryxdesign/core/Text',
			'@astryxdesign/core/TextInput',
			'@astryxdesign/core/Token',
			'@astryxdesign/core/VStack',
			'@astryxdesign/core/theme',
			'@tabler/icons-react',
		],
	},
	server: {
		// Dual-stack: browsers resolve `localhost` to ::1 first; IPv4-only binds look dead.
		host: true,
		port: 5173,
		strictPort: true,
		fs: { allow: [repoRoot, theoremai.root] },
	},
});
