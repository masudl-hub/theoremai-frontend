/// <reference lib="webworker" />
/**
 * Embeds a question for docs search. It runs in a worker so the model's load and each run never
 * block the page; only this file imports transformers.js, so the server bundle never sees it.
 */
import ortModule from '../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs?url';
import ortWasm from '../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm?url';
import { SEARCH_MODEL, SEARCH_MODEL_DIR } from './search-model';

export type EmbedRequest = { id: number; text?: string };
export type EmbedReply = { id: number; vector?: Float32Array } | { id: number; error: string };

type Extractor = (
	text: string,
	options: { pooling: string; normalize: boolean },
) => Promise<{ data: ArrayLike<number> }>;

// The library's own types for `pipeline` are too large for the compiler to evaluate here, so this
// file names the one call it makes.
const extractor = import('@huggingface/transformers').then(
	async (library) => {
		// Everything is the site's own: the model's files and the runtime that executes them.
		library.env.allowRemoteModels = false;
		library.env.allowLocalModels = true;
		library.env.localModelPath = `/${SEARCH_MODEL_DIR}/`;
		const wasm = library.env.backends.onnx.wasm;
		if (wasm) wasm.wasmPaths = { mjs: ortModule, wasm: ortWasm };
		return await (
			library.pipeline as unknown as (
				task: 'feature-extraction',
				id: string,
				options: { revision: string; dtype: string },
			) => Promise<Extractor>
		)('feature-extraction', SEARCH_MODEL.id, {
			revision: SEARCH_MODEL.revision,
			dtype: SEARCH_MODEL.dtype,
		});
	},
);

self.addEventListener('message', (event: MessageEvent<EmbedRequest>) => {
	const { id, text } = event.data;
	void (async () => {
		try {
			const extract = await extractor;
			if (text === undefined) {
				self.postMessage({ id } satisfies EmbedReply);
				return;
			}
			const out = await extract(text, { pooling: SEARCH_MODEL.pooling, normalize: true });
			const vector = Float32Array.from(out.data);
			self.postMessage({ id, vector } satisfies EmbedReply, [vector.buffer]);
		} catch (error) {
			self.postMessage({
				id,
				error: error instanceof Error ? error.message : String(error),
			} satisfies EmbedReply);
		}
	})();
});
