/**
 * Th30 read / search / navigate over the composed index. One projector.
 */

import { fragmentLabel } from './headings';
import { formatWithLineNumbers, projectArticleText, projectBlockText } from './project-text';
import type { DocArticle, DocIndex, ResolvedBlock } from './schema';

export function articleHref(article: Pick<DocArticle, 'canonicalPath'>, blockId?: string): string {
	return blockId ? `${article.canonicalPath}#${blockId}` : article.canonicalPath;
}

export function articleHasBlock(article: DocArticle, blockId: string): boolean {
	if (article.blocks.some((block) => block.id === blockId)) return true;
	return article.blocks.some((block) => blockIdsIn(block).includes(blockId));
}

function blockIdsIn(block: ResolvedBlock): string[] {
	if (block.kind === 'facts') return block.items.map((item) => item.id);
	if (block.kind === 'fields') return block.rows.map((row) => row.path);
	if (block.kind === 'union') {
		return block.members.flatMap((member) =>
			member.doc ? [`${block.id}:${member.value}`] : [member.value],
		);
	}
	if (block.kind === 'trace' || block.kind === 'lexicon') {
		return block.rows.map((row) => `${block.id}:${row.key}`);
	}
	return [];
}

function isolateFragment(article: DocArticle, fragment: string): DocArticle | undefined {
	const exact = article.blocks.find((block) => block.id === fragment);
	if (exact) return { ...article, blocks: [exact] };

	for (const block of article.blocks) {
		if (block.kind === 'fields') {
			const row = block.rows.find((item) => item.path === fragment);
			if (row) return { ...article, blocks: [{ ...block, rows: [row] }] };
		}
		if (block.kind === 'facts') {
			const item = block.items.find((fact) => fact.id === fragment);
			if (item) return { ...article, blocks: [{ ...block, items: [item] }] };
		}
		if (block.kind === 'union') {
			const member = block.members.find(
				(entry) => entry.value === fragment || `${block.id}:${entry.value}` === fragment,
			);
			if (member) return { ...article, blocks: [{ ...block, members: [member] }] };
		}
		if (block.kind === 'trace') {
			const row = block.rows.find(
				(entry) => entry.key === fragment || `${block.id}:${entry.key}` === fragment,
			);
			if (row) return { ...article, blocks: [{ ...block, rows: [row] }] };
		}
		if (block.kind === 'lexicon') {
			const row = block.rows.find(
				(entry) => entry.key === fragment || `${block.id}:${entry.key}` === fragment,
			);
			if (row) return { ...article, blocks: [{ ...block, rows: [row] }] };
		}
	}
	return undefined;
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
	const trimmed = target.trim();
	if (trimmed === 'full_page' || trimmed === 'all') {
		const text = index.articles.map((article) => projectArticleText(article, detail)).join('\n\n');
		const formatted = formatWithLineNumbers('THEOREM docs', text);
		return {
			target: 'full_page',
			title: 'THEOREM docs',
			content: formatted,
			lineCount: text.split('\n').length,
		};
	}

	const [slugPart, fragment] = trimmed.replace(/^\/docs\//, '').split('#');
	const slug = slugPart || trimmed;
	const article = index.bySlug[slug];
	if (article === undefined) {
		const valid = index.articles.map((item) => item.slug).join(', ');
		return {
			target,
			title: 'Not found',
			content: `Article '${target}' not found. Valid slugs: ${valid}`,
			lineCount: 1,
		};
	}

	if (fragment) {
		const isolated = isolateFragment(article, fragment);
		if (!isolated) {
			const text = projectArticleText(article, detail);
			const formatted = formatWithLineNumbers(article.title, text);
			return {
				target: articleHref(article),
				title: article.title,
				content: formatted,
				lineCount: text.split('\n').length,
			};
		}
		const text = projectArticleText(isolated, detail);
		const formatted = formatWithLineNumbers(`${article.title}#${fragment}`, text);
		return {
			target: articleHref(article, fragment),
			title: `${article.title}#${fragment}`,
			content: formatted,
			lineCount: text.split('\n').length,
		};
	}

	const text = projectArticleText(article, detail);
	const formatted = formatWithLineNumbers(article.title, text);
	return {
		target: article.canonicalPath,
		title: article.title,
		content: formatted,
		lineCount: text.split('\n').length,
	};
}

export type DocSearchHit = {
	slug: string;
	title: string;
	href: string;
	excerpt: string;
	score: number;
	blockId?: string;
};

type FragmentTarget = {
	id: string;
	hay: string;
	excerpt: string;
	kind: 'block' | 'leaf';
};

function scoreHay(hay: string, terms: readonly string[], weight: number): number {
	let score = 0;
	for (const term of terms) {
		if (hay.includes(term)) score += weight;
	}
	return score;
}

function clipExcerpt(text: string, max = 160): string {
	const flat = text.split('\n').filter(Boolean).join(' ');
	if (flat.length <= max) return flat;
	const cut = flat.slice(0, max);
	const space = cut.lastIndexOf(' ');
	return `${(space > 80 ? cut.slice(0, space) : cut).trim()}…`;
}

function fragmentTargets(article: DocArticle): FragmentTarget[] {
	const out: FragmentTarget[] = [];
	for (const block of article.blocks) {
		const blockText = projectBlockText(block);
		out.push({
			id: block.id,
			hay: `${block.id}\n${blockText}`.toLowerCase(),
			excerpt: clipExcerpt(blockText),
			kind: 'block',
		});
		if (block.kind === 'fields') {
			for (const row of block.rows) {
				const unset = row.meta.unset ? ` Omit → ${row.meta.unset}.` : '';
				const excerpt = row.meta.doc;
				out.push({
					id: row.path,
					hay: `${row.path} — ${excerpt}${unset}`.toLowerCase(),
					excerpt,
					kind: 'leaf',
				});
			}
		}
		if (block.kind === 'facts') {
			for (const item of block.items) {
				const excerpt = `${item.label}: ${item.value}`;
				out.push({
					id: item.id,
					hay: `${item.id} ${excerpt}`.toLowerCase(),
					excerpt,
					kind: 'leaf',
				});
			}
		}
		if (block.kind === 'union') {
			for (const member of block.members) {
				const id = member.doc ? `${block.id}:${member.value}` : member.value;
				const excerpt = member.doc || member.value;
				out.push({
					id,
					hay: excerpt.toLowerCase(),
					excerpt,
					kind: 'leaf',
				});
			}
		}
		if (block.kind === 'trace') {
			for (const row of block.rows) {
				const excerpt = `${row.label}. ${row.doc}`;
				out.push({
					id: `${block.id}:${row.key}`,
					hay: `${row.key} — ${excerpt}`.toLowerCase(),
					excerpt,
					kind: 'leaf',
				});
			}
		}
		if (block.kind === 'lexicon') {
			for (const row of block.rows) {
				out.push({
					id: `${block.id}:${row.key}`,
					hay: `${row.key} — ${row.defaultText}`.toLowerCase(),
					excerpt: row.defaultText,
					kind: 'leaf',
				});
			}
		}
	}
	return out;
}

function isChildFragment(child: string, parent: string): boolean {
	return child.startsWith(`${parent}.`) || child.startsWith(`${parent}:`);
}

function querySpecifiesChild(childId: string, parentId: string, terms: readonly string[]): boolean {
	const child = childId.toLowerCase();
	const parent = parentId.toLowerCase();
	const extra = child.slice(parent.length).replace(/^[.:_-]+/, '');
	if (!extra) return false;
	return terms.some((term) => term === child || term === extra || extra.includes(term));
}

function collapseIdHits(
	hits: { target: FragmentTarget; idScore: number; score: number }[],
	terms: readonly string[],
): { target: FragmentTarget; score: number }[] {
	const sorted = [...hits].sort(
		(a, b) => b.score - a.score || a.target.id.length - b.target.id.length,
	);
	const kept: { target: FragmentTarget; score: number }[] = [];
	for (const hit of sorted) {
		const covered = kept.some(
			(parent) =>
				isChildFragment(hit.target.id, parent.target.id) &&
				!querySpecifiesChild(hit.target.id, parent.target.id, terms),
		);
		if (covered) continue;
		kept.push({ target: hit.target, score: hit.score });
	}
	return kept;
}

export function searchDocs(
	index: DocIndex,
	query: string,
	limit = 5,
): {
	query: string;
	results: DocSearchHit[];
	totalMatches: number;
} {
	const terms = query
		.toLowerCase()
		.split(/\s+/)
		.map((term) => term.trim())
		.filter((term) => term.length > 0);
	if (!terms.length) return { query, results: [], totalMatches: 0 };

	const ranked: DocSearchHit[] = [];
	for (const article of index.articles) {
		const chrome =
			scoreHay(article.title.toLowerCase(), terms, 15) +
			scoreHay(article.summary.toLowerCase(), terms, 10) +
			scoreHay(article.slug, terms, 8);
		const idHits: { target: FragmentTarget; idScore: number; score: number }[] = [];
		let bestText: { target: FragmentTarget; score: number } | undefined;
		for (const target of fragmentTargets(article)) {
			const idScore = scoreHay(target.id.toLowerCase(), terms, 12);
			const textScore = scoreHay(target.hay, terms, 5);
			const score = idScore + textScore;
			if (score <= 0) continue;
			if (idScore > 0) {
				idHits.push({ target, idScore, score });
				continue;
			}
			if (target.kind === 'block' && (bestText === undefined || score > bestText.score)) {
				bestText = { target, score };
			}
		}

		if (idHits.length) {
			for (const hit of collapseIdHits(idHits, terms)) {
				ranked.push({
					slug: article.slug,
					title: fragmentLabel(hit.target.id),
					href: articleHref(article, hit.target.id),
					excerpt: hit.target.excerpt,
					score: hit.score + chrome,
					blockId: hit.target.id,
				});
			}
			continue;
		}
		if (chrome > 0) {
			ranked.push({
				slug: article.slug,
				title: article.title,
				href: articleHref(article),
				excerpt:
					article.summary.length > 0 ? article.summary : projectArticleText(article, 'summary'),
				score: chrome + (bestText?.score ?? 0),
			});
			continue;
		}
		if (bestText) {
			ranked.push({
				slug: article.slug,
				title: fragmentLabel(bestText.target.id),
				href: articleHref(article, bestText.target.id),
				excerpt: bestText.target.excerpt,
				score: bestText.score,
				blockId: bestText.target.id,
			});
		}
	}
	ranked.sort((a, b) => b.score - a.score);
	return {
		query,
		results: ranked.slice(0, limit),
		totalMatches: ranked.length,
	};
}

export function formatNavigableForPrompt(index: DocIndex): string {
	return index.articles.map((article) => `${article.slug} (${article.title})`).join(', ');
}
