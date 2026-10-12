/**
 * Docs search by meaning, in the browser: the committed document vectors, the model that embeds a
 * question, and the same ranking the keyword search uses. The vectors are checked against the docs
 * once; if they are stale or the model cannot load, this throws and callers keep the keyword results.
 */

import type { EmbedReply, EmbedRequest } from './embed.worker';
import { type DocVectors, docSearchPassages, searchDocsHybrid } from './query';
import type { DocIndex } from './schema';
import {
	manifestDrift,
	passageHashes,
	SEARCH_MANIFEST_FILE,
	SEARCH_MODEL,
	SEARCH_VECTORS_DIR,
	type SearchManifest,
} from './search-model';

type Embedder = { embed: (text?: string) => Promise<Float32Array | undefined> };

let embedder: Embedder | undefined;
const loadedVectors = new WeakMap<DocIndex, Promise<DocVectors>>();
const queryVectors = new Map<string, Promise<Float32Array>>();
const QUERY_CACHE = 50;

function startEmbedder(): Embedder {
	const worker = new Worker(new URL('./embed.worker.ts', import.meta.url), { type: 'module' });
	let next = 0;
	const waiting = new Map<number, (reply: EmbedReply) => void>();
	worker.addEventListener('message', (event: MessageEvent<EmbedReply>) => {
		waiting.get(event.data.id)?.(event.data);
		waiting.delete(event.data.id);
	});
	return {
		embed: (text) =>
			new Promise((resolve, reject) => {
				next += 1;
				const id = next;
				waiting.set(id, (reply) => {
					if ('error' in reply) reject(new Error(reply.error));
					else resolve(reply.vector);
				});
				worker.postMessage({ id, text } satisfies EmbedRequest);
			}),
	};
}

async function fetchVectors(index: DocIndex): Promise<DocVectors> {
	const base = `/${SEARCH_VECTORS_DIR}/`;
	const response = await fetch(`${base}${SEARCH_MANIFEST_FILE}`);
	if (!response.ok) throw new Error(`docs vectors manifest: ${String(response.status)}`);
	const manifest = (await response.json()) as SearchManifest;
	const problems = manifestDrift(manifest, await passageHashes(docSearchPassages(index)));
	if (problems.length > 0) throw new Error(`docs vectors are stale: ${problems.join('; ')}`);
	const binary = await fetch(`${base}${manifest.vectors}`);
	if (!binary.ok) throw new Error(`docs vectors: ${String(binary.status)}`);
	return { dims: SEARCH_MODEL.dims, data: new Float32Array(await binary.arrayBuffer()) };
}

function vectorsOf(index: DocIndex): Promise<DocVectors> {
	let loading = loadedVectors.get(index);
	if (!loading) {
		loading = fetchVectors(index);
		loadedVectors.set(index, loading);
		// A failed load is tried again next time, not remembered.
		loading.catch(() => loadedVectors.delete(index));
	}
	return loading;
}

/** Start loading the model and the vectors, so the first question does not wait for them. */
export function warmDocsSearch(index: DocIndex): void {
	embedder ??= startEmbedder();
	void embedder.embed().catch(() => undefined);
	void vectorsOf(index).catch(() => undefined);
}

function queryVector(question: string): Promise<Float32Array> {
	let vector = queryVectors.get(question);
	if (!vector) {
		embedder ??= startEmbedder();
		vector = embedder.embed(`${SEARCH_MODEL.queryPrefix}${question}`).then((made) => {
			if (!made) throw new Error('the model returned no vector');
			return made;
		});
		queryVectors.set(question, vector);
		vector.catch(() => queryVectors.delete(question));
		if (queryVectors.size > QUERY_CACHE) {
			queryVectors.delete(queryVectors.keys().next().value as string);
		}
	}
	return vector;
}

/** The ranking that understands intent. Rejects if the model or the vectors are unavailable. */
export async function searchDocsSemantic(
	index: DocIndex,
	question: string,
	limit = 5,
): Promise<ReturnType<typeof searchDocsHybrid>> {
	const [vectors, vector] = await Promise.all([vectorsOf(index), queryVector(question)]);
	return searchDocsHybrid(index, question, vector, vectors, limit);
}
