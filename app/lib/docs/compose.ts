/// <reference types="node" />
/**
 * Compose the docs index from kernel catalogs + SITE_ARTICLES.
 * Throws on drift. The reader and Th30 only see ResolvedBlock.
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
	EXTRA_FIELDS,
	fieldMeta,
	PROFILE_FIELDS,
	PROFILE_GRAPH,
	PROFILE_TYPES,
} from '@theoremai/agents/schema';
import { SITE_ARTICLES, SITE_REDIRECTS } from './articles/chapters';
import { lexiconCatalogRows, traceCatalogRows } from './catalog-rows';
import { assertFieldOwnership, fieldsForFacet } from './ownership';
import {
	assertFacetPlacementComplete,
	FACET_SECTION,
	isDocWorthyUnion,
	UNION_SECTION,
} from './placement';
import { projectArticleText, ttrMinutesFromText } from './project-text';
import { resolveBlock } from './resolve-blocks';
import {
	type AuthoredBlock,
	type ComposeOptions,
	DOC_SECTIONS,
	type DocArticle,
	type DocArticleDef,
	type DocIndex,
	type DocTreeNode,
	type PageSymbol,
	type ResolvedBlock,
} from './schema';
import { isWideStill } from './still-match';
import { unionMembers } from './union-docs';

const AUTHORED_ID = /^[a-z][a-z0-9-]*$/;
const SUMMARY_MIN = 110;
const SUMMARY_MAX = 160;
const FAQ_MAX = 5;
function catalogHash(version: string): string {
	const keys = [...Object.keys(PROFILE_FIELDS), ...Object.keys(EXTRA_FIELDS)].sort().join('\n');
	return createHash('sha256').update(`${version}\n${keys}`).digest('hex').slice(0, 12);
}

function assertArticleDef(def: DocArticleDef): void {
	if (def.id !== def.slug) throw new Error(`Chapter id ${def.id} must equal slug`);
	if (def.id !== def.topic) throw new Error(`Chapter ${def.id} topic must equal id`);
	if (!def.entry || def.entry.startsWith('/') || def.entry.includes('..')) {
		throw new Error(`${def.id} entry must be a kernel-relative path`);
	}
	if (def.summary.length < SUMMARY_MIN || def.summary.length > SUMMARY_MAX) {
		throw new Error(
			`${def.id} summary is ${String(def.summary.length)} chars; need ${String(SUMMARY_MIN)}–${String(SUMMARY_MAX)}`,
		);
	}
	const lede = def.blocks.find((block) => block.kind === 'lede');
	if (lede?.text === def.summary) {
		throw new Error(`${def.id} summary equals the lede`);
	}
	if (def.faq && def.faq.length > FAQ_MAX) {
		throw new Error(`${def.id} faq has more than ${String(FAQ_MAX)} items`);
	}
	if (def.questions) {
		if (!def.questions.length) throw new Error(`${def.id} questions is empty`);
		for (const item of def.questions) {
			if (!item.question.trim()) throw new Error(`${def.id} questions has a blank entry`);
		}
	}
	for (const block of def.blocks) {
		if (!AUTHORED_ID.test(block.id)) {
			throw new Error(`${def.id} block id "${block.id}" is not a kebab token`);
		}
		if (block.kind === 'prose' && !block.title.trim()) {
			throw new Error(`${def.id}#${block.id} prose title is blank`);
		}
		if (block.kind === 'code' && block.title !== undefined && !block.title.trim()) {
			throw new Error(`${def.id}#${block.id} code title is blank`);
		}
	}
}

function coverExists(src: string, publicRoot: string): boolean {
	return existsSync(path.join(publicRoot, src.replace(/^\//, '')));
}

function assertCovers(def: DocArticleDef, publicRoot: string): void {
	if (!def.cover) throw new Error(`${def.id} needs a wide cover`);
	if (!isWideStill(def.cover.src))
		throw new Error(`${def.id} cover is not a wide still: ${def.cover.src}`);
	if (!coverExists(def.cover.src, publicRoot)) {
		throw new Error(`${def.id} cover missing at ${def.cover.src}`);
	}
}

function assertUniqueCovers(defs: readonly DocArticleDef[]): void {
	const seen = new Map<string, string>();
	for (const def of defs) {
		const src = def.cover?.src;
		if (!src) continue;
		const other = seen.get(src);
		if (other) throw new Error(`cover ${src} used by ${other} and ${def.id}`);
		seen.set(src, def.id);
	}
}

function assertChapterSources(readmePath: string): void {
	const root = path.dirname(readmePath);
	for (const def of SITE_ARTICLES) {
		if (!existsSync(path.join(root, def.entry))) {
			throw new Error(`${def.id} entry missing ${def.entry}`);
		}
	}
}

function pushFieldSymbol(
	symbols: PageSymbol[],
	seen: Set<string>,
	reserved: ReadonlySet<string>,
	fieldPath: string,
): void {
	if (seen.has(fieldPath) || reserved.has(fieldPath)) return;
	const meta = fieldMeta(fieldPath);
	if (meta === undefined) throw new Error(`fieldMeta(${fieldPath}) is undefined`);
	seen.add(fieldPath);
	symbols.push({ kind: 'field', id: fieldPath, path: fieldPath, meta });
}

function pageSymbolsFor(topic: DocArticle['topic'], reserved: ReadonlySet<string>): PageSymbol[] {
	const symbols: PageSymbol[] = [];
	const seen = new Set<string>();

	for (const facet of PROFILE_GRAPH) {
		if (FACET_SECTION[facet.id].page !== topic) continue;
		for (const fieldPath of fieldsForFacet(facet.id)) {
			pushFieldSymbol(symbols, seen, reserved, fieldPath);
		}
	}

	if (topic === 'tools') {
		for (const fieldPath of Object.keys(EXTRA_FIELDS)) {
			pushFieldSymbol(symbols, seen, reserved, fieldPath);
		}
	}

	for (const [name, place] of Object.entries(UNION_SECTION)) {
		if (!isDocWorthyUnion(name)) continue;
		if (place.page !== topic) continue;
		for (const member of unionMembers(name)) {
			const id = `${name.toLowerCase().replace(/_/g, '-')}:${member.value}`;
			if (seen.has(id) || reserved.has(id)) continue;
			seen.add(id);
			symbols.push({
				kind: 'union-member',
				id,
				union: name,
				value: member.value,
				doc: member.doc,
			});
		}
	}

	if (topic === 'traces') {
		for (const row of traceCatalogRows()) {
			const id = `trace:${row.key}`;
			if (seen.has(id) || reserved.has(id)) continue;
			seen.add(id);
			symbols.push({ kind: 'trace', id, key: row.key, label: row.label, doc: row.doc });
		}
	}

	if (topic === 'statuses') {
		for (const row of lexiconCatalogRows()) {
			const id = `lexicon:${row.key}`;
			if (seen.has(id) || reserved.has(id)) continue;
			seen.add(id);
			symbols.push({ kind: 'lexicon', id, key: row.key, text: row.text });
		}
	}

	return symbols;
}

function collectIds(blocks: readonly ResolvedBlock[]): string[] {
	return blocks.map((block) => block.id);
}

function assertUniqueIds(
	slug: string,
	blocks: readonly ResolvedBlock[],
	symbols: readonly PageSymbol[],
): void {
	const seen = new Set<string>();
	for (const id of [...collectIds(blocks), ...symbols.map((symbol) => symbol.id)]) {
		if (seen.has(id)) throw new Error(`/${slug} duplicate id ${id}`);
		seen.add(id);
	}
}

function assertActions(def: DocArticleDef, slugs: Set<string>): void {
	for (const action of def.actions ?? []) {
		if (action.kind === 'open' && !slugs.has(action.slug)) {
			throw new Error(`${def.id} action.open unknown slug ${action.slug}`);
		}
		if (action.kind === 'copy' && !def.blocks.some((block) => block.id === action.blockId)) {
			throw new Error(`${def.id} action.copy missing block ${action.blockId}`);
		}
	}
}

function blockTitle(block: ResolvedBlock): string | undefined {
	if (block.kind === 'prose') return block.title;
	if (block.kind === 'code') return block.title;
	return undefined;
}

function headingNodes(article: DocArticle): DocTreeNode[] {
	const nodes: DocTreeNode[] = [];
	for (const block of article.blocks) {
		const title = blockTitle(block);
		if (title === undefined) continue;
		nodes.push({
			id: `${article.slug}#${block.id}`,
			label: title,
			slug: article.slug,
			blockId: block.id,
			children: [],
		});
	}
	return nodes;
}

function assertProfileTypeSections(blocks: readonly ResolvedBlock[]): void {
	for (const type of PROFILE_TYPES) {
		if (!blocks.some((block) => block.id === type)) {
			throw new Error(`modalities missing #${type} member section`);
		}
	}
}

function buildTree(articles: readonly DocArticle[]): DocTreeNode[] {
	return DOC_SECTIONS.map((section) => {
		const article = articles.find((item) => item.topic === section);
		if (!article) throw new Error(`Missing chapter for section ${section}`);
		return {
			id: section,
			label: article.title,
			slug: article.slug,
			children: headingNodes(article),
		};
	});
}

function updatedLabel(options: ComposeOptions): string {
	if (
		!options.kernelVersion ||
		options.kernelVersion === '1.0.0' ||
		options.kernelVersion === '0.0.0'
	) {
		throw new Error(`kernel-meta version fallback ${options.kernelVersion || '(empty)'}`);
	}
	if (!options.kernelHead) throw new Error('kernel-meta HEAD is empty');
	return `kernel ${options.kernelVersion}${options.kernelDirty ? '+dirty' : ''}`;
}

function resolveAuthored(def: DocArticleDef, readmePath: string): ResolvedBlock[] {
	return def.blocks.map((block: AuthoredBlock) => resolveBlock(block, readmePath));
}

export function composeDocIndex(options: ComposeOptions): DocIndex {
	assertFacetPlacementComplete();
	assertFieldOwnership();

	const slugs = new Set(SITE_ARTICLES.map((article) => article.slug));
	if (slugs.size !== DOC_SECTIONS.length) {
		throw new Error('SITE_ARTICLES must be one chapter per DOC_SECTION');
	}
	for (const section of DOC_SECTIONS) {
		if (!slugs.has(section)) throw new Error(`Missing chapter ${section}`);
	}
	assertUniqueCovers(SITE_ARTICLES);
	assertChapterSources(options.readmePath);

	const ranks = new Set<number>();
	const label = updatedLabel(options);
	const hash = catalogHash(options.kernelVersion);
	const truth = {
		kernelVersion: options.kernelVersion,
		kernelHead: options.kernelHead,
		catalogHash: hash,
	};

	const articles: DocArticle[] = SITE_ARTICLES.map((def) => {
		assertArticleDef(def);
		assertCovers(def, options.publicRoot);
		assertActions(def, slugs);
		if (def.suggest) {
			if (ranks.has(def.suggest.rank)) {
				const other = SITE_ARTICLES.find(
					(article) => article.suggest?.rank === def.suggest?.rank && article.slug !== def.slug,
				);
				throw new Error(
					`Duplicate suggest rank ${String(def.suggest.rank)}: ${other?.slug ?? '?'} and ${def.slug}`,
				);
			}
			ranks.add(def.suggest.rank);
		}

		const blocks = resolveAuthored(def, options.readmePath);
		const symbols = pageSymbolsFor(def.topic, new Set(collectIds(blocks)));
		if (def.topic === 'modalities') assertProfileTypeSections(blocks);
		assertUniqueIds(def.slug, blocks, symbols);

		const questions = def.questions ?? [];
		const projected = projectArticleText({
			id: def.id,
			slug: def.slug,
			title: def.title,
			topic: def.topic,
			entry: def.entry,
			kind: def.kind,
			summary: def.summary,
			actions: def.actions ?? [],
			questions,
			faq: def.faq ?? [],
			canonicalPath: `/docs/${def.slug}`,
			truth,
			ttrMinutes: 1,
			updatedLabel: label,
			blocks,
			symbols,
		});
		return {
			id: def.id,
			slug: def.slug,
			title: def.title,
			topic: def.topic,
			entry: def.entry,
			kind: def.kind,
			summary: def.summary,
			cover: def.cover,
			suggest: def.suggest,
			actions: def.actions ?? [],
			questions,
			faq: def.faq ?? [],
			canonicalPath: `/docs/${def.slug}`,
			truth,
			ttrMinutes: ttrMinutesFromText(projected),
			updatedLabel: label,
			dateModified: options.lastmodBySlug?.[def.slug],
			blocks,
			symbols,
		};
	});

	if (ranks.size !== 3 && ranks.size !== 4) {
		throw new Error(`suggested ranks must be 3 or 4 unique values, got ${String(ranks.size)}`);
	}

	const bySlug: Record<string, DocArticle | undefined> = {};
	const seenSlugs = new Set<string>();
	for (const article of articles) {
		if (seenSlugs.has(article.slug)) throw new Error(`Duplicate slug ${article.slug}`);
		seenSlugs.add(article.slug);
		bySlug[article.slug] = article;
	}

	const suggested = articles
		.filter((article) => article.suggest)
		.map((article) => ({
			slug: article.slug,
			blockId: article.suggest?.blockId,
			rank: article.suggest?.rank ?? 1,
		}))
		.sort((a, b) => a.rank - b.rank);

	return {
		articles,
		tree: buildTree(articles),
		suggested,
		bySlug,
		redirects: [...SITE_REDIRECTS],
	};
}

export { SITE_ARTICLES };
