/**
 * Type-check every `ts` sample /docs authors against the real package. A sample with an `import`
 * is a whole program. Any other must name a `frame` (see `SnippetFrame`), which says how to
 * complete it. A sample that names none fails here, so no sample goes unchecked.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docsIndexPlugin } from './docs-index-plugin.mjs';
import { resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(repoRoot, 'tmp/docs-typecheck');
const theoremai = resolveTheoremaiRoot(repoRoot);
const theoremaiRoot = theoremai.root;

const plugin = docsIndexPlugin({ repoRoot, theoremai });
const loaded = await plugin.load('\0virtual:docs/index');
const prefix = 'export const docIndex = ';
if (typeof loaded !== 'string' || !loaded.startsWith(prefix)) {
	throw new Error('docs-check-snippets: virtual:docs/index did not load');
}
const index = JSON.parse(loaded.slice(prefix.length).replace(/;\s*$/, ''));

const rootNames = JSON.parse(
	execFileSync(
		'deno',
		['eval', 'import * as r from "./mod.ts"; console.log(JSON.stringify(Object.keys(r)))'],
		{ cwd: theoremaiRoot, encoding: 'utf8' },
	),
);
const hostSource = readFileSync(path.join(repoRoot, 'scripts/docs-snippet-host.ts'), 'utf8');
const hostNames = [...hostSource.matchAll(/^export (?:declare )?(?:const|function) (\w+)/gm)].map((m) => m[1]);

const words = (code) => new Set(code.match(/[A-Za-z_$][\w$]*/g) ?? []);

/** @param {string} code @param {string} frame */
function wrap(code, frame) {
	if (frame === 'statements') return `async function snippet() {\n${code}\n}\nvoid snippet;`;
	if (frame === 'request') return `void runTurn({ profile: 'snippet', ${code} }, provider);`;
	if (frame === 'request-object') {
		return `const turn: Parameters<typeof runTurn>[0] = { profile: 'snippet', ...${code} };\nvoid turn;`;
	}
	if (frame === 'guardrails') {
		return `void defineProfile({ ...base.text, guardrails: { ${code} } });`;
	}
	const type = frame.slice('profile:'.length);
	return `void defineProfile({ ...base.${type}, ${code} });`;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const problems = [];
let count = 0;
for (const article of index.articles) {
	for (const block of article.blocks) {
		if (block.kind !== 'code' || block.source.from !== 'literal' || block.lang !== 'ts') continue;
		const id = `${article.slug}/${block.id}`;
		const isProgram = /^\s*import\s/m.test(block.code);
		const frame = block.source.frame;
		if (!isProgram && !frame) {
			problems.push(`${id}: a ts sample without an import needs a frame`);
			continue;
		}
		const used = words(block.code);
		let body = isProgram ? block.code : wrap(block.code, frame);
		// A name the sample imports or declares stays its own; the host supplies the rest.
		const own = new Set(
			[...block.code.matchAll(/(?:\b(?:const|let|var|function|class)\s+|import\s*\{[^}]*?)(\w+)/g)].map(
				(m) => m[1],
			),
		);
		for (const m of block.code.matchAll(/import\s*\{([^}]*)\}/g)) {
			for (const name of m[1].split(',')) own.add(name.trim().split(/\s+as\s+/).pop());
		}
		const all = words(body);
		const heads = [];
		if (!isProgram) {
			const fromRoot = rootNames.filter((n) => all.has(n) && !own.has(n));
			if (fromRoot.length > 0) heads.push(`import { ${fromRoot.join(', ')} } from '@theoremjs/agents';`);
		}
		const fromHost = hostNames.filter((n) => all.has(n) && !own.has(n));
		if (fromHost.length > 0) {
			heads.push(`import { ${fromHost.join(', ')} } from '../../scripts/docs-snippet-host.ts';`);
		}
		body = `${heads.join('\n')}\n${body}`;
		count += 1;
		writeFileSync(path.join(outDir, `${article.slug}--${block.id}.ts`), `${body}\n`);
	}
}
if (problems.length > 0) {
	console.error(problems.join('\n'));
	process.exit(1);
}

const tsconfig = {
	extends: '../../tsconfig.json',
	include: ['./*.ts', '../../theoremai-deno-shim.d.ts'],
	compilerOptions: { rootDirs: ['.', '../..'], noEmit: true, types: ['node'] },
};
writeFileSync(path.join(outDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
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
