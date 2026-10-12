/**
 * Does docs search still find the answer? Runs the questions in scripts/docs-search-labels.json
 * through the same ranking the site uses, with the real model and the committed vectors, and
 * fails when a kind of question finds its answer less often than it was held to.
 *
 *   npm run docs:search-check
 *
 * It downloads the model on first use, so it is not part of lint:docs. Edit the labels when the
 * docs change on purpose; a label that no longer names any place in the docs is reported.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withDocsServer } from './docs-index-plugin.mjs';
import { resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const theoremai = resolveTheoremaiRoot(repoRoot);
const { queries } = JSON.parse(readFileSync(path.join(repoRoot, 'scripts/docs-search-labels.json'), 'utf8'));

/** Share of each kind of question whose answer must be in the first three hits. */
const HELD_TO = {
	intent: 0.55,
	keyword: 0.85,
	typo: 0.25,
	'field-name': 0.9,
	'field-dotted': 0.9,
	'field-described': 0.6,
};
/** Questions about nothing the docs cover: they must find nothing. */
const NOTHING = ['asdf qwerty zxcv', 'banana smoothie recipe with mango', 'what is the airspeed of a swallow'];

const plain = (text) =>
	text
		.toLowerCase()
		.replace(/^\d+\.\s*/, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();

const done = await withDocsServer({ repoRoot, theoremai }, async (load) => {
	const compose = await load('/app/lib/docs/compose.ts');
	const index = await compose.composeDocIndex({
		publicRoot: path.join(repoRoot, 'public'),
		kernelRoot: theoremai.root,
	});
	const query = await load('/app/lib/docs/query.ts');
	const model = await load('/app/lib/docs/search-model.ts');
	const { SEARCH_MODEL, SEARCH_MANIFEST_FILE, SEARCH_VECTORS_DIR } = model;
	const dir = path.join(repoRoot, 'public', SEARCH_VECTORS_DIR);
	const manifest = JSON.parse(readFileSync(path.join(dir, SEARCH_MANIFEST_FILE), 'utf8'));
	const problems = model.manifestDrift(manifest, await model.passageHashes(query.docSearchPassages(index)));
	if (problems.length > 0) throw new Error(`docs vectors are stale: ${problems.join('; ')}`);
	const bytes = readFileSync(path.join(dir, manifest.vectors));
	const vectors = {
		dims: SEARCH_MODEL.dims,
		data: new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
	};

	const { pipeline } = await import('@huggingface/transformers');
	const extract = await pipeline('feature-extraction', SEARCH_MODEL.id, {
		revision: SEARCH_MODEL.revision,
		dtype: SEARCH_MODEL.dtype,
	});
	const search = async (text) => {
		const out = await extract(`${SEARCH_MODEL.queryPrefix}${text}`, {
			pooling: SEARCH_MODEL.pooling,
			normalize: true,
		});
		return query.searchDocsHybrid(index, text, Float32Array.from(out.data), vectors, 5);
	};

	const rows = [];
	for (const item of queries) {
		const { results } = await search(item.q);
		const slugs = new Set(index.articles.map((article) => article.slug));
		const stale = item.accept.filter((place) => !slugs.has(place.slug));
		const where = (hits) =>
			hits.findIndex((hit) =>
				item.accept.some(
					(place) =>
						hit.slug === place.slug &&
						(place.title === undefined || plain(hit.title) === plain(place.title)),
				),
			);
		const at = where(results);
		const wordsAt = where(query.searchDocs(index, item.q, 5).results);
		rows.push({ ...item, at, wordsAt, stale, got: results.map((hit) => `${hit.slug}: ${hit.title}`) });
	}
	const strays = [];
	for (const text of NOTHING) {
		const { results } = await search(text);
		if (results.length > 0) strays.push({ text, found: results.map((hit) => hit.title) });
	}
	return { rows, strays };
});

let failed = false;
for (const kind of Object.keys(HELD_TO)) {
	const own = done.rows.filter((row) => row.kind === kind);
	const found = own.filter((row) => row.at >= 0 && row.at < 3).length;
	const share = own.length === 0 ? 1 : found / own.length;
	const ok = share >= HELD_TO[kind];
	if (!ok) failed = true;
	console.log(
		`${ok ? 'ok  ' : 'FAIL'} ${kind}: ${String(found)}/${String(own.length)} in the first three (held to ${String(HELD_TO[kind])})`,
	);
	if (!ok || process.argv.includes('--verbose')) {
		for (const row of own.filter((r) => !(r.at >= 0 && r.at < 3))) {
				console.log(`       missed: ${row.q}`);
				if (process.argv.includes('--verbose')) {
					console.log(`         wanted: ${row.accept.map((a) => `${a.slug}: ${a.title ?? '*'}`).join(' | ')}`);
					console.log(`         got:    ${row.got.join(' | ')}`);
				}
			}
	}
}
// Understanding intent must not cost a question the plain keyword search already answered.
for (const row of done.rows.filter((r) => r.wordsAt >= 0 && r.wordsAt < 3 && !(r.at >= 0 && r.at < 3))) {
	failed = true;
	console.log(`FAIL keyword search found it in the first three, this did not: ${row.q}`);
}
for (const row of done.rows.filter((r) => r.stale.length > 0)) {
	failed = true;
	console.log(`STALE label (no such chapter): ${row.q}`);
}
for (const stray of done.strays) {
	failed = true;
	console.log(`FAIL a question about nothing found something: ${stray.text} -> ${stray.found.join(' | ')}`);
}
process.exitCode = failed ? 1 : 0;
