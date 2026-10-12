import type { DocIndex } from './schema';

let remembered: DocIndex | undefined;
let fetching: Promise<DocIndex> | undefined;

/** A docs page has the index in hand; remember it so a search elsewhere does not fetch it again. */
export function rememberDocIndex(index: DocIndex): void {
	remembered = index;
}

/** The docs index in the browser: the one a docs page loaded, or else the site's own copy of it. */
export function clientDocIndex(): Promise<DocIndex> {
	if (remembered) return Promise.resolve(remembered);
	fetching ??= fetch('/docs/index.json')
		.then(async (response) => {
			if (!response.ok) throw new Error(`docs index: ${String(response.status)}`);
			return (await response.json()) as DocIndex;
		})
		.then((index) => {
			remembered = index;
			return index;
		})
		.finally(() => {
			fetching = undefined;
		});
	return fetching;
}
