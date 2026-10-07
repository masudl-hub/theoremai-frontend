import { DocsLanding } from '../components/docs/landing';
import { getDocIndex } from '../lib/docs/.server/load-index';
import type { Route } from './+types/docs';

export function meta() {
	return [
		{ title: 'theorem docs' },
		{
			name: 'description',
			content: 'Search the theorem docs, or start with how to define an agent and run a turn.',
		},
	];
}

export function loader() {
	return { index: getDocIndex() };
}

export default function DocsLandingPage({ loaderData }: Route.ComponentProps) {
	return <DocsLanding index={loaderData.index} />;
}
