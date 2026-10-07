import { DocsLanding } from '../components/docs/landing';
import { PageJsonLd } from '../components/page-summary';
import { getDocIndex } from '../lib/docs/.server/load-index';
import { docsLandingJsonLd } from '../lib/docs/machine';
import { SITE_NAME } from '../lib/home-content';
import type { Route } from './+types/docs';

const DESCRIPTION = 'Search the theorem docs, or start with how to define an agent and run a turn.';

export function meta({ loaderData }: Route.MetaArgs) {
	const url = `${loaderData.origin}/docs`;
	return [
		{ title: 'theorem docs' },
		{ name: 'description', content: DESCRIPTION },
		{ tagName: 'link', rel: 'canonical', href: url },
		{ property: 'og:type', content: 'website' },
		{ property: 'og:site_name', content: SITE_NAME },
		{ property: 'og:url', content: url },
		{ property: 'og:title', content: 'theorem docs' },
		{ property: 'og:description', content: DESCRIPTION },
		{ name: 'twitter:card', content: 'summary' },
	];
}

export function loader({ request }: Route.LoaderArgs) {
	return { index: getDocIndex(), origin: new URL(request.url).origin };
}

export default function DocsLandingPage({ loaderData }: Route.ComponentProps) {
	return (
		<>
			<PageJsonLd data={docsLandingJsonLd(loaderData.index, loaderData.origin)} />
			<DocsLanding index={loaderData.index} />
		</>
	);
}
