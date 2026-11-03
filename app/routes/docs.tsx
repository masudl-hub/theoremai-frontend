import { DocsLanding } from '../components/docs/landing';
import { PageJsonLd } from '../components/page-summary';
import { getDocShell } from '../lib/docs/.server/load-index';
import { docsLandingJsonLd } from '../lib/docs/machine';
import { SITE_NAME, SITE_ORIGIN } from '../lib/site-identity';
import type { Route } from './+types/docs';

const DESCRIPTION = 'Search the theorem docs, or start with how to define an agent and run a turn.';

const FEATURED = [
	{ slug: 'start', title: 'Get started' },
	{ slug: 'profiles', title: 'Define your agent' },
	{ slug: 'tools', title: 'Add tools' },
	{ slug: 'guardrails', title: 'Set guardrails' },
];

export function meta({ loaderData }: Route.MetaArgs) {
	const url = `${loaderData.origin}/docs`;
	return [
		{ title: 'theorem docs' },
		{ name: 'description', content: DESCRIPTION },
		{ tagName: 'link', rel: 'canonical', href: url },
		{ tagName: 'link', rel: 'alternate', type: 'text/markdown', href: '/docs.md' },
		{ property: 'og:type', content: 'website' },
		{ property: 'og:site_name', content: SITE_NAME },
		{ property: 'og:url', content: url },
		{ property: 'og:title', content: 'theorem docs' },
		{ property: 'og:description', content: DESCRIPTION },
		{ name: 'twitter:card', content: 'summary' },
	];
}

/** Built ahead of time (`react-router.config.ts`), so this runs once, with no visitor's request. */
export function loader() {
	const shell = getDocShell();
	const featured = FEATURED.flatMap(({ slug, title }) => {
		const article = shell.articles.find((card) => card.slug === slug);
		return article === undefined ? [] : [{ article, title }];
	});
	return { featured, jsonLd: docsLandingJsonLd(shell, SITE_ORIGIN), origin: SITE_ORIGIN };
}

export default function DocsLandingPage({ loaderData }: Route.ComponentProps) {
	return (
		<>
			<PageJsonLd data={loaderData.jsonLd} />
			<DocsLanding featured={loaderData.featured} />
		</>
	);
}
