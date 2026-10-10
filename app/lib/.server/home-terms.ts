import { getDocIndex } from '../docs/.server/load-index';
import type { DocTerm } from '../docs/schema';
import { GOAL_BEATS } from '../home-goals';

/** The names the goal explainers set between backticks. */
const explainerNames = new Set(
	GOAL_BEATS.flatMap(({ explainer }) => explainer.split('`').filter((_, at) => at % 2)),
);

/** What the docs catalog says about each of those names that it defines. */
export function homeTerms(): Record<string, DocTerm> {
	const terms: Record<string, DocTerm> = {};
	for (const article of getDocIndex().articles) {
		for (const [name, term] of Object.entries(article.terms)) {
			if (term && explainerNames.has(name)) terms[name] ??= term;
		}
	}
	return terms;
}
