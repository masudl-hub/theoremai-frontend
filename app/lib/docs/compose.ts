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
import { resolveFact } from './facts';
import { headingLabel } from './headings';
import { assertFieldOwnership, fieldsForFacet } from './ownership';
import {
	assertFacetPlacementComplete,
	FACET_SECTION,
	headingId,
	isDocWorthyUnion,
	UNION_SECTION,
	unionOwnsHeading,
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
	for (const block of def.blocks) {
		if (!AUTHORED_ID.test(block.id)) {
			throw new Error(`${def.id} block id "${block.id}" is not a kebab token`);
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

function injectUnionMembers(blocks: ResolvedBlock[]): ResolvedBlock[] {
	const next = [...blocks];
	const types = next.find((block) => block.kind === 'union' && block.name === 'PROFILE_TYPES');
	if (types?.kind !== 'union') return next;
	const after = next.indexOf(types);
	const extras: ResolvedBlock[] = [];
	for (const member of types.members) {
		if (next.some((block) => block.id === member.value)) continue;
		extras.push({ id: member.value, kind: 'prose', text: member.doc });
	}
	next.splice(after + 1, 0, ...extras);
	if (!extras.length) return next;
	const typesIdx = next.indexOf(types);
	next[typesIdx] = {
		...types,
		members: types.members.map((member) => ({ value: member.value, doc: '' })),
	};
	return next;
}

function fieldsBlock(
	id: string,
	paths: readonly string[],
	reserved: ReadonlySet<string>,
): ResolvedBlock {
	const rows = paths
		.filter((fieldPath) => fieldPath !== id && !reserved.has(fieldPath))
		.map((fieldPath) => {
			const meta = fieldMeta(fieldPath);
			if (meta === undefined) throw new Error(`fieldMeta(${fieldPath}) is undefined`);
			return { path: fieldPath, meta };
		});
	return { id, kind: 'fields', rows };
}

function insertAfter(
	blocks: ResolvedBlock[],
	afterId: string,
	add: ResolvedBlock,
): ResolvedBlock[] {
	if (blocks.some((block) => block.id === add.id)) return blocks;
	const idx = blocks.findIndex((block) => block.id === afterId);
	if (idx < 0) return [...blocks, add];
	return [...blocks.slice(0, idx + 1), add, ...blocks.slice(idx + 1)];
}

function reservedIds(blocks: readonly ResolvedBlock[]): Set<string> {
	return new Set(collectIds(blocks));
}

function injectFacets(topic: DocArticle['topic'], blocks: ResolvedBlock[]): ResolvedBlock[] {
	let next = blocks;
	for (const facet of PROFILE_GRAPH) {
		const place = FACET_SECTION[facet.id];
		if (place.page !== topic) continue;
		const section = headingId(place.heading);
		if (!next.some((block) => block.id === section)) {
			next = [...next, { id: section, kind: 'prose', text: facet.label }];
		}
		const owned = fieldsForFacet(facet.id);
		if (!owned.length) continue;
		next = insertAfter(next, section, fieldsBlock(`${facet.id}-fields`, owned, reservedIds(next)));
	}
	return next;
}

function injectExtraFields(topic: DocArticle['topic'], blocks: ResolvedBlock[]): ResolvedBlock[] {
	if (topic !== 'tools') return blocks;
	const existing = new Set(
		blocks.flatMap((block) => (block.kind === 'fields' ? block.rows.map((row) => row.path) : [])),
	);
	const extra = Object.keys(EXTRA_FIELDS).filter((key) => !existing.has(key));
	if (!extra.length) return blocks;
	return insertAfter(blocks, 'register', fieldsBlock('extra-fields', extra, reservedIds(blocks)));
}

function injectWorthyUnions(topic: DocArticle['topic'], blocks: ResolvedBlock[]): ResolvedBlock[] {
	let next = blocks;
	for (const [name, place] of Object.entries(UNION_SECTION)) {
		if (!isDocWorthyUnion(name)) continue;
		if (place.page !== topic) continue;
		if (next.some((block) => block.kind === 'union' && block.name === name)) continue;
		const section = headingId(place.heading);
		const id = name.toLowerCase().replace(/_/g, '-');
		if (!next.some((block) => block.id === section)) {
			next = [
				...next,
				{ id: section, kind: 'prose', text: headingLabel(headingId(place.heading)) },
			];
		}
		next = insertAfter(next, section, {
			id,
			kind: 'union',
			name,
			members: unionMembers(name),
		});
	}
	return next;
}

function collectIds(blocks: readonly ResolvedBlock[]): string[] {
	const ids: string[] = [];
	for (const block of blocks) {
		ids.push(block.id);
		if (block.kind === 'facts') ids.push(...block.items.map((item) => item.id));
		if (block.kind === 'fields') ids.push(...block.rows.map((row) => row.path));
		if (block.kind === 'union')
			ids.push(...block.members.map((member) => `${block.id}:${member.value}`));
		if (block.kind === 'trace' || block.kind === 'lexicon') {
			ids.push(...block.rows.map((row) => `${block.id}:${row.key}`));
		}
	}
	return ids;
}

function assertUniqueIds(slug: string, blocks: readonly ResolvedBlock[]): void {
	const seen = new Set<string>();
	for (const id of collectIds(blocks)) {
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
	for (const related of def.related ?? []) {
		if (!slugs.has(related)) throw new Error(`${def.id} related unknown slug ${related}`);
	}
}

function isNavHeading(block: ResolvedBlock): boolean {
	if (block.id === 'lede') return false;
	if (block.kind === 'union') {
		return isDocWorthyUnion(block.name) && unionOwnsHeading(block.name, block.id);
	}
	if (block.kind === 'lede' || block.kind === 'prose') return true;
	return block.kind === 'code' && block.source.from === 'readme';
}

function nestParent(block: ResolvedBlock): string | undefined {
	if (block.kind === 'union' && isDocWorthyUnion(block.name)) {
		const section = headingId(UNION_SECTION[block.name].heading);
		if (section !== block.id) return section;
	}
	for (const place of Object.values(FACET_SECTION)) {
		if (place.heading.length >= 2 && headingId(place.heading) === block.id) {
			return place.heading[place.heading.length - 2];
		}
	}
	if ((PROFILE_TYPES as readonly string[]).includes(block.id)) {
		return headingId(UNION_SECTION.PROFILE_TYPES.heading);
	}
	return undefined;
}

function headingNodes(article: DocArticle): DocTreeNode[] {
	const headings = article.blocks.filter(isNavHeading);
	const nodes = new Map<string, { node: DocTreeNode; children: DocTreeNode[] }>();
	for (const block of headings) {
		const children: DocTreeNode[] = [];
		nodes.set(block.id, {
			children,
			node: {
				id: `${article.slug}#${block.id}`,
				label: headingLabel(block.id),
				slug: article.slug,
				blockId: block.id,
				children,
			},
		});
	}
	const roots: DocTreeNode[] = [];
	for (const block of headings) {
		const entry = nodes.get(block.id);
		if (!entry) continue;
		const parentId = nestParent(block);
		const parent = parentId ? nodes.get(parentId) : undefined;
		if (parent && parent !== entry) {
			parent.children.push(entry.node);
		} else {
			roots.push(entry.node);
		}
	}
	return roots;
}

function assertProfileTypeSections(blocks: readonly ResolvedBlock[]): void {
	for (const type of PROFILE_TYPES) {
		if (!blocks.some((block) => block.id === type)) {
			throw new Error(`profiles missing #${type} member section`);
		}
	}
}

function buildTree(articles: readonly DocArticle[]): DocTreeNode[] {
	return DOC_SECTIONS.map((section) => {
		const article = articles.find((item) => item.topic === section);
		return {
			id: section,
			label: article?.title ?? headingLabel(section),
			slug: article?.slug,
			children: article ? headingNodes(article) : [],
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

		let blocks = resolveAuthored(def, options.readmePath);
		blocks = injectWorthyUnions(def.topic, blocks);
		blocks = injectUnionMembers(blocks);
		blocks = injectFacets(def.topic, blocks);
		blocks = injectExtraFields(def.topic, blocks);
		if (def.topic === 'profiles') assertProfileTypeSections(blocks);
		assertUniqueIds(def.slug, blocks);

		const projected = projectArticleText({
			id: def.id,
			slug: def.slug,
			title: def.title,
			topic: def.topic,
			kind: def.kind,
			summary: def.summary,
			related: def.related ?? [],
			actions: def.actions ?? [],
			faq: def.faq ?? [],
			origin: 'authored',
			canonicalPath: `/docs/${def.slug}`,
			truth,
			ttrMinutes: 1,
			updatedLabel: label,
			blocks,
			tree: def.tree,
		});
		// Touch facts resolver so pair keys fail closed even when only used in authored facts.
		for (const block of def.blocks) {
			if (block.kind === 'facts') {
				for (const item of block.items) resolveFact(item);
			}
		}

		return {
			id: def.id,
			slug: def.slug,
			title: def.title,
			topic: def.topic,
			kind: def.kind,
			summary: def.summary,
			cover: def.cover,
			suggest: def.suggest,
			tree: def.tree,
			related: def.related ?? [],
			actions: def.actions ?? [],
			faq: def.faq ?? [],
			origin: 'authored' as const,
			canonicalPath: `/docs/${def.slug}`,
			truth,
			ttrMinutes: ttrMinutesFromText(projected),
			updatedLabel: label,
			dateModified: options.lastmodBySlug?.[def.slug],
			blocks,
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
