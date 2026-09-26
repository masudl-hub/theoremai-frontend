/**
 * Compose virtual:docs/index at Vite transform time (full TS, not strip-only Node).
 * Emits machine twins into the client build; SSR reads the virtual module.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createServer } from 'vite';
import { kernelMetaDefine } from './kernel-meta.mjs';

export const DOCS_VIRTUAL = 'virtual:docs/index';
const DOCS_RESOLVED = `\0${DOCS_VIRTUAL}`;

/** @param {string} repoRoot */
function gitIso(repoRoot, files) {
	try {
		const out = execFileSync('git', ['-C', repoRoot, 'log', '-1', '--format=%cI', '--', ...files], {
			encoding: 'utf8',
		}).trim();
		return out || undefined;
	} catch {
		return undefined;
	}
}

/** @param {string} theoremaiRoot */
function kernelDirty(theoremaiRoot) {
	try {
		return (
			execFileSync('git', ['-C', theoremaiRoot, 'status', '--porcelain'], {
				encoding: 'utf8',
			}).trim().length > 0
		);
	} catch {
		return false;
	}
}

function laterIso(...values) {
	return values.filter(Boolean).sort().at(-1);
}

/**
 * @param {{ repoRoot: string, theoremai: { root: string, source: string } }} args
 */
export function docsIndexPlugin({ repoRoot, theoremai }) {
	/** @type {import('vite').ViteDevServer | undefined} */
	let parentServer;

	async function runCompose() {
		const version = JSON.parse(kernelMetaDefine(theoremai)['import.meta.env.KERNEL_PACKAGE_VERSION']);
		const head = JSON.parse(kernelMetaDefine(theoremai)['import.meta.env.KERNEL_SUBMODULE_HEAD']);
		const chapters = gitIso(repoRoot, ['app/lib/docs/articles/chapters.ts']);
		const compose = gitIso(repoRoot, [
			'app/lib/docs/compose.ts',
			'app/lib/docs/placement.ts',
			'app/lib/docs/ownership.ts',
			'app/lib/docs/union-docs.ts',
		]);
		const kernelReadme = gitIso(theoremai.root, ['README.md']);
		const kernelSrc = gitIso(theoremai.root, ['src']);
		const lastmodBySlug = Object.fromEntries(
			Object.entries({
				start: laterIso(chapters, kernelReadme),
				runner: laterIso(chapters, kernelSrc),
				profiles: laterIso(chapters, compose, kernelSrc),
				tools: laterIso(chapters, compose, kernelSrc),
				guardrails: laterIso(chapters, compose, kernelSrc),
				observability: laterIso(chapters, compose, kernelSrc),
				providers: laterIso(chapters, compose, kernelSrc),
				interface: chapters,
				ui: chapters,
				playground: chapters,
				host: chapters,
				cli: chapters,
			}).filter(([, iso]) => iso),
		);

		const server = await createServer({
			configFile: false,
			root: repoRoot,
			define: kernelMetaDefine(theoremai),
			server: {
				middlewareMode: true,
				fs: { allow: [repoRoot, theoremai.root] },
			},
			appType: 'custom',
			plugins: [],
		});
		try {
			const mod = await server.ssrLoadModule('/app/lib/docs/compose.ts');
			const machine = await server.ssrLoadModule('/app/lib/docs/machine.ts');
			const index = mod.composeDocIndex({
				kernelVersion: version,
				kernelHead: head,
				kernelDirty: kernelDirty(theoremai.root),
				lastmodBySlug,
				publicRoot: path.join(repoRoot, 'public'),
				readmePath: path.join(theoremai.root, 'README.md'),
			});
			return { index, machine };
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
			const { index } = await runCompose();
			return `export const docIndex = ${JSON.stringify(index)};`;
		},
		async handleHotUpdate(ctx) {
			if (!ctx.file.includes(`${path.sep}app${path.sep}lib${path.sep}docs${path.sep}`)) return;
			const mod = parentServer?.moduleGraph.getModuleById(DOCS_RESOLVED);
			if (mod) return [mod];
		},
		async generateBundle() {
			const { index, machine } = await runCompose();
			this.emitFile({
				type: 'asset',
				fileName: 'docs/index.json',
				source: JSON.stringify(index),
			});
			for (const article of index.articles) {
				this.emitFile({
					type: 'asset',
					fileName: `docs/${article.slug}.md`,
					source: machine.articleMarkdown(index, article.slug) ?? '',
				});
			}
			this.emitFile({ type: 'asset', fileName: 'llms.txt', source: machine.llmsTxt(index) });
			this.emitFile({
				type: 'asset',
				fileName: 'sitemap.xml',
				source: machine.sitemapXml(index, 'https://theorem.ai'),
			});
		},
	};
}
