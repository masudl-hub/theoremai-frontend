import { docIndex } from 'virtual:docs/index';
import type { DocArticleCard, DocIndex, DocShell } from '../schema';

/** Server-only door to the composed index, so the client bundle never inlines it. */
export function getDocIndex(): DocIndex {
	return docIndex;
}

function cardOf({
	body: _body,
	sections: _sections,
	symbols: _symbols,
	terms: _terms,
	...card
}: DocIndex['articles'][number]): DocArticleCard {
	return card;
}

let shell: DocShell | undefined;

/** The tree and chapter cards every docs page carries, made once. */
export function getDocShell(): DocShell {
	shell ??= { tree: docIndex.tree, articles: docIndex.articles.map(cardOf) };
	return shell;
}
