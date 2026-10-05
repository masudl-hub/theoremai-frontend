/**
 * Article projection: one article as markdown text. Markdown twins, Th30 read,
 * copy and reading time all read this.
 */

import { symbolTerm } from './catalog-rows';
import { fenceMarkdown, markdownFences } from './chapter-markdown';
import type { DocArticle, PageSymbol } from './schema';

/** The article fields the projection reads. */
export type ProjectedArticle = Pick<DocArticle, 'title' | 'summary' | 'body' | 'symbols'>;

/** The dictionary as a headed list, or nothing when the chapter owns no catalog rows. */
export function dictionaryText(symbols: readonly PageSymbol[]): string[] {
	const terms = symbols.map(symbolTerm).map(({ name, text }) => `${name} — ${text}`);
	return terms.length ? ['', '## dictionary', ...terms] : [];
}

/** Every code sample in the chapter, in order. */
function codeOnly(body: string): string {
	return markdownFences(body)
		.filter((fence) => fence.lang === 'ts' || fence.lang === 'bash')
		.map((fence) => fenceMarkdown(fence.lang, fence.code))
		.join('\n\n');
}

export function projectArticleText(
	article: ProjectedArticle,
	detail: 'summary' | 'full' | 'code_only' = 'full',
): string {
	if (detail === 'summary') return `${article.title}\n\n${article.summary}`;
	const body =
		detail === 'full'
			? [article.body, ...dictionaryText(article.symbols)]
			: [codeOnly(article.body)];
	return [`# ${article.title}`, '', article.summary, '', ...body].join('\n').trim();
}
