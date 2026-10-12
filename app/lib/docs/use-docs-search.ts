import { useEffect, useMemo, useState } from 'react';
import { rememberDocIndex } from './client-index';
import { type DocSearchHit, searchDocs } from './query';
import type { DocIndex } from './schema';

/** What the hook gives back: the hits to show, and whether they come from meaning or only words. */
export type DocsSearch = {
	results: DocSearchHit[];
	totalMatches: number;
	/** `words` until the model has answered for this question; `meaning` after; `words-only` if it cannot. */
	ranking: 'words' | 'meaning' | 'words-only';
};

/** One shared answer for an empty question, so callers that key effects on `results` see no change. */
const NO_QUESTION: DocsSearch = { results: [], totalMatches: 0, ranking: 'words' };

type Semantic = Awaited<ReturnType<typeof import('./semantic').searchDocsSemantic>>;

/**
 * Docs search for a question: the keyword hits at once, replaced by the ranking that understands
 * intent as soon as the model has embedded the question. The model is fetched the first time a
 * question is searched in the browser; when it cannot load, the keyword hits stay.
 */
export function useDocsSearch(index: DocIndex, query: string, limit: number): DocsSearch {
	const term = query.trim();
	useEffect(() => {
		rememberDocIndex(index);
	}, [index]);
	const words = useMemo(() => searchDocs(index, term, limit), [index, term, limit]);
	const [answer, setAnswer] = useState<
		{ term: string; index: DocIndex; hits: Semantic } | 'failed'
	>();
	useEffect(() => {
		if (!term) return;
		let current = true;
		void import('./semantic')
			.then(({ searchDocsSemantic }) => searchDocsSemantic(index, term, limit))
			.then(
				(hits) => {
					if (current) setAnswer({ term, index, hits });
				},
				() => {
					if (current) setAnswer('failed');
				},
			);
		return () => {
			current = false;
		};
	}, [index, term, limit]);

	if (!term) return NO_QUESTION;
	if (answer === 'failed') return { ...words, ranking: 'words-only' };
	if (answer && answer.term === term && answer.index === index) {
		return {
			results: answer.hits.results,
			totalMatches: answer.hits.totalMatches,
			ranking: 'meaning',
		};
	}
	return { ...words, ranking: 'words' };
}

/** Load the model and the vectors ahead of the first question, for instance when a search box gets focus. */
export function warmDocsSearchFor(index: DocIndex): void {
	void import('./semantic').then(({ warmDocsSearch }) => {
		warmDocsSearch(index);
	});
}
