import type { DocIndex } from './schema';

let loaded: DocIndex | undefined;
let fetching: Promise<DocIndex> | undefined;

/** The docs index, if this page has fetched it already. */
export function loadedDocIndex(): DocIndex | undefined {
	return loaded;
}

/**
 * The whole docs index in the browser, fetched once from the site's own copy. A docs page carries
 * only the chapter cards; search, Th30 and the glossary cards read this.
 */
export function clientDocIndex(): Promise<DocIndex> {
	if (loaded) return Promise.resolve(loaded);
	fetching ??= fetch('/docs/index.json')
		.then(async (response) => {
			if (!response.ok) throw new Error(`docs index: ${String(response.status)}`);
			const body: Omit<DocIndex, 'bySlug'> = await response.json();
			const index: DocIndex = {
				...body,
				bySlug: Object.fromEntries(body.articles.map((article) => [article.slug, article])),
			};
			loaded = index;
			return index;
		})
		.finally(() => {
			fetching = undefined;
		});
	return fetching;
}
