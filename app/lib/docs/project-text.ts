/**
 * Article projection: one article as markdown text. Markdown twins, Th30 read,
 * search, copy and reading time all read this.
 */

import { projectBlockText } from './block-text';
import { symbolTerm } from './catalog-rows';
import type { DocArticle, ResolvedBlock } from './schema';

/** Heading for a block in markdown and search: its title, else its id. */
export function blockHeading(block: ResolvedBlock): string {
	if (block.kind === 'prose' || block.kind === 'table') return block.title;
	if (block.kind === 'code' && block.title) return block.title;
	return block.id;
}

/** A headed list and its trailing blank line, or nothing when the list is empty. */
function listSection(head: string, lines: readonly string[]): string[] {
	return lines.length ? [head, ...lines, ''] : [];
}

/** A block as its `##` heading, body and trailing blank line. */
function blockSection(block: ResolvedBlock): string[] {
	return [`## ${blockHeading(block)}`, projectBlockText(block), ''];
}

/** The article fields the projection reads. */
export type ProjectedArticle = Pick<DocArticle, 'title' | 'summary' | 'blocks' | 'symbols'>;

/** Everything under the summary: every block, then the dictionary. */
function fullBody(article: ProjectedArticle): string[] {
	const terms = article.symbols.map(symbolTerm).map(({ name, text }) => `${name} — ${text}`);
	return [...article.blocks.flatMap(blockSection), ...listSection('## dictionary', terms)];
}

export function projectArticleText(
	article: ProjectedArticle,
	detail: 'summary' | 'full' | 'code_only' = 'full',
): string {
	if (detail === 'summary') return `${article.title}\n\n${article.summary}`;
	const body =
		detail === 'full'
			? fullBody(article)
			: article.blocks.filter((block) => block.kind === 'code').flatMap(blockSection);
	return [`# ${article.title}`, '', article.summary, '', ...body].join('\n').trim();
}
