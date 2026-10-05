/// <reference types="node" />
/**
 * Compose the docs index from the kernel catalogs and the chapters in `articles/`.
 * Throws on drift. The reader and Th30 only see the composed index.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createMarkdownFrontmatter } from '@astryxdesign/core/Markdown/plugins';
import { EXTRA_FIELDS, fieldMeta, PROFILE_GRAPH, PROFILE_TYPES } from '@theoremjs/agents/schema';
import { CHAPTER_SOURCES, LANDING_STILL, SITE_REDIRECTS } from './articles/chapters';
import { lexiconCatalogRows, traceCatalogRows } from './catalog-rows';
import { type Fence, fenceMarkdown, markdownFences, markdownSections } from './chapter-markdown';
import { stillFilters } from './exposure';
import { fieldsByFacet } from './ownership';
import { FACET_SECTION, UNION_SECTION } from './placement';
import { projectArticleText } from './project-text';
import {
	type ComposeOptions,
	DOC_SECTIONS,
	type DocArticle,
	type DocArticleHead,
	type DocIndex,
	type DocSection,
	type DocSectionEntry,
	type DocTreeNode,
	FENCE_LANGUAGES,
	type PageSymbol,
	PLAYGROUND_SEED_IDS,
	type PlaygroundSeedId,
	SNIPPET_FRAMES,
} from './schema';
import { compileSeedSource } from './seeds';
import { ttrMinutesFromText } from './text-format';
import { unionMembers } from './union-docs';

/** Search-result description length. */
const SUMMARY_MIN = 110;
const SUMMARY_MAX = 160;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Covers are headers: nothing narrower than 16:9. */
const COVER_MIN_RATIO = 16 / 9 - 0.01;
const SUGGEST_RANKS = [1, 2, 3, 4] as const;

/** A chapter as authored: its front matter and its Markdown, seed fences still empty. */
type Chapter = DocArticleHead & { markdown: string };

const frontmatter = createMarkdownFrontmatter({
	name: 'docs-chapter',
	parse: (fields) => ({ ...fields }),
});

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
	return values.some((candidate) => candidate === value);
}

/** One chapter file as its head and Markdown. Throws on a missing or unknown front-matter field. */
function readChapter(slug: DocSection, source: string | undefined): Chapter {
	if (source === undefined) throw new Error(`articles/${slug}.md is missing`);
	const parsed = frontmatter.parse(source);
	if (parsed.status !== 'match') throw new Error(`${slug}.md has no front matter`);
	const fields = new Map(Object.entries(parsed.metadata));
	const take = (key: string): string => {
		const value = fields.get(key);
		if (!value) throw new Error(`${slug}.md front matter needs ${key}`);
		fields.delete(key);
		return value;
	};
	const rank = SUGGEST_RANKS.find((candidate) => String(candidate) === fields.get('suggest'));
	if (fields.has('suggest') && rank === undefined) {
		throw new Error(`${slug}.md suggest must be one of ${SUGGEST_RANKS.join(', ')}`);
	}
	fields.delete('suggest');
	const chapter: Chapter = {
		slug,
		title: take('title'),
		updated: take('updated'),
		summary: take('summary'),
		entry: take('entry'),
		covers: take('covers')
			.split(',')
			.map((covered) => covered.trim()),
		cover: { src: take('cover'), alt: take('coverAlt'), position: take('coverPosition') },
		suggest: rank === undefined ? undefined : { rank },
		markdown: source.slice(parsed.contentStart).trim(),
	};
	if (fields.size > 0) {
		throw new Error(`${slug}.md front matter has unknown fields: ${[...fields.keys()].join(', ')}`);
	}
	return chapter;
}

/** Every chapter, one per `DOC_SECTIONS` entry, in that order. */
function readChapters(): Chapter[] {
	const files = Object.keys(CHAPTER_SOURCES);
	const extra = files.filter((file) => !DOC_SECTIONS.some((slug) => file === `./${slug}.md`));
	if (extra.length > 0)
		throw new Error(`articles/ has files outside DOC_SECTIONS: ${extra.join()}`);
	return DOC_SECTIONS.map((slug) => readChapter(slug, CHAPTER_SOURCES[`./${slug}.md`]));
}

/** Width over height from a PNG's IHDR chunk. */
function pngRatio(file: string): number {
	const png = readFileSync(file);
	const ihdr = new DataView(png.buffer, png.byteOffset + 16, 8);
	return ihdr.getUint32(0) / ihdr.getUint32(4);
}

function assertPublic(options: ComposeOptions, slug: string, src: string): string {
	const file = path.join(options.publicRoot, src);
	if (!existsSync(file)) throw new Error(`${slug} references a missing file: ${src}`);
	return file;
}

