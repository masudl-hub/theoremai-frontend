import { DocsLanding } from '../components/docs/landing';
import { getDocIndex } from '../lib/docs/.server/load-index';
import type { Th30PageHandle } from '../lib/th30-page';
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

export const handle = {
	th30Page: () => ({
		title: 'Docs',
		summary:
			'The docs landing: a search box, a starter prompt to copy, links to GitHub issues, contributing, DeepWiki and the playground, and four featured reads: get started, define your agent, add tools, set guardrails. th30 can search the docs and open any chapter for the visitor.',
	}),
} satisfies Th30PageHandle;

export function loader() {
	return { index: getDocIndex() };
}

export default function DocsLandingPage({ loaderData }: Route.ComponentProps) {
	return <DocsLanding index={loaderData.index} />;
}
