/**
 * Th30 read / search / navigate over the composed index. One projector.
 */

import { create, insert, type Orama, search } from '@orama/orama';
import { symbolTerm } from './catalog-rows';
import { introText, sectionText } from './chapter-markdown';
import { projectArticleText } from './project-text';
import type { DocArticle, DocIndex } from './schema';
import { formatWithLineNumbers } from './text-format';

export function articleHref(article: Pick<DocArticle, 'canonicalPath'>, blockId?: string): string {
	return blockId ? `${article.canonicalPath}#${blockId}` : article.canonicalPath;
}

export function chapterNeighbors(
	index: DocIndex,
	slug: string,
): { prev?: DocArticle; next?: DocArticle } {
	const slugs = index.tree.flatMap((node) => (node.slug === undefined ? [] : [node.slug]));
	const at = slugs.indexOf(slug);
	if (at < 0) return {};
	const prevSlug = at > 0 ? slugs[at - 1] : undefined;
	const nextSlug = at < slugs.length - 1 ? slugs[at + 1] : undefined;
	return {
		prev: prevSlug === undefined ? undefined : index.bySlug[prevSlug],
		next: nextSlug === undefined ? undefined : index.bySlug[nextSlug],
	};
}

export function articleHasBlock(article: DocArticle, blockId: string): boolean {
	if (article.symbols.some((symbol) => symbol.id === blockId)) return true;
	return article.sections.some((section) => section.id === blockId);
}

/** One section or one dictionary entry of the article, as text. */
function fragmentText(article: DocArticle, fragment: string): string | undefined {
	const section = article.sections.find((entry) => entry.id === fragment);
	if (section) return sectionText(article, section);
	const symbol = article.symbols.find((item) => item.id === fragment);
	if (!symbol) return undefined;
	const { name, text } = symbolTerm(symbol);
	return `${name} — ${text}`;
}

export function resolveNavigate(
	index: DocIndex,
	slug: string,
	blockId?: string,
): { ok: true; href: string } | { ok: false; error: string } {
	const article = index.bySlug[slug];
	if (article === undefined) {
		return { ok: false, error: `Unknown docs slug "${slug}"` };
	}
	if (blockId && !articleHasBlock(article, blockId)) {
		return { ok: false, error: `No block "${blockId}" on /docs/${slug}` };
	}
	return { ok: true, href: articleHref(article, blockId) };
}