function assertChapters(options: ComposeOptions, chapters: readonly Chapter[]): void {
	assertPublic(options, 'landing', LANDING_STILL.src);
	const covers = new Set<string>([LANDING_STILL.src]);
	const ranks = new Set<number>();
	for (const chapter of chapters) {
		assertChapter(chapter);
		assertChapterFiles(options, chapter);
		claimOnce(covers, chapter.cover.src, `cover ${chapter.cover.src} is used twice`);
		if (chapter.suggest) {
			const rank = chapter.suggest.rank;
			claimOnce(ranks, rank, `suggest rank ${String(rank)} is used twice`);
		}
	}
}

/** The chapter's kernel entry, covered files and PNG cover exist. */
function assertChapterFiles(options: ComposeOptions, chapter: Chapter): void {
	if (!existsSync(path.join(options.kernelRoot, chapter.entry))) {
		throw new Error(`${chapter.slug} entry missing in the kernel: ${chapter.entry}`);
	}
	for (const covered of chapter.covers) {
		if (covered.startsWith('/') || covered.includes('..')) {
			throw new Error(`${chapter.slug} covers ${covered}: use a path relative to the package root`);
		}
		if (!existsSync(path.join(options.kernelRoot, covered))) {
			throw new Error(`${chapter.slug} covers ${covered}, which is not in the package`);
		}
	}
	const cover = assertPublic(options, chapter.slug, chapter.cover.src);
	if (!cover.endsWith('.png') || pngRatio(cover) < COVER_MIN_RATIO) {
		throw new Error(`${chapter.slug} cover ${chapter.cover.src} must be a PNG at least 16:9 wide`);
	}
}

/** Adds `value` to `seen`; throws `message` if it was already there. */
function claimOnce<T>(seen: Set<T>, value: T, message: string): void {
	if (seen.has(value)) throw new Error(message);
	seen.add(value);
}

function assertChapter(chapter: Chapter): void {
	const { slug, updated, entry, summary } = chapter;
	const today = new Date().toISOString().slice(0, 10);
	if (!ISO_DAY.test(updated) || Number.isNaN(Date.parse(updated)) || updated > today) {
		throw new Error(`${slug} updated must be a past or present YYYY-MM-DD day`);
	}
	if (entry.startsWith('/') || entry.includes('..')) {
		throw new Error(`${slug} entry must be a kernel-relative path`);
	}
	if (summary.length < SUMMARY_MIN || summary.length > SUMMARY_MAX) {
		throw new Error(
			`${slug} summary is ${String(summary.length)} chars; need ${String(SUMMARY_MIN)}–${String(SUMMARY_MAX)}`,
		);
	}
}

/** The seed a fence names in `seed=`, or in its body for a `playground` fence. */
function fenceSeed(slug: string, name: string | undefined): PlaygroundSeedId | undefined {
	if (name === undefined) return undefined;
	if (!isOneOf(PLAYGROUND_SEED_IDS, name))
		throw new Error(`${slug} names an unknown seed: ${name}`);
	return name;
}

/** Throws on a fence language, meta, frame or seed the reader and the checks do not know. */
function assertFence(slug: string, fence: Fence): void {
	if (!isOneOf(FENCE_LANGUAGES, fence.lang)) {
		throw new Error(`${slug} has a fence in "${fence.lang}"; use ${FENCE_LANGUAGES.join(', ')}`);
	}
	const { frame, seed, ...unknown } = fence.meta;
	if (Object.keys(unknown).length > 0 || (fence.lang !== 'ts' && (frame ?? seed) !== undefined)) {
		throw new Error(`${slug} has a ${fence.lang} fence with meta it cannot take`);
	}
	if (frame !== undefined && !isOneOf(SNIPPET_FRAMES, frame)) {
		throw new Error(`${slug} has a fence with an unknown frame: ${frame}`);
	}
	if (fence.lang === 'playground') fenceSeed(slug, fence.code.trim());
}

/** The chapter's Markdown with each `ts seed=<id>` fence filled with that seed's program. */
function resolveBody(chapter: Chapter): string {
	const { slug, markdown } = chapter;
	let body = markdown;
	// Last fence first, so the earlier offsets stay true while the text grows.
	for (const fence of markdownFences(markdown).reverse()) {
		assertFence(slug, fence);
		const filled = fenceSeed(slug, fence.meta.seed);
		if (filled === undefined) continue;
		if (fence.code.trim() !== '') throw new Error(`${slug}: a seed fence must be empty`);
		const program = fenceMarkdown(`ts seed=${filled}`, compileSeedSource(filled).trim());
		body = `${body.slice(0, fence.start)}${program}${body.slice(fence.end)}`;
	}
	return body;
}

