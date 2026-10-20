import { clientDocIndex } from './client-index';

/** Fetch the index, the model and the vectors ahead of the first question, for instance when a search box gets focus. */
export function warmDocsSearch(): void {
	void Promise.all([
		clientDocIndex(),
		import('./semantic').then(({ warmSemanticSearch }) => warmSemanticSearch),
	]).then(
		([index, warm]) => {
			warm(index);
		},
		() => undefined,
	);
}