export function readDoc(
	index: DocIndex,
	target: string,
	detail: 'summary' | 'full' | 'code_only' = 'full',
): { target: string; title: string; content: string; lineCount: number } {
	const read = (href: string, title: string, text: string) => ({
		target: href,
		title,
		content: formatWithLineNumbers(title, text),
		lineCount: text.split('\n').length,
	});
	const trimmed = target.trim();
	if (trimmed === 'full_page' || trimmed === 'all') {
		const text = index.articles.map((article) => projectArticleText(article, detail)).join('\n\n');
		return read('full_page', 'theorem docs', text);
	}

	const [slugPart, fragment] = trimmed.replace(/^\/docs\//, '').split('#');
	const article = index.bySlug[slugPart || trimmed];
	if (article === undefined) {
		const valid = index.articles.map((item) => item.slug).join(', ');
		return {
			target,
			title: 'Not found',
			content: `Article '${target}' not found. Valid slugs: ${valid}`,
			lineCount: 1,
		};
	}

	const isolated = fragment ? fragmentText(article, fragment) : undefined;
	if (fragment && isolated !== undefined) {
		return read(articleHref(article, fragment), `${article.title}#${fragment}`, isolated);
	}
	return read(article.canonicalPath, article.title, projectArticleText(article, detail));
}

export type DocSearchHit = {
	slug: string;
	title: string;
	href: string;
	excerpt: string;
	score: number;
	blockId?: string;
};

/** One searchable unit: a chapter (its title and summary), a section, or a dictionary entry. */
type SearchEntry = {
	slug: string;
	/** The section or entry id; absent for the chapter itself. */
	blockId?: string;
	title: string;
	excerpt: string;
};

const SEARCH_SCHEMA = { title: 'string', key: 'string', body: 'string' } as const;
type SearchDb = Orama<typeof SEARCH_SCHEMA>;

function clipExcerpt(text: string, max = 160): string {
	const flat = text.split('\n').filter(Boolean).join(' ');
	if (flat.length <= max) return flat;
	const cut = flat.slice(0, max);
	const space = cut.lastIndexOf(' ');
	return `${(space > 80 ? cut.slice(0, space) : cut).trim()}…`;
}

/** An id as words, so `turn-behaviour` or `outputs.image` match their parts. */
function idWords(id: string): string {
	return id.replace(/[.:_-]+/g, ' ');
}

/**
 * The index as an Orama database, built once per composed index. English stemming lets "images"
 * find "image"; entries keep their place in `entries` by Orama id.
 */
const searchIndexes = new WeakMap<DocIndex, { db: SearchDb; entries: Map<string, SearchEntry> }>();
function searchIndex(index: DocIndex) {
	const cached = searchIndexes.get(index);
	if (cached) return cached;
	const db = create({
		schema: SEARCH_SCHEMA,
		components: { tokenizer: { language: 'english', stemming: true } },
	});
	const entries = new Map<string, SearchEntry>();
	const add = (entry: SearchEntry, key: string, body: string) => {
		const id = String(entries.size);
		entries.set(id, entry);
		// No async hooks are configured, so insert completes synchronously.
		void insert(db, { id, title: entry.title, key, body });
	};
	for (const article of index.articles) {
		add(
			{ slug: article.slug, title: article.title, excerpt: article.summary },
			idWords(article.slug),
			`${article.summary}\n${introText(article)}`,
		);
		for (const section of article.sections) {
			const text = article.body.slice(section.start, section.end);
			// The excerpt starts under the heading line; the title already shows it.
			const under = text.slice(text.indexOf('\n') + 1);
			add(
				{
					slug: article.slug,
					blockId: section.id,
					title: section.title,
					excerpt: clipExcerpt(under),
				},
				idWords(section.id),
				text,
			);
		}
		for (const symbol of article.symbols) {
			const { name, text } = symbolTerm(symbol);
			add(
				{ slug: article.slug, blockId: symbol.id, title: name, excerpt: text },
				idWords(symbol.id),
				text,
			);
		}
	}
	const built = { db, entries };
	searchIndexes.set(index, built);
	return built;
}

function isChildFragment(child: string, parent: string): boolean {
	return child.startsWith(`${parent}.`) || child.startsWith(`${parent}:`);
}

/** The most hits one chapter may take, so a single page can't fill the list. */
const HITS_PER_CHAPTER = 3;

/** Typos allowed per edit by the shortest word's length: none under 4 letters, two from 8. */
function typoTolerance(term: string): number {
	const shortest = Math.min(...term.split(/\s+/).map((word) => word.length));
	return shortest >= 8 ? 2 : shortest >= 4 ? 1 : 0;
}

/** Hits matching every word first, then those matching only some. */
function matchingHits(db: SearchDb, term: string, size: number) {
	const tolerance = typoTolerance(term);
	const run = (threshold: number) => {
		const result = search(db, {
			term,
			properties: ['title', 'key', 'body'],
			boost: { title: 3, key: 2 },
			tolerance,
			threshold,
			limit: size,
		});
		if (result instanceof Promise) throw new Error('Docs search must stay synchronous');
		return result.hits;
	};
	const every = run(0);
	const seen = new Set(every.map((hit) => hit.id));
	return [...every, ...run(1).filter((hit) => !seen.has(hit.id))];
}

/** A section already listed stands for its own sub-entries. */
function coveredByListedSection(ranked: DocSearchHit[], slug: string, blockId: string): boolean {
	return ranked.some(
		(kept) =>
			kept.slug === slug && kept.blockId !== undefined && isChildFragment(blockId, kept.blockId),
	);
}

/** Hits in order as links, capped per chapter and without sub-entries of listed sections. */
function rankHits(
	index: DocIndex,
	entries: Map<string, SearchEntry>,
	hits: { id: string; score: number }[],
): DocSearchHit[] {
	const ranked: DocSearchHit[] = [];
	const perChapter = new Map<string, number>();
	for (const hit of hits) {
		const entry = entries.get(hit.id);
		if (!entry) continue;
		const taken = perChapter.get(entry.slug) ?? 0;
		if (taken >= HITS_PER_CHAPTER) continue;
		const { blockId } = entry;
		if (blockId && coveredByListedSection(ranked, entry.slug, blockId)) continue;
		perChapter.set(entry.slug, taken + 1);
		const article = index.bySlug[entry.slug];
		if (!article) continue;
		ranked.push({
			slug: entry.slug,
			title: entry.title,
			href: articleHref(article, blockId),
			excerpt: entry.excerpt,
			score: hit.score,
			blockId,
		});
	}
	return ranked;
}

/**
 * Full-text search over chapters, sections and dictionary entries: stemmed, prefix-matched as you
 * type, and forgiving of typos in longer words. Places matching every word come first, then those
 * matching some.
 */
export function searchDocs(
	index: DocIndex,
	query: string,
	limit = 5,
): {
	query: string;
	results: DocSearchHit[];
	totalMatches: number;
} {
	const term = query.trim();
	if (!term) return { query, results: [], totalMatches: 0 };
	const { db, entries } = searchIndex(index);
	const ranked = rankHits(index, entries, matchingHits(db, term, entries.size));
	return { query, results: ranked.slice(0, limit), totalMatches: ranked.length };
}

export function formatNavigableForPrompt(index: DocIndex): string {
	return index.articles.map((article) => `${article.slug} (${article.title})`).join(', ');
}