/** The chapter's sections. Modalities must have one per profile type, for `/docs/modalities#host`. */
function chapterSections(slug: DocSection, body: string): DocSectionEntry[] {
	const sections = markdownSections(body);
	const shallow = sections.find((section) => section.level < 2);
	if (shallow)
		throw new Error(`${slug} "${shallow.title}": headings start at ##; the title is the #`);
	if (slug === 'modalities') {
		for (const type of PROFILE_TYPES) {
			if (!sections.some((section) => section.id === type)) {
				throw new Error(`modalities is missing the #${type} section`);
			}
		}
	}
	return sections;
}

function fieldSymbol(fieldPath: string): PageSymbol {
	const meta = fieldMeta(fieldPath);
	if (meta === undefined) throw new Error(`fieldMeta(${fieldPath}) is undefined`);
	return { kind: 'field', id: fieldPath, path: fieldPath, meta };
}

/** The catalog rows a chapter's dictionary lists. */
function catalogSymbols(section: DocSection, byFacet: Map<string, string[]>): PageSymbol[] {
	const symbols: PageSymbol[] = [];
	for (const facet of PROFILE_GRAPH) {
		if (FACET_SECTION[facet.id] !== section) continue;
		symbols.push(...(byFacet.get(facet.id) ?? []).map(fieldSymbol));
	}
	if (section === 'tools') symbols.push(...Object.keys(EXTRA_FIELDS).map(fieldSymbol));
	for (const [name, place] of Object.entries(UNION_SECTION)) {
		if (place.section !== section) continue;
		const union = name as keyof typeof UNION_SECTION;
		const prefix = union.toLowerCase().replace(/_/g, '-');
		for (const member of unionMembers(union)) {
			symbols.push({ kind: 'union-member', id: `${prefix}:${member.value}`, union, ...member });
		}
	}
	if (section === 'traces') {
		symbols.push(
			...traceCatalogRows().map((row) => ({
				kind: 'trace' as const,
				id: `trace:${row.key}`,
				...row,
			})),
		);
	}
	if (section === 'statuses') {
		symbols.push(
			...lexiconCatalogRows().map((row) => ({
				kind: 'lexicon' as const,
				id: `lexicon:${row.key}`,
				...row,
			})),
		);
	}
	return symbols;
}

/** Catalog rows, minus any a section's id already takes, once each. */
function pageSymbols(
	section: DocSection,
	sections: readonly DocSectionEntry[],
	byFacet: Map<string, string[]>,
): PageSymbol[] {
	const taken = new Set(sections.map((entry) => entry.id));
	return catalogSymbols(section, byFacet).filter((symbol) => {
		if (taken.has(symbol.id)) return false;
		taken.add(symbol.id);
		return true;
	});
}

/** A chapter's sections as nav nodes: each heading nests under the last shallower one. */
function sectionNodes(slug: string, sections: readonly DocSectionEntry[]): DocTreeNode[] {
	const roots: DocTreeNode[] = [];
	const open: { level: number; children: DocTreeNode[] }[] = [];
	for (const section of sections) {
		while (open.length > 0 && (open.at(-1)?.level ?? 0) >= section.level) open.pop();
		const children: DocTreeNode[] = [];
		const node = {
			id: `${slug}#${section.id}`,
			label: section.title,
			slug,
			blockId: section.id,
			children,
		};
		(open.at(-1)?.children ?? roots).push(node);
		open.push({ level: section.level, children });
	}
	return roots;
}

function buildTree(articles: readonly DocArticle[]): DocTreeNode[] {
	return articles.map((article) => ({
		id: article.slug,
		label: article.title,
		slug: article.slug,
		children: sectionNodes(article.slug, article.sections),
	}));
}

export async function composeDocIndex(options: ComposeOptions): Promise<DocIndex> {
	const chapters = readChapters();
	assertChapters(options, chapters);
	const byFacet = fieldsByFacet();
	const filters = await stillFilters(options.publicRoot, [
		LANDING_STILL.src,
		...chapters.map((chapter) => chapter.cover.src),
	]);

	const articles = chapters.map(({ markdown, ...head }): DocArticle => {
		const body = resolveBody({ markdown, ...head });
		const sections = chapterSections(head.slug, body);
		const article = {
			...head,
			cover: { ...head.cover, filter: filters.get(head.cover.src) },
			canonicalPath: `/docs/${head.slug}`,
			dateModified: head.updated,
			body,
			sections,
			symbols: pageSymbols(head.slug, sections, byFacet),
		};
		return { ...article, ttrMinutes: ttrMinutesFromText(projectArticleText(article)) };
	});

	const suggested = articles
		.flatMap((article) => (article.suggest ? [{ slug: article.slug, ...article.suggest }] : []))
		.sort((a, b) => a.rank - b.rank);

	return {
		articles,
		tree: buildTree(articles),
		suggested,
		bySlug: Object.fromEntries(articles.map((article) => [article.slug, article])),
		redirects: [...SITE_REDIRECTS],
		landing: { ...LANDING_STILL, filter: filters.get(LANDING_STILL.src) },
	};
}
