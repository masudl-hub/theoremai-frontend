/**
 * Extract complete TypeScript fences from authored docs markdown and run
 * Biome on them. Snippets without an `import` are excerpts and are skipped.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourcesDir = path.join(repoRoot, 'tmp/docs-scratch');
const outDir = path.join(repoRoot, 'tmp/docs-snippets');
const fence = /```(?<lang>ts|tsx|typescript)\n(?<code>[\s\S]*?)```/g;

function markdownFiles(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return markdownFiles(full);
		return entry.isFile() && entry.name.endsWith('.md') ? [full] : [];
	});
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const written = [];
for (const file of markdownFiles(sourcesDir)) {
	const text = readFileSync(file, 'utf8');
	const slug = path.basename(file, '.md');
	let index = 0;
	for (const match of text.matchAll(fence)) {
		const code = match.groups?.code ?? '';
		if (!/^\s*import\s/m.test(code)) continue;
		index += 1;
		const ext = match.groups?.lang === 'tsx' ? 'tsx' : 'ts';
		const dest = path.join(outDir, `${slug}-${String(index).padStart(2, '0')}.${ext}`);
		writeFileSync(dest, code.endsWith('\n') ? code : `${code}\n`);
		written.push(path.relative(repoRoot, dest));
	}
}

if (written.length === 0) {
	throw new Error('docs-lint-snippets: no importable TypeScript fences in tmp/docs-scratch');
}

execFileSync('npx', ['biome', 'check', '--error-on-warnings', ...written], {
	cwd: repoRoot,
	stdio: 'inherit',
});
console.log(`docs-lint-snippets ok (${String(written.length)} files)`);
