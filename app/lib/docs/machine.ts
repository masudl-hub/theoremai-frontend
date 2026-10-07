/**
 * Machine twins of the composed index. Same projector as Th30 read.
 */

import {
	DISCORD_URL,
	HOME_DESCRIPTION,
	homeMarkdown,
	KERNEL,
	KERNEL_NAME,
	PACKAGE_LINKS,
	SITE_NAME,
} from '../home-content';
import { symbolTerm } from './catalog-rows';
import { projectArticleText } from './project-text';
import type { DocIndex } from './schema';

export function articleMarkdown(index: DocIndex, slug: string): string | undefined {
	const article = index.bySlug[slug];
	if (article === undefined) return undefined;
	return projectArticleText(article);
}

export function llmsTxt(index: DocIndex, origin: string): string {
	return [
		homeMarkdown(origin).trimEnd(),
		'',
		'## Docs',
		'',
		`Each chapter is also served as Markdown at its address plus \`.md\`; the full list is ${origin}/docs/index.json.`,
		'',
		...index.articles.map(
			(article) => `- [${article.title}](${origin}${article.canonicalPath}.md): ${article.summary}`,
		),
		'',
	].join('\n');
}

export function sitemapXml(index: DocIndex, origin: string): string {
	const pages = ['/', '/playground', '/docs']
		.map((path) => `  <url>\n    <loc>${origin}${path}</loc>\n  </url>`)
		.join('\n');
	const articles = index.articles
		.map((article) => {
			return `  <url>\n    <loc>${origin}${article.canonicalPath}</loc>\n    <lastmod>${article.dateModified}</lastmod>\n  </url>`;
		})
		.join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages}\n${articles}\n</urlset>\n`;
}

const PUBLISHER = { '@type': 'Organization', name: SITE_NAME } as const;

function breadcrumb(origin: string, trail: readonly { name: string; path: string }[]) {
	return {
		'@type': 'BreadcrumbList',
		itemListElement: trail.map(({ name, path }, position) => ({
			'@type': 'ListItem',
			position: position + 1,
			name,
			item: `${origin}${path}`,
		})),
	};
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
	const url = `${origin}${article.canonicalPath}`;
	return {
		'@context': 'https://schema.org',
		'@type': 'TechArticle',
		headline: article.title,
		description: article.summary,
		url,
		mainEntityOfPage: url,
		image: `${origin}${article.cover.src}`,
		inLanguage: 'en',
		dateModified: article.dateModified,
		timeRequired: `PT${String(article.ttrMinutes)}M`,
		author: PUBLISHER,
		publisher: PUBLISHER,
		about: { '@type': 'SoftwareSourceCode', name: KERNEL_NAME, version: KERNEL.version },
		isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
		breadcrumb: breadcrumb(origin, [
			{ name: SITE_NAME, path: '/' },
			{ name: 'Docs', path: '/docs' },
			{ name: article.title, path: article.canonicalPath },
		]),
		mainEntity: {
			'@type': 'DefinedTermSet',
			name: article.title,
			hasDefinedTerm: terms,
		},
	};
}

/** The docs landing: a collection of the chapters, each named with what it covers. */
export function docsLandingJsonLd(index: DocIndex, origin: string): Record<string, unknown> {
	return {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: `${SITE_NAME} docs`,
		description: `Documentation for ${KERNEL_NAME}, ${HOME_DESCRIPTION.charAt(0).toLowerCase()}${HOME_DESCRIPTION.slice(1)} Search the docs, or start with how to define an agent and run a turn.`,
		url: `${origin}/docs`,
		inLanguage: 'en',
		isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: origin },
		breadcrumb: breadcrumb(origin, [
			{ name: SITE_NAME, path: '/' },
			{ name: 'Docs', path: '/docs' },
		]),
		mainEntity: {
			'@type': 'ItemList',
			itemListElement: index.articles.map((article, position) => ({
				'@type': 'ListItem',
				position: position + 1,
				name: article.title,
				description: article.summary,
				url: `${origin}${article.canonicalPath}`,
			})),
		},
		sameAs: [...PACKAGE_LINKS.map(({ href }) => href), DISCORD_URL],
	};
}
