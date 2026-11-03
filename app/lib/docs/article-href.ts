import type { DocArticle } from './schema';

export function articleHref(article: Pick<DocArticle, 'canonicalPath'>, blockId?: string): string {
	return blockId ? `${article.canonicalPath}#${blockId}` : article.canonicalPath;
}
