/**
 * What the docs search scripts share: the composed index with its search passages, and the search
 * model loaded from the copy the site serves.
 */
import path from 'node:path';

/**
 * The index, the query and search-model modules, and the passages the vectors are made from.
 *
 * @param {(file: string) => Promise<Record<string, any>>} load a docs server's module loader
 * @param {{ repoRoot: string, theoremai: { root: string } }} args
 */
export async function loadDocSearch(load, { repoRoot, theoremai }) {
	const compose = await load('/app/lib/docs/compose.ts');
	const index = await compose.composeDocIndex({
		publicRoot: path.join(repoRoot, 'public'),
		kernelRoot: theoremai.root,
	});
	const query = await load('/app/lib/docs/query.ts');
	const model = await load('/app/lib/docs/search-model.ts');
	return { index, query, model, passages: query.docSearchPassages(index) };
}

/**
 * The search model's feature extractor, offline, from public/.
 *
 * @param {string} repoRoot
 * @param {Record<string, any>} model the search-model module
 */
export async function searchExtractor(repoRoot, { SEARCH_MODEL, SEARCH_MODEL_DIR }) {
	const { env, pipeline } = await import('@huggingface/transformers');
	env.allowRemoteModels = false;
	env.localModelPath = `${path.join(repoRoot, 'public', SEARCH_MODEL_DIR)}/`;
	return pipeline('feature-extraction', SEARCH_MODEL.id, {
		revision: SEARCH_MODEL.revision,
		dtype: SEARCH_MODEL.dtype,
	});
}
