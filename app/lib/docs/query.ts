/**
 * Th30 read / search / navigate over the composed index. One projector.
 */

import { create, insert, type Orama, search } from '@orama/orama';
import { symbolTerm } from './catalog-rows';
import { introText, sectionText } from './chapter-markdown';
import { projectArticleText } from './project-text';
import type { DocArticle, DocArticleCard, DocIndex, DocShell } from './schema';
import { formatWithLineNumbers, plainMarkdown } from './text-format';

export function articleHref(article: Pick<DocArticle, 'canonicalPath'>, blockId?: string): string {
	return blockId ? `${article.canonicalPath}#${blockId}` : article.canonicalPath;
}

/** A chapter's card by its slug. */
export function cardFor(shell: DocShell, slug: string): DocArticleCard | undefined {
	return shell.articles.find((article) => article.slug === slug);
}

export function chapterNeighbors(
	shell: DocShell,
	slug: string,
): { prev?: DocArticleCard; next?: DocArticleCard } {
	const slugs = shell.tree.flatMap((node) => (node.slug === undefined ? [] : [node.slug]));
	const at = slugs.indexOf(slug);
	if (at < 0) return {};
	const prevSlug = at > 0 ? slugs[at - 1] : undefined;
	const nextSlug = at < slugs.length - 1 ? slugs[at + 1] : undefined;
	return {
		prev: prevSlug === undefined ? undefined : cardFor(shell, prevSlug),
		next: nextSlug === undefined ? undefined : cardFor(shell, nextSlug),
	};
}

