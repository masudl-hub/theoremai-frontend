/**
 * Type-check every `ts` sample /docs authors against the real package. A sample with an `import`
 * and no `frame` is a whole program. Any other must name a frame on its fence line
 * (` ```ts frame=statements `, see `SNIPPET_FRAMES`), which says how to complete it; its own imports
 * stay at the top. A sample that names none fails here, so no sample goes unchecked.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDocs } from './docs-index-plugin.mjs';
import { failOn } from './docs-report.mjs';
import { resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(repoRoot, 'tmp/docs-typecheck');
const theoremai = resolveTheoremaiRoot(repoRoot);
const theoremaiRoot = theoremai.root;

const { index, authoredSamples, sampleProgram, sampleNames, prepareSampleFolder, sampleTsconfig } = await loadDocs({ repoRoot, theoremai });

const names = sampleNames(repoRoot, theoremaiRoot);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
prepareSampleFolder(outDir, theoremaiRoot);

const problems = [];
let count = 0;
for (const article of index.articles) {
	for (const block of authoredSamples(article)) {
		const id = `${article.slug}/${block.id}`;
		const frame = block.frame;
		const isProgram = !frame && /^\s*import\s/m.test(block.code);
		if (!isProgram && !frame) {
			problems.push(`${id}: a ts sample without an import needs a frame`);
			continue;
		}
		const { text } = sampleProgram(block.code, frame, names);
		count += 1;
		writeFileSync(path.join(outDir, `${article.slug.replace(/\//g, '--')}--${block.id}.ts`), text);
	}
}
failOn(problems);

writeFileSync(path.join(outDir, 'tsconfig.json'), JSON.stringify(sampleTsconfig, null, 2));
const result = spawnSync('npx', ['tsc', '-p', path.join(outDir, 'tsconfig.json')], {
	cwd: repoRoot,
	encoding: 'utf8',
});
if (result.status !== 0) {
	console.error(result.stdout);
	console.error(result.stderr);
	process.exit(1);
}
console.log(`docs-check-snippets ok (${String(count)} samples)`);
