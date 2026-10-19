import { getDocIndex } from '../docs/.server/load-index';
import { symbolTerm } from '../docs/catalog-rows';
import type { DocTerm } from '../docs/schema';
import { GOAL_BEATS } from '../home-goals';

/** The names the goal explainers set between backticks. */
const explainerNames = new Set(
	GOAL_BEATS.flatMap(({ explainer }) => explainer.split('`').filter((_, at) => at % 2)),
);

/** What the docs catalog says about each of those names that it defines. */
export function homeTerms(): Record<string, DocTerm> {
	const terms: Record<string, DocTerm> = {};
	const aliases: Record<string, string> = {
		provider: 'models.*.provider',
		model: 'models',
		modality: 'profile.type',
	};
	const articles = getDocIndex().articles;
	const concepts = {
		profile: {
			name: 'Profile',
			doc: import.meta.env.KERNEL_PROFILE_DOC,
			chapter: 'modalities',
			area: 'profile',
		},
		detector: {
			name: 'Detector',
			doc: import.meta.env.KERNEL_DETECTOR_DOC,
			chapter: 'guardrails',
			area: 'guardrails',
		},
	} as const;
	for (const [label, concept] of Object.entries(concepts)) {
		if (!explainerNames.has(label)) continue;
		terms[label] = {
			symbol: {
				kind: 'export',
				id: `type:${concept.name}`,
				name: concept.name,
				exported: 'type',
				doc: concept.doc,
				area: concept.area,
				chapter: concept.chapter,
			},
			slug: concept.chapter,
			href: `/docs/${concept.chapter}`,
			chapter: articles.find(({ slug }) => slug === concept.chapter)?.title ?? concept.name,
		};
	}
	for (const name of explainerNames) {
		const path = aliases[name] ?? name;
		for (const article of articles) {
			const symbol = article.symbols.find((entry) => symbolTerm(entry).name === path);
			if (!symbol) continue;
			terms[name] = {
				symbol,
				slug: symbol.chapter,
				href: `${article.canonicalPath}#${symbol.id}`,
				chapter: articles.find(({ slug }) => slug === symbol.chapter)?.title ?? article.title,
			};
			break;
		}
	}
	return terms;
}
