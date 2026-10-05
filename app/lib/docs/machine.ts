/**
 * Machine twins of the composed index. Same projector as Th30 read.
 */

import { symbolTerm } from './catalog-rows';
import { projectArticleText } from './project-text';
import type { DocIndex } from './schema';

export function articleMarkdown(index: DocIndex, slug: string): string | undefined {
	const article = index.bySlug[slug];
	if (article === undefined) return undefined;
	return projectArticleText(article);
}

export function llmsTxt(index: DocIndex): string {
	return [
		'# Theorem docs',
		'',
		...index.articles.map((article) => `- /docs/${article.slug}.md — ${article.summary}`),
		'',
	].join('\n');
}

export function sitemapXml(index: DocIndex, origin: string): string {
	const landing = `  <url>\n    <loc>${origin}/docs</loc>\n  </url>`;
	const articles = index.articles
		.map((article) => {
			return `  <url>\n    <loc>${origin}${article.canonicalPath}</loc>\n    <lastmod>${article.dateModified}</lastmod>\n  </url>`;
		})
		.join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${landing}\n${articles}\n</urlset>\n`;
}

export function articleJsonLd(
	article: DocIndex['articles'][number],
	origin: string,
): Record<string, unknown> {
	const terms = article.symbols.map((symbol) => {
		const { name, text } = symbolTerm(symbol);
		return {
			'@type': 'DefinedTerm',
			name,
			description: text,
			url: `${origin}${article.canonicalPath}#${symbol.id}`,
		};
	});
	return {
		'@context': 'https://schema.org',
		'@type': 'TechArticle',
		headline: article.title,
		description: article.summary,
		url: `${origin}${article.canonicalPath}`,
		dateModified: article.dateModified,
		author: { '@type': 'Organization', name: 'Theorem' },
		mainEntity: {
			'@type': 'DefinedTermSet',
			name: article.title,
			hasDefinedTerm: terms,
		},
	};
}
