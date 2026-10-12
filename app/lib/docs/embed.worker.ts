/// <reference lib="webworker" />
/**
 * Embeds a question for docs search. It runs in a worker so the model's load and each run never
 * block the page; only this file imports transformers.js, so the server bundle never sees it.
 */
import { SEARCH_MODEL } from './search-model';

export type EmbedRequest = { id: number; text?: string };
export type EmbedReply = { id: number; vector?: Float32Array } | { id: number; error: string };

type Extractor = (
	text: string,
	options: { pooling: string; normalize: boolean },
) => Promise<{ data: ArrayLike<number> }>;

// The library's own types for `pipeline` are too large for the compiler to evaluate here, so this
// file names the one call it makes.
const extractor = import('@huggingface/transformers').then(
	async (library) =>
		await (
			library.pipeline as unknown as (
				task: 'feature-extraction',
				id: string,
				options: { revision: string; dtype: string },
			) => Promise<Extractor>
		)('feature-extraction', SEARCH_MODEL.id, {
			revision: SEARCH_MODEL.revision,
			dtype: SEARCH_MODEL.dtype,
		}),
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
