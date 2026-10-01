/**
 * Th30 read / search / navigate over the composed index. One projector.
 */

import {
	blockHeading,
	formatWithLineNumbers,
	projectArticleText,
	projectBlockText,
	symbolTerm,
} from './project-text';
import type { DocArticle, DocIndex } from './schema';

/** Display label for a fragment: block heading or catalog name. */
function fragmentTitle(article: DocArticle, id: string): string {
	const block = article.blocks.find((item) => item.id === id);
	if (block) return blockHeading(block);
	const symbol = article.symbols.find((item) => item.id === id);
	return symbol ? symbolTerm(symbol).name : id;
}

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
	return article.blocks.some((block) => block.id === blockId);
}

function isolateFragment(article: DocArticle, fragment: string): DocArticle | undefined {
	const exact = article.blocks.find((block) => block.id === fragment);
	if (exact) return { ...article, blocks: [exact], symbols: [] };

	const symbol = article.symbols.find((item) => item.id === fragment);
	if (symbol) return { ...article, blocks: [], symbols: [symbol] };

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
	const read = (href: string, title: string, text: string) => ({
		target: href,
		title,
		content: formatWithLineNumbers(title, text),
		lineCount: text.split('\n').length,
	});
	const trimmed = target.trim();
	if (trimmed === 'full_page' || trimmed === 'all') {
		const text = index.articles.map((article) => projectArticleText(article, detail)).join('\n\n');
		return read('full_page', 'Theorem docs', text);
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

	const isolated = fragment ? isolateFragment(article, fragment) : undefined;
	if (fragment && isolated) {
		const title = `${article.title}#${fragment}`;
		return read(articleHref(article, fragment), title, projectArticleText(isolated, detail));
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
	const blocks = article.blocks.map((block): FragmentTarget => {
		const text = projectBlockText(block);
		return {
			id: block.id,
			hay: `${block.id}\n${text}`.toLowerCase(),
			excerpt: clipExcerpt(text),
			kind: 'block',
		};
	});
	const leaves = article.symbols.map((symbol): FragmentTarget => {
		const { name, text } = symbolTerm(symbol);
		return { id: symbol.id, hay: `${name} — ${text}`.toLowerCase(), excerpt: text, kind: 'leaf' };
	});
	return [...blocks, ...leaves];
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
					title: fragmentTitle(article, hit.target.id),
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
				excerpt: article.summary,
				score: chrome + (bestText?.score ?? 0),
			});
			continue;
		}
		if (bestText) {
			ranked.push({
				slug: article.slug,
				title: fragmentTitle(article, bestText.target.id),
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
