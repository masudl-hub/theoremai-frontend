import { useEffect, useMemo, useState } from 'react';
import { clientDocIndex, loadedDocIndex } from './client-index';
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

/** The docs index once there is a question to search it for; `failed` when it cannot be fetched. */
function useIndexFor(term: string): DocIndex | 'failed' | undefined {
	const [index, setIndex] = useState<DocIndex | 'failed' | undefined>(loadedDocIndex);
	useEffect(() => {
		if (!term || (index !== undefined && index !== 'failed')) return;
		let current = true;
		clientDocIndex().then(
			(fetched) => {
				if (current) setIndex(fetched);
			},
			() => {
				if (current) setIndex('failed');
			},
		);
		return () => {
			current = false;
		};
	}, [term, index]);
	return index;
}

/**
 * Docs search for a question: the keyword hits as soon as the index is in, replaced by the ranking
 * that understands intent once the model has embedded the question. The index and the model are
 * fetched the first time a question is searched (or a search box gets focus); when the model
 * cannot load, the keyword hits stay.
 */
export function useDocsSearch(query: string, limit: number): DocsSearch {
	const term = query.trim();
	const index = useIndexFor(term);
	const ready = index !== undefined && index !== 'failed' ? index : undefined;
	const words = useMemo(
		() => (ready ? searchDocs(ready, term, limit) : NO_QUESTION),
		[ready, term, limit],
	);
	const [answer, setAnswer] = useState<{ term: string; hits: Semantic } | 'failed'>();
	useEffect(() => {
		if (!term || !ready) return;
		let current = true;
		void import('./semantic')
			.then(({ searchDocsSemantic }) => searchDocsSemantic(ready, term, limit))
			.then(
				(hits) => {
					if (current) setAnswer({ term, hits });
				},
				() => {
					if (current) setAnswer('failed');
				},
			);
		return () => {
			current = false;
		};
	}, [ready, term, limit]);

	if (!term) return NO_QUESTION;
	if (index === 'failed' || answer === 'failed') return { ...words, ranking: 'words-only' };
	if (answer && answer.term === term) {
		return {
			results: answer.hits.results,
			totalMatches: answer.hits.totalMatches,
			ranking: 'meaning',
		};
	}
	return { ...words, ranking: 'words' };
}

/** Fetch the index, the model and the vectors ahead of the first question, for instance when a search box gets focus. */
export function warmDocsSearch(): void {
	void Promise.all([clientDocIndex(), import('./semantic')]).then(
		([index, { warmDocsSearch: warm }]) => {
			warm(index);
		},
		() => undefined,
	);
}
