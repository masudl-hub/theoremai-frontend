/**
 * Run Biome on every complete TypeScript sample /docs authors. A sample with a
 * `frame` or without an `import` is an excerpt; seed and README samples are the
 * kernel's own output.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docsIndexPlugin } from './docs-index-plugin.mjs';
import { resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(repoRoot, 'tmp/docs-snippets');

const plugin = docsIndexPlugin({ repoRoot, theoremai: resolveTheoremaiRoot(repoRoot) });
const loaded = await plugin.load('\0virtual:docs/index');
const prefix = 'export const docIndex = ';
if (typeof loaded !== 'string' || !loaded.startsWith(prefix)) {
	throw new Error('docs-lint-snippets: virtual:docs/index did not load');
}
const index = JSON.parse(loaded.slice(prefix.length).replace(/;\s*$/, ''));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const written = [];
for (const article of index.articles) {
	let count = 0;
	for (const block of article.blocks) {
		if (block.kind !== 'code' || block.source.from !== 'literal' || block.lang !== 'ts') continue;
		if (block.source.frame || !/^\s*import\s/m.test(block.code)) continue;
		count += 1;
		const dest = path.join(outDir, `${article.slug}-${String(count).padStart(2, '0')}.ts`);
		writeFileSync(dest, block.code.endsWith('\n') ? block.code : `${block.code}\n`);
		written.push(path.relative(repoRoot, dest));
	}
}

if (written.length > 0) {
	execFileSync('npx', ['biome', 'check', '--error-on-warnings', ...written], {
		cwd: repoRoot,
		stdio: 'inherit',
	});
}
console.log(`docs-lint-snippets ok (${String(written.length)} files)`);
