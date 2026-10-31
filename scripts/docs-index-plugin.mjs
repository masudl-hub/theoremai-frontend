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
export async function withDocsServer({ repoRoot, theoremai }, use) {
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
		const samples = await load('/app/lib/docs/sample-program.ts');
		const slots = await load('/app/lib/docs/code-slots.ts');
		const index = await compose.composeDocIndex({
			publicRoot: path.join(args.repoRoot, 'public'),
			kernelRoot: args.theoremai.root,
		});
		return {
			index,
			authoredSamples: markdown.authoredSamples,
			sampleProgram: samples.sampleProgram,
			sampleNames: slots.sampleNames,
			prepareSampleFolder: slots.prepareSampleFolder,
			sampleTsconfig: slots.SAMPLE_TSCONFIG,
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
	const { repoRoot, theoremai } = args;
	const docsRoot = path.join(repoRoot, 'app/lib/docs');
	const kernelRoot = path.join(theoremai.root, 'src');
	/** @type {import('vite').ViteDevServer | undefined} */
	let parentServer;

	/** One compose per change: the index and the landing CSS share it. */
	let composed;
	const runCompose = () => {
		composed ??= loadDocs(args).then(
			({ index }) => index,
			(error) => {
				composed = undefined;
				throw error;
			},
		);
		return composed;
	};

	return {
		name: 'docs-index',
		configureServer(server) {
			parentServer = server;
			server.config.configFileDependencies.push(
				path.join(kernelRoot, 'kernel/types.ts'),
				path.join(kernelRoot, 'guardrails/detectors.ts'),
			);
			server.watcher.add([docsRoot, kernelRoot]);
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
			if (![docsRoot, kernelRoot].some((root) => ctx.file.startsWith(`${root}${path.sep}`))) return;
			composed = undefined;
			if (!parentServer) return;
			for (const environment of Object.values(parentServer.environments)) {
				for (const id of [DOCS_RESOLVED, LANDING_CSS_RESOLVED]) {
					const module = environment.moduleGraph.getModuleById(id);
					if (module) environment.moduleGraph.invalidateModule(module);
				}
				environment.hot.send({ type: 'full-reload' });
			}
			return ctx.modules;
		},
	};
}
