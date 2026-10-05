/// <reference types="node" />
/**
 * Compose the docs index from kernel catalogs + SITE_ARTICLES.
 * Throws on drift. The reader and Th30 only see the composed index.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { EXTRA_FIELDS, fieldMeta, PROFILE_GRAPH, PROFILE_TYPES } from '@theoremjs/agents/schema';
import { LANDING_STILL, SITE_ARTICLES, SITE_REDIRECTS } from './articles/chapters';
import { lexiconCatalogRows, traceCatalogRows } from './catalog-rows';
import { stillFilters } from './exposure';
import { fieldsByFacet } from './ownership';
import { FACET_SECTION, UNION_SECTION } from './placement';
import { projectArticleText } from './project-text';
import {
	type AuthoredBlock,
	type ComposeOptions,
	DOC_SECTIONS,
	type DocArticle,
	type DocArticleDef,
	type DocIndex,
	type DocSection,
	type DocTreeNode,
	type PageSymbol,
	type ResolvedBlock,
} from './schema';
import { compileSeedSource } from './seeds';
import { ttrMinutesFromText } from './text-format';
import { unionMembers } from './union-docs';

const KEBAB_ID = /^[a-z][a-z0-9-]*$/;
/** Search-result description length. */
const SUMMARY_MIN = 110;
const SUMMARY_MAX = 160;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Covers are headers: nothing narrower than 16:9. */
const COVER_MIN_RATIO = 16 / 9 - 0.01;

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

function assertChapters(options: ComposeOptions): void {
	const slugs = SITE_ARTICLES.map((def) => def.slug);
	if (slugs.join() !== DOC_SECTIONS.join()) {
		throw new Error(
			`SITE_ARTICLES must be one chapter per DOC_SECTIONS, in order: ${slugs.join()}`,
		);
	}
	assertPublic(options, 'landing', LANDING_STILL.src);
	const covers = new Set<string>([LANDING_STILL.src]);
	const ranks = new Set<number>();
	for (const def of SITE_ARTICLES) {
		assertChapter(def);
		assertChapterFiles(options, def);
		claimOnce(covers, def.cover.src, `cover ${def.cover.src} is used twice`);
		if (def.suggest) {
			const rank = def.suggest.rank;
			claimOnce(ranks, rank, `suggest rank ${String(rank)} is used twice`);
		}
	}
}

/** The chapter's kernel entry, PNG cover and media files exist. */
function assertChapterFiles(options: ComposeOptions, def: DocArticleDef): void {
	if (!existsSync(path.join(options.kernelRoot, def.entry))) {
		throw new Error(`${def.slug} entry missing in the kernel: ${def.entry}`);
	}
	const cover = assertPublic(options, def.slug, def.cover.src);
	if (!cover.endsWith('.png') || pngRatio(cover) < COVER_MIN_RATIO) {
		throw new Error(`${def.slug} cover ${def.cover.src} must be a PNG at least 16:9 wide`);
	}
	for (const block of def.blocks) {
		if (block.kind === 'media') assertPublic(options, def.slug, block.src);
	}
}

/** Adds `value` to `seen`; throws `message` if it was already there. */
function claimOnce<T>(seen: Set<T>, value: T, message: string): void {
	if (seen.has(value)) throw new Error(message);
	seen.add(value);
}

function assertChapter(def: DocArticleDef): void {
	const today = new Date().toISOString().slice(0, 10);
	if (!ISO_DAY.test(def.updated) || Number.isNaN(Date.parse(def.updated)) || def.updated > today) {
		throw new Error(`${def.slug} updated must be a past or present YYYY-MM-DD day`);
	}
	if (def.entry.startsWith('/') || def.entry.includes('..')) {
		throw new Error(`${def.slug} entry must be a kernel-relative path`);
	}
	if (def.summary.length < SUMMARY_MIN || def.summary.length > SUMMARY_MAX) {
		throw new Error(
			`${def.slug} summary is ${String(def.summary.length)} chars; need ${String(SUMMARY_MIN)}–${String(SUMMARY_MAX)}`,
		);
	}
	for (const block of def.blocks) {
		if (!KEBAB_ID.test(block.id))
			throw new Error(`${def.slug} block id "${block.id}" is not kebab-case`);
	}
	if (def.slug === 'modalities') {
		for (const type of PROFILE_TYPES) {
			if (!def.blocks.some((block) => block.id === type)) {
				throw new Error(`modalities is missing the #${type} section`);
			}
		}
	}
}

/** Code blocks get their source text; the reader never compiles or calls fieldMeta. */
function resolveBlock(block: AuthoredBlock, filters: Map<string, string>): ResolvedBlock {
	if (block.kind === 'media') return { ...block, filter: filters.get(block.src) };
	if (block.kind !== 'code') return block;
	const { source } = block;
	if (source.from === 'seed') return { ...block, lang: 'ts', code: compileSeedSource(source.seed) };
	return { ...block, lang: source.lang, code: source.code };
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

/** Catalog rows, minus any an authored block already explains, once each. */
function pageSymbols(
	section: DocSection,
	blocks: readonly ResolvedBlock[],
	byFacet: Map<string, string[]>,
): PageSymbol[] {
	const taken = new Set(blocks.map((block) => block.id));
	if (taken.size !== blocks.length) throw new Error(`/${section} repeats a block id`);
	return catalogSymbols(section, byFacet).filter((symbol) => {
		if (taken.has(symbol.id)) return false;
		taken.add(symbol.id);
		return true;
	});
}

function buildTree(articles: readonly DocArticle[]): DocTreeNode[] {
	return articles.map((article) => ({
		id: article.slug,
		label: article.title,
		slug: article.slug,
		children: article.blocks.flatMap((block) => {
			const label =
				block.kind === 'prose' || block.kind === 'table' || block.kind === 'code'
					? block.title
					: undefined;
			if (label === undefined) return [];
			return [
				{
					id: `${article.slug}#${block.id}`,
					label,
					slug: article.slug,
					blockId: block.id,
					children: [],
				},
			];
		}),
	}));
}

export async function composeDocIndex(options: ComposeOptions): Promise<DocIndex> {
	assertChapters(options);
	const byFacet = fieldsByFacet();
	const filters = await stillFilters(options.publicRoot, [
		LANDING_STILL.src,
		...SITE_ARTICLES.flatMap((def) => [
			def.cover.src,
			...def.blocks.flatMap((block) => (block.kind === 'media' ? [block.src] : [])),
		]),
	]);

	const articles = SITE_ARTICLES.map((def): DocArticle => {
		const blocks = def.blocks.map((block) => resolveBlock(block, filters));
		const article = {
			...def,
			cover: { ...def.cover, filter: filters.get(def.cover.src) },
			questions: def.questions ?? [],
			canonicalPath: `/docs/${def.slug}`,
			dateModified: def.updated,
			blocks,
			symbols: pageSymbols(def.slug, blocks, byFacet),
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