/** One section or one glossary row of the article, as text. */
/** One section or glossary row of a chapter: its name, and its text. */
function fragmentText(
	article: DocArticle,
	fragment: string,
): { name: string; text: string } | undefined {
	const section = article.sections.find((entry) => entry.id === fragment);
	if (section) return { name: section.title, text: sectionText(article, section) };
	const symbol = article.symbols.find((item) => item.id === fragment);
	if (!symbol) return undefined;
	const { name, text } = symbolTerm(symbol);
	return { name, text: `${name} — ${text}` };
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
	if (fragment && isolated) {
		return read(
			articleHref(article, fragment),
			`${article.title}, ${isolated.name}`,
			isolated.text,
		);
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

/** What one searchable unit is: a chapter, one of its sections, or one glossary row. */
type SearchKind = 'chapter' | 'section' | 'symbol';

/** One searchable unit: a chapter (its title and summary), a section, or a glossary row. */
type SearchEntry = {
	slug: string;
	/** The section or entry id; absent for the chapter itself. */
	blockId?: string;
	kind: SearchKind;
	/** The chapter this place belongs to: a glossary row belongs to the chapter that explains it. */
	home: string;
	title: string;
	excerpt: string;
};

/** An entry with the words its id splits into, and the text it is found by. */
type SearchUnit = { entry: SearchEntry; words: string; body: string };

const SEARCH_SCHEMA = { title: 'string', key: 'string', body: 'string' } as const;
type SearchDb = Orama<typeof SEARCH_SCHEMA>;

function clipExcerpt(text: string, max = 160): string {
	const flat = plainMarkdown(text).split('\n').filter(Boolean).join(' ');
	if (flat.length <= max) return flat;
	const cut = flat.slice(0, max);
	const space = cut.lastIndexOf(' ');
	return `${(space > 80 ? cut.slice(0, space) : cut).trim()}…`;
}

/** An id as words, so `turn-behaviour` or `outputs.image` match their parts. */
function idWords(id: string): string {
	return id.replace(/[.:_-]+/g, ' ');
}

/** The units of the index in a fixed order: chapters, then each one's sections, then its entries. */
const searchUnits = new WeakMap<DocIndex, SearchUnit[]>();
function searchUnitsOf(index: DocIndex): SearchUnit[] {
	const cached = searchUnits.get(index);
	if (cached) return cached;
	const units: SearchUnit[] = [];
	for (const article of index.articles) {
		units.push({
			entry: {
				slug: article.slug,
				kind: 'chapter',
				home: article.slug,
				title: article.title,
				excerpt: article.summary,
			},
			words: idWords(article.slug),
			body: `${article.summary}\n${introText(article)}`,
		});
		for (const section of article.sections) {
			const text = article.body.slice(section.start, section.end);
			// The excerpt starts under the heading line; the title already shows it.
			const under = text.slice(text.indexOf('\n') + 1);
			units.push({
				entry: {
					slug: article.slug,
					blockId: section.id,
					kind: 'section',
					home: article.slug,
					title: section.title,
					excerpt: clipExcerpt(under.replace(/```[\s\S]*?```/g, '\n')),
				},
				words: idWords(section.id),
				body: text,
			});
		}
		for (const symbol of article.symbols) {
			const { name, text } = symbolTerm(symbol);
			units.push({
				entry: {
					slug: article.slug,
					blockId: symbol.id,
					kind: 'symbol',
					home: symbol.chapter,
					title: name,
					excerpt: text,
				},
				words: idWords(symbol.id),
				body: text,
			});
		}
	}
	searchUnits.set(index, units);
	return units;
}

/** The longest text a unit's meaning is read from. */
const PASSAGE_MAX_CHARS = 4000;

/**
 * What the embedding model reads for each unit, in index order, under a key that names the unit.
 * The vectors are made from exactly this text, so a change to it makes them stale.
 */
export function docSearchPassages(index: DocIndex): { key: string; passage: string }[] {
	return searchUnitsOf(index).map(({ entry, body }) => ({
		key: entry.blockId === undefined ? entry.slug : `${entry.slug}#${entry.blockId}`,
		passage: `${entry.title}\n${body}`.slice(0, PASSAGE_MAX_CHARS),
	}));
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
	for (const { entry, words, body } of searchUnitsOf(index)) {
		const id = String(entries.size);
		entries.set(id, entry);
		// No async hooks are configured, so insert completes synchronously.
		void insert(db, { id, title: entry.title, key: words, body });
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

/**
 * The words of a question that say what it is about. Words like "a" and "how" match nearly every
 * place as prefixes, so they are left out; a question of only such words keeps them all.
 */
function meaningfulTerm(question: string): string {
	const words = question.split(/\s+/);
	const kept = words.filter((word) => !QUESTION_FILLER.has(word.toLowerCase()));
	return (kept.length > 0 ? kept : words).join(' ');
}

/** The hits matching every word of the term, and those matching only some. */
function lexicalMatches(
	db: SearchDb,
	question: string,
	size: number,
	properties: ('title' | 'key' | 'body')[] = ['title', 'key', 'body'],
) {
	const term = meaningfulTerm(question);
	const tolerance = typoTolerance(term);
	const run = (threshold: number) => {
		const result = search(db, {
			term,
			properties,
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
	return { every, some: run(1).filter((hit) => !seen.has(hit.id)) };
}

/** A section already listed stands for its own sub-entries. */
function coveredByListedSection(
	ranked: { hit: DocSearchHit; home: string }[],
	home: string,
	blockId: string,
): boolean {
	return ranked.some(
		({ hit, home: keptHome }) =>
			keptHome === home && hit.blockId !== undefined && isChildFragment(blockId, hit.blockId),
	);
}

const QUESTION_FILLER = new Set(
	'a an and are as at be by can do does for from get has have how i in is it its me my of on or so that the this to use was what when where which who why with you your'.split(
		' ',
	),
);

/** The lowercase words of a text that carry meaning, as prefixes long enough to match their other forms. */
function stems(text: string): string[] {
	return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
		.filter((word) => word.length > 2 && !QUESTION_FILLER.has(word))
		.map((word) => word.slice(0, 5));
}

/**
 * The line of a section that answers the question: the sentence sharing the most words with it,
 * so a hit shows what matched rather than how the section opens. A section with no sentence in
 * common keeps its opening.
 */
function focusExcerpt(body: string, term: string, title: string, opening: string): string {
	const wanted = new Set(stems(term));
	if (wanted.size === 0) return opening;
	let best = { at: -1, shared: 0 };
	const sentences = body
		.replace(/```[\s\S]*?(```|$)/g, '\n')
		.split(/\n+|(?<=[.!?])\s+/)
		.map(plainMarkdown)
		.filter((line) => line.length > 12 && line !== title);
	sentences.forEach((line, at) => {
		const shared = new Set(stems(line).filter((stem) => wanted.has(stem))).size;
		if (shared > best.shared) best = { at, shared };
	});
	const line = sentences.at(best.at);
	if (line === undefined) return opening;
	const clipped = clipExcerpt(line);
	return clipped.startsWith(opening.slice(0, 30)) ? opening : clipped;
}

/**
 * Hits in order as links, capped per chapter and without sub-entries of listed sections. A glossary
 * row counts toward the chapter that explains it, so one area cannot fill the list.
 */
function rankHits(
	index: DocIndex,
	entries: Map<string, SearchEntry>,
	hits: { id: string; score: number }[],
	term: string,
): DocSearchHit[] {
	const units = searchUnitsOf(index);
	const ranked: { hit: DocSearchHit; home: string }[] = [];
	const perChapter = new Map<string, number>();
	for (const found of hits) {
		const entry = entries.get(found.id);
		if (!entry) continue;
		const taken = perChapter.get(entry.home) ?? 0;
		if (taken >= HITS_PER_CHAPTER) continue;
		const { blockId } = entry;
		if (blockId && coveredByListedSection(ranked, entry.home, blockId)) continue;
		perChapter.set(entry.home, taken + 1);
		const article = index.bySlug[entry.slug];
		if (!article) continue;
		ranked.push({
			home: entry.home,
			hit: {
				slug: entry.slug,
				title: entry.title,
				href: articleHref(article, blockId),
				excerpt: focusExcerpt(
					units[Number(found.id)]?.body ?? '',
					term,
					entry.title,
					clipExcerpt(entry.excerpt),
				),
				score: found.score,
				blockId,
			},
		});
	}
	return ranked.map(({ hit }) => hit);
}

/** A search's hits, best first, and how many places matched in all. */
export type DocSearchResults = { query: string; results: DocSearchHit[]; totalMatches: number };

type Searchable = { term: string } & ReturnType<typeof searchIndex>;

/** Runs `search` with the question trimmed and the index to search; a blank question finds nothing. */
function searched(
	index: DocIndex,
	query: string,
	search: (on: Searchable) => DocSearchResults,
): DocSearchResults {
	const term = query.trim();
	return term ? search({ term, ...searchIndex(index) }) : { query, results: [], totalMatches: 0 };
}

/**
 * Full-text search over chapters, sections and glossary rows: stemmed, prefix-matched as you
 * type, and forgiving of typos in longer words. Places named by every word come first, then those
 * matching every word somewhere, then those matching some; at each step a guide comes before a
 * glossary row.
 */
export function searchDocs(index: DocIndex, query: string, limit = 5): DocSearchResults {
	return searched(index, query, ({ term, db, entries }) => {
		const { every, some } = lexicalMatches(db, term, entries.size);
		const named = new Set(
			lexicalMatches(db, term, entries.size, ['title', 'key']).every.map((hit) => hit.id),
		);
		const matchesEvery = new Set(every.map((hit) => hit.id));
		// why: Glossary rows are short, so word counts favour them over the guide that explains them.
		const tier = ({ id }: { id: string }) =>
			(named.has(id) ? 0 : matchesEvery.has(id) ? 2 : 4) +
			(entries.get(id)?.kind === 'symbol' ? 1 : 0);
		const ordered = [...every, ...some].sort((a, b) => tier(a) - tier(b));
		const ranked = rankHits(index, entries, ordered, term);
		return { query, results: ranked.slice(0, limit), totalMatches: ranked.length };
	});
}

/** One vector per unit of the index, in index order: row `i` is `data[i * dims]` to the next row. */
export type DocVectors = { dims: number; data: Float32Array };

/** What a place whose title or id has every query word gains over one that only reads close in meaning. */
export const ALL_WORDS_BONUS = 0.05;
/** The smaller gain when the words are only somewhere in the text, which nearly any long section has. */
export const BODY_WORDS_BONUS = 0.01;
/**
 * What a glossary row loses to a how-to section. Entries are short and read close to many
 * questions, so without it they crowd the guides out of the first hits.
 */
export const REFERENCE_PENALTY = 0.03;
/** Below this closeness a place is not an answer: nonsense questions reach about 0.58 at most. */
export const SIMILARITY_FLOOR = 0.58;

/**
 * How far below the best place a hit may score and still be shown. Past it the places only read
 * vaguely like the question, and listing them buries the answer.
 */
export const SCORE_WINDOW = 0.05;

function rowDot(query: Float32Array, vectors: DocVectors, row: number): number {
	const base = row * vectors.dims;
	let sum = 0;
	for (let at = 0; at < vectors.dims; at++)
		sum += (query[at] ?? 0) * (vectors.data[base + at] ?? 0);
	return sum;
}

/**
 * Search by meaning and by words: how close each place reads to the question, plus a bonus for the
 * places that match all its words (typos allowed), minus a penalty for glossary rows. The
 * question's vector comes from the same model that made `vectors`, with its query prefix.
 */
export function searchDocsHybrid(
	index: DocIndex,
	query: string,
	queryVector: Float32Array,
	vectors: DocVectors,
	limit = 5,
): DocSearchResults {
	return searched(index, query, ({ term, db, entries }) => {
		if (
			vectors.data.length !== entries.size * vectors.dims ||
			queryVector.length !== vectors.dims
		) {
			throw new Error(
				`Docs vectors do not fit the index: ${String(vectors.data.length / vectors.dims)} rows for ${String(entries.size)} entries`,
			);
		}
		const matchesEvery = new Set(lexicalMatches(db, term, entries.size).every.map((hit) => hit.id));
		const namesEvery = new Set(
			lexicalMatches(db, term, entries.size, ['title', 'key']).every.map((hit) => hit.id),
		);
		const scored: { id: string; score: number }[] = [];
		for (const [id, entry] of entries) {
			const closeness = rowDot(queryVector, vectors, Number(id));
			const all = matchesEvery.has(id);
			if (closeness < SIMILARITY_FLOOR && !all) continue;
			const bonus = namesEvery.has(id) ? ALL_WORDS_BONUS : all ? BODY_WORDS_BONUS : 0;
			const score = closeness + bonus - (entry.kind === 'symbol' ? REFERENCE_PENALTY : 0);
			scored.push({ id, score });
		}
		scored.sort((a, b) => b.score - a.score);
		const best = scored[0]?.score ?? 0;
		const near = scored.filter((hit) => hit.score >= best - SCORE_WINDOW);
		const ranked = rankHits(index, entries, near, term);
		return { query, results: ranked.slice(0, limit), totalMatches: ranked.length };
	});
}

export function formatNavigableForPrompt(index: DocIndex): string {
	return index.articles.map((article) => `${article.slug} (${article.title})`).join(', ');
}
