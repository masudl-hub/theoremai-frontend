/**
 * Fetch the docs search model's files, at the revision pinned in app/lib/docs/search-model.ts, into
 * public/docs-search/model/ so the site serves them itself. Run once, and again when the model or
 * its revision changes; the files are committed.
 *
 *   npm run docs:model
 */
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withDocsServer } from './docs-index-plugin.mjs';
import { resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const theoremai = resolveTheoremaiRoot(repoRoot);
const { SEARCH_MODEL, SEARCH_MODEL_DIR } = await withDocsServer({ repoRoot, theoremai }, (load) =>
	load('/app/lib/docs/search-model.ts'),
);

/** What the feature-extraction pipeline reads for a q8 model. */
const FILES = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx'];

for (const file of FILES) {
	const url = `https://huggingface.co/${SEARCH_MODEL.id}/resolve/${SEARCH_MODEL.revision}/${file}`;
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${url}: ${String(response.status)}`);
	const target = path.join(repoRoot, 'public', SEARCH_MODEL_DIR, SEARCH_MODEL.id, file);
	mkdirSync(path.dirname(target), { recursive: true });
	writeFileSync(target, Buffer.from(await response.arrayBuffer()));
	console.log(`${file} ${String(statSync(target).size)} bytes`);
}
