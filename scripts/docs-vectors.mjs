/**
 * The vectors behind docs search by meaning: one per chapter, section and dictionary entry, made by
 * the model in app/lib/docs/search-model.ts from the text app/lib/docs/query.ts indexes.
 *
 *   npm run docs:vectors          embed what changed, write public/docs-search/
 *   npm run docs:vectors:check    fail when the committed vectors do not match the docs
 *
 * The check needs no model, so CI and the build can run it. Only a changed passage is embedded again.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withDocsServer } from './docs-index-plugin.mjs';
import { resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const theoremai = resolveTheoremaiRoot(repoRoot);
const check = process.argv.includes('--check');

const { passages, search } = await withDocsServer({ repoRoot, theoremai }, async (load) => {
	const compose = await load('/app/lib/docs/compose.ts');
	const index = await compose.composeDocIndex({
		publicRoot: path.join(repoRoot, 'public'),
		kernelRoot: theoremai.root,
	});
	const { docSearchPassages } = await load('/app/lib/docs/query.ts');
	return { passages: docSearchPassages(index), search: await load('/app/lib/docs/search-model.ts') };
});
const { SEARCH_MODEL, SEARCH_MODEL_DIR, SEARCH_VECTORS_DIR, SEARCH_MANIFEST_FILE, manifestDrift, passageHashes } = search;

const dir = path.join(repoRoot, 'public', SEARCH_VECTORS_DIR);
const manifestFile = path.join(dir, SEARCH_MANIFEST_FILE);
const fresh = await passageHashes(passages);
const previous = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : undefined;

if (check) {
	const problems = previous
		? manifestDrift(previous, fresh)
		: ['there are no vectors yet'];
	if (problems.length > 0) {
		console.error(`docs vectors are stale: ${problems.join('; ')}.\nRun: npm run docs:vectors`);
		process.exit(1);
	}
	console.log(`docs vectors ok (${String(fresh.length)} entries)`);
	process.exit(0);
}

/** Rows already made from this exact text by this exact model. */
const reusable = new Map();
if (previous && JSON.stringify(previous.model) === JSON.stringify(SEARCH_MODEL)) {
	const old = new Float32Array(
		readFileSync(path.join(dir, previous.vectors)).buffer.slice(0),
	);
	previous.entries.forEach((entry, row) => {
		reusable.set(`${entry.key}\n${entry.hash}`, old.subarray(row * SEARCH_MODEL.dims, (row + 1) * SEARCH_MODEL.dims));
	});
}

const rows = fresh.map(({ key, hash }) => reusable.get(`${key}\n${hash}`));
const missing = rows.flatMap((row, at) => (row === undefined ? [at] : []));
if (missing.length > 0) {
	console.log(`embedding ${String(missing.length)} of ${String(rows.length)} entries with ${SEARCH_MODEL.id}`);
	const { env, pipeline } = await import('@huggingface/transformers');
	env.allowRemoteModels = false;
	env.localModelPath = `${path.join(repoRoot, 'public', SEARCH_MODEL_DIR)}/`;
	const extract = await pipeline('feature-extraction', SEARCH_MODEL.id, {
		revision: SEARCH_MODEL.revision,
		dtype: SEARCH_MODEL.dtype,
	});
	for (let from = 0; from < missing.length; from += 16) {
		const batch = missing.slice(from, from + 16);
		const out = await extract(
			batch.map((at) => passages[at].passage),
			{ pooling: SEARCH_MODEL.pooling, normalize: true },
		);
		batch.forEach((at, i) => {
			rows[at] = out.data.slice(i * SEARCH_MODEL.dims, (i + 1) * SEARCH_MODEL.dims);
		});
	}
}

const data = new Float32Array(rows.length * SEARCH_MODEL.dims);
rows.forEach((row, at) => data.set(row, at * SEARCH_MODEL.dims));
const bytes = Buffer.from(data.buffer);
const name = `vectors.${createHash('sha256').update(bytes).digest('hex').slice(0, 10)}.bin`;

mkdirSync(dir, { recursive: true });
for (const file of readdirSync(dir)) {
	if (/^vectors\..+\.bin$/.test(file) && file !== name) rmSync(path.join(dir, file));
}
writeFileSync(path.join(dir, name), bytes);
writeFileSync(
	manifestFile,
	`${JSON.stringify({ model: SEARCH_MODEL, vectors: name, entries: fresh })}\n`,
);
console.log(`docs vectors written: ${String(rows.length)} entries, ${name}`);
