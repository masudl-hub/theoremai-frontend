import { DocsLanding } from '../components/docs/landing';
import { getKernelPackageVersion } from '../lib/.server/theoremai';
import { getDocIndex } from '../lib/docs/.server/load-index';
import type { Th30PageHandle } from '../lib/th30-page';
import type { Route } from './+types/docs';

export function meta() {
	return [
		{ title: 'Docs · Theorem' },
		{
			name: 'description',
			content: 'Theorem docs: how to define a profile and run a turn.',
		},
	];
}

export const handle = {
	th30Page: () => ({
		title: 'Docs',
		summary:
			'The docs landing: a search box and a row of suggested chapters. th30 can search the docs and open any chapter for the visitor.',
	}),
} satisfies Th30PageHandle;

export function loader() {
	return { index: getDocIndex(), version: getKernelPackageVersion() };
}

export default function DocsLandingPage({ loaderData }: Route.ComponentProps) {
	return <DocsLanding index={loaderData.index} version={loaderData.version} />;
}
