import type { DocSearchHit } from './query';
import type { DocIndex } from './schema';

/** The words th30 says when it cites a hit: the chapter, the part of it, and where it is. */
export function sourceOf(chapter: string | undefined, part: string, href: string): string {
	const named = chapter && chapter !== part ? `${chapter}, ${part}` : part;
	return `${named} (${href})`;
}

/** What the searchDocs tool answers, for hits found by the server's keyword search or the page's. */
export function th30SearchOutput(
	index: DocIndex,
	search: { query: string; results: readonly DocSearchHit[]; totalMatches: number },
) {
	return {
		query: search.query,
		results: search.results.map((hit) => ({
			title: hit.title,
			source: sourceOf(index.bySlug[hit.slug]?.title, hit.title, hit.href),
			slug: hit.slug,
			blockId: hit.blockId,
			urlOrAnchor: hit.href,
			excerpt: hit.excerpt,
		})),
		totalMatches: search.totalMatches,
	};
}
