/**
 * Run Biome on every complete TypeScript sample /docs authors. A sample with a
 * `frame` or without an `import` is an excerpt; seed and README samples are the
 * kernel's own output.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDocs } from './docs-index-plugin.mjs';
import { resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(repoRoot, 'tmp/docs-snippets');

const { index, authoredSamples } = await loadDocs({
	repoRoot,
	theoremai: resolveTheoremaiRoot(repoRoot),
});

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const written = [];
for (const article of index.articles) {
	for (const block of authoredSamples(article)) {
		if (block.frame || !/^\s*import\s/m.test(block.code)) continue;
		const dest = path.join(outDir, `${article.slug}--${block.id}.ts`);
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
