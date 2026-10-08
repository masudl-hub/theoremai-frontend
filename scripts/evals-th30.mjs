/**
 * Runs the th30 eval suite. The suite loads th30's server module, which reads the docs through a
 * Vite virtual module Deno cannot resolve, so this composes the index to a file first and maps
 * the virtual id onto it, then hands the suite to Theorem's own `agents eval`.
 *
 *   npm run evals:th30 -- [--trials n] [--json] [--trace-dir dir]
 *
 * The key is read from GEMINI_API_KEY_FREE_A (shell, or .env.local); it is never printed.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDocs } from './docs-index-plugin.mjs';
import { resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const theoremai = resolveTheoremaiRoot(repoRoot);
const out = path.join(repoRoot, 'node_modules/.cache/evals-th30');
mkdirSync(out, { recursive: true });

const { index } = await loadDocs({ repoRoot, theoremai });
const indexFile = path.join(out, 'docs-index.js');
writeFileSync(indexFile, `export const docIndex = ${JSON.stringify(index)};\n`);
const mapFile = path.join(out, 'import-map.json');
writeFileSync(
	mapFile,
	JSON.stringify({ imports: { 'virtual:docs/index': `file://${indexFile}` } }),
);

/** KEY=value lines of .env.local that the shell has not already set. */
const env = { ...process.env };
try {
	for (const line of readFileSync(path.join(repoRoot, '.env.local'), 'utf8').split('\n')) {
		const at = line.indexOf('=');
		if (at < 1 || line.trim().startsWith('#')) continue;
		const name = line.slice(0, at).trim();
		if (env[name] === undefined) env[name] = line.slice(at + 1).trim().replace(/^["']|["']$/g, '');
	}
} catch {}

const bin = path.join(theoremai.root, 'src/cli/bin.ts');
const args = process.argv.slice(2);
const traceDir = args.includes('--trace-dir') ? [] : ['--trace-dir', path.join(process.env.HOME ?? '', '.theorem/traces/evals-th30')];
const run = spawnSync(
	'deno',
	[
		'run', '-A', '--no-check', '--unstable-sloppy-imports', `--import-map=${mapFile}`,
		bin, 'eval', 'evals/th30/suite.ts', ...traceDir, ...args,
	],
	{ cwd: repoRoot, env, stdio: 'inherit' },
);
process.exit(run.status ?? 1);
