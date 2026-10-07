/**
 * Article projection: one article as markdown text. Markdown twins, Th30 read,
 * copy and reading time all read this.
 */

import { symbolTerm } from './catalog-rows';
import { fenceMarkdown, markdownFences } from './chapter-markdown';
import { figureMarkdown, parseFigure } from './figure';
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

/** The body with each `figure` fence written out as the steps it holds, not as JSON. */
function bodyWithFigures(body: string): string {
	let out = body;
	for (const fence of markdownFences(body).reverse()) {
		if (fence.lang !== 'figure') continue;
		out =
			out.slice(0, fence.start) + figureMarkdown(parseFigure(fence.code)) + out.slice(fence.end);
	}
	return out;
}

/** `facts` are lines (a URL, a date) listed under the summary of a full projection. */
export function projectArticleText(
	article: ProjectedArticle,
	detail: 'summary' | 'full' | 'code_only' = 'full',
	facts: readonly string[] = [],
): string {
	if (detail === 'summary') return `${article.title}\n\n${article.summary}`;
	const body =
		detail === 'full'
			? [bodyWithFigures(article.body), ...dictionaryText(article.symbols)]
			: [codeOnly(article.body)];
	const list = detail === 'full' && facts.length ? [...facts.map((fact) => `- ${fact}`), ''] : [];
	return [`# ${article.title}`, '', article.summary, '', ...list, ...body].join('\n').trim();
}
