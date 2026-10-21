import { useEffect, useMemo, useState } from 'react';
import { clientDocIndex, loadedDocIndex } from './client-index';
import { type DocSearchHit, searchDocs } from './query';
import type { DocIndex } from './schema';

/** What the hook gives back: the hits to show, the question they answer, and how they were ranked. */
export type DocsSearch = {
	/** The trimmed question these hits answer; it trails the field while typing and is '' for no question. */
	term: string;
	results: DocSearchHit[];
	totalMatches: number;
	/** `words` until the model has answered for this question; `meaning` after; `words-only` if it cannot. */
	ranking: 'words' | 'meaning' | 'words-only';
};

/** How long the field must rest before a question is searched; clearing it applies at once. */
const SETTLE_MS = 200;

/** One shared answer for an empty question, so callers that key effects on `results` see no change. */
const NO_QUESTION: DocsSearch = { term: '', results: [], totalMatches: 0, ranking: 'words' };

type Semantic = Awaited<ReturnType<typeof import('./semantic').searchDocsSemantic>>;

/** The question once the field has rested; an empty field settles at once. */
function useSettledTerm(typed: string): string {
	const [term, setTerm] = useState(typed);
	useEffect(() => {
		if (!typed) {
			setTerm('');
			return;
		}
		const timer = window.setTimeout(() => {
			setTerm(typed);
		}, SETTLE_MS);
		return () => {
			window.clearTimeout(timer);
		};
	}, [typed]);
	return typed ? term : '';
}

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
 * Docs search for a question. The field is searched once it rests, and the hits shown change once
 * per question: until the new question has its answer, the previous hits stay. The first answer is
 * the keyword hits, replaced by the ranking that understands intent when the model has embedded the
 * question; once the model has answered before, its answer is quick, so the keyword step is skipped.
 * The index and the model are fetched the first time a question is searched (or a search box gets
 * focus); when the model cannot load, the keyword hits stay.
 */
export function useDocsSearch(query: string, limit: number): DocsSearch {
	const term = useSettledTerm(query.trim());
	const index = useIndexFor(term);
	const ready = index !== undefined && index !== 'failed' ? index : undefined;
	const words = useMemo(
		() => (ready && term ? searchDocs(ready, term, limit) : undefined),
		[ready, term, limit],
	);
	const [answer, setAnswer] = useState<{ term: string; hits: Semantic } | 'failed'>();
	const [modelWarm, setModelWarm] = useState(false);
	useEffect(() => {
		if (!term || !ready) return;
		let current = true;
		void import('./semantic')
			.then(({ searchDocsSemantic }) => searchDocsSemantic(ready, term, limit))
			.then(
				(hits) => {
					if (!current) return;
					setAnswer({ term, hits });
					setModelWarm(true);
				},
				() => {
					if (current) setAnswer('failed');
				},
			);
		return () => {
			current = false;
		};
	}, [ready, term, limit]);

	const settled = useMemo((): DocsSearch | undefined => {
		if (!term) return NO_QUESTION;
		if (index === 'failed') return { ...NO_QUESTION, term, ranking: 'words-only' };
		if (!words) return undefined;
		if (answer === 'failed') return { term, ...words, ranking: 'words-only' };
		if (answer?.term === term) {
			return {
				term,
				results: answer.hits.results,
				totalMatches: answer.hits.totalMatches,
				ranking: 'meaning',
			};
		}
		return modelWarm ? undefined : { term, ...words, ranking: 'words' };
	}, [term, index, words, answer, modelWarm]);

	const [shown, setShown] = useState<DocsSearch>(NO_QUESTION);
	if (settled && settled !== shown) setShown(settled);
	return settled ?? shown;
}
