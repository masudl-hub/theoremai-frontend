/**
 * Compose virtual:docs/index with a throwaway Vite SSR server (full TS, not strip-only Node).
 * The /docs routes, the .md twins, llms.txt, the sitemap and Th30 all read that module.
 */

import path from 'node:path';
import { createServer } from 'vite';
import { kernelMetaDefine } from './kernel-meta.mjs';

export const DOCS_VIRTUAL = 'virtual:docs/index';
const LANDING_CSS = 'virtual:docs/landing.css';
const LANDING_CSS_RESOLVED = `\0${LANDING_CSS}`;
const DOCS_RESOLVED = `\0${DOCS_VIRTUAL}`;

/**
 * Run `use` with a throwaway SSR server that loads the site's own TypeScript.
 *
 * @template T
 * @param {{ repoRoot: string, theoremai: { root: string, source: string } }} args
 * @param {(load: (file: string) => Promise<Record<string, any>>) => Promise<T>} use
 * @returns {Promise<T>}
 */
async function withDocsServer({ repoRoot, theoremai }, use) {
	const server = await createServer({
		configFile: false,
		root: repoRoot,
		// Its own cache: in the default one its empty dependency metadata replaces the dev
		// server's, which then re-optimizes and answers open tabs with 504.
		cacheDir: path.join(repoRoot, 'node_modules/.vite-docs-index'),
		optimizeDeps: { noDiscovery: true, include: [] },
		define: kernelMetaDefine(theoremai),
		server: { middlewareMode: true, ws: false, fs: { allow: [repoRoot, theoremai.root] } },
		appType: 'custom',
		plugins: [],
	});
	try {
		return await use((file) => server.ssrLoadModule(file));
	} finally {
		await server.close();
	}
}

/**
 * The composed index, and the functions that read a chapter's Markdown, for the docs checks.
 *
 * @param {{ repoRoot: string, theoremai: { root: string, source: string } }} args
 */
export function loadDocs(args) {
	return withDocsServer(args, async (load) => {
		const compose = await load('/app/lib/docs/compose.ts');
		const markdown = await load('/app/lib/docs/chapter-markdown.ts');
		const index = await compose.composeDocIndex({
			publicRoot: path.join(args.repoRoot, 'public'),
			kernelRoot: args.theoremai.root,
		});
		return {
			index,
			authoredSamples: markdown.authoredSamples,
			markdownInlineCode: markdown.markdownInlineCode,
			markdownLinks: markdown.markdownLinks,
			markdownTables: markdown.markdownTables,
			sectionText: markdown.sectionText,
		};
	});
}

/**
 * @param {{ repoRoot: string, theoremai: { root: string, source: string } }} args
 */
export function docsIndexPlugin(args) {
	const { repoRoot } = args;
	/** @type {import('vite').ViteDevServer | undefined} */
	let parentServer;

	const runCompose = async () => (await loadDocs(args)).index;

	return {
		name: 'docs-index',
		configureServer(server) {
			parentServer = server;
			server.watcher.add(path.join(repoRoot, 'app/lib/docs'));
		},
		resolveId(id) {
			if (id === DOCS_VIRTUAL) return DOCS_RESOLVED;
			if (id === LANDING_CSS) return LANDING_CSS_RESOLVED;
		},
		async load(id) {
			if (id === LANDING_CSS_RESOLVED) {
				const index = await runCompose();
				const covers = index.articles.map((article) =>
					`.docs-landing [data-docs-cover="${article.slug}"] { object-position: ${article.cover.position}; filter: ${article.cover.filter ?? 'none'}; }`,
				);
				return covers.join('\n');
			}
			if (id !== DOCS_RESOLVED) return;
			return `export const docIndex = ${JSON.stringify(await runCompose())};`;
		},
		handleHotUpdate(ctx) {
			if (!ctx.file.includes(`${path.sep}app${path.sep}lib${path.sep}docs${path.sep}`)) return;
			const mod = parentServer?.moduleGraph.getModuleById(DOCS_RESOLVED);
			const css = parentServer?.moduleGraph.getModuleById(LANDING_CSS_RESOLVED);
			return [mod, css].filter((entry) => entry !== undefined);
		},
	};
}
