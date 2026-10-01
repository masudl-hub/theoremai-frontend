/**
 * Compose virtual:docs/index with a throwaway Vite SSR server (full TS, not strip-only Node).
 * The /docs routes, the .md twins, llms.txt, the sitemap and Th30 all read that module.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createServer } from 'vite';
import { kernelMetaDefine } from './kernel-meta.mjs';

export const DOCS_VIRTUAL = 'virtual:docs/index';
const DOCS_RESOLVED = `\0${DOCS_VIRTUAL}`;

/** Last commit time touching these paths, or undefined when git cannot answer. Never mtime. */
function gitIso(root, paths) {
	try {
		const out = execFileSync('git', ['-C', root, 'log', '-1', '--format=%cI', '--', ...paths], {
			encoding: 'utf8',
		}).trim();
		return out || undefined;
	} catch {
		return undefined;
	}
}

/**
 * @param {{ repoRoot: string, theoremai: { root: string, source: string } }} args
 */
export function docsIndexPlugin({ repoRoot, theoremai }) {
	/** @type {import('vite').ViteDevServer | undefined} */
	let parentServer;

	async function runCompose() {
		// Pages are written against the kernel, so they are as fresh as the later of the two.
		const dateModified = [gitIso(repoRoot, ['app/lib/docs']), gitIso(theoremai.root, ['src', 'README.md'])]
			.filter(Boolean)
			.sort()
			.at(-1);
		const server = await createServer({
			configFile: false,
			root: repoRoot,
			define: kernelMetaDefine(theoremai),
			server: { middlewareMode: true, ws: false, fs: { allow: [repoRoot, theoremai.root] } },
			appType: 'custom',
			plugins: [],
		});
		try {
			const mod = await server.ssrLoadModule('/app/lib/docs/compose.ts');
			return mod.composeDocIndex({
				dateModified,
				publicRoot: path.join(repoRoot, 'public'),
				kernelRoot: theoremai.root,
			});
		} finally {
			await server.close();
		}
	}

	return {
		name: 'docs-index',
		configureServer(server) {
			parentServer = server;
			server.watcher.add(path.join(repoRoot, 'app/lib/docs'));
		},
		resolveId(id) {
			if (id === DOCS_VIRTUAL) return DOCS_RESOLVED;
		},
		async load(id) {
			if (id !== DOCS_RESOLVED) return;
			return `export const docIndex = ${JSON.stringify(await runCompose())};`;
		},
		handleHotUpdate(ctx) {
			if (!ctx.file.includes(`${path.sep}app${path.sep}lib${path.sep}docs${path.sep}`)) return;
			const mod = parentServer?.moduleGraph.getModuleById(DOCS_RESOLVED);
			if (mod) return [mod];
		},
	};
}
