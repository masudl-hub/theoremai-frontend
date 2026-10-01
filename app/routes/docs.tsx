import { DocsLanding } from '../components/docs/landing';
import { getKernelPackageVersion } from '../lib/.server/theoremai';
import { getDocIndex } from '../lib/docs/.server/load-index';
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

export function loader() {
	return { index: getDocIndex(), version: getKernelPackageVersion() };
}

export default function DocsLandingPage({ loaderData }: Route.ComponentProps) {
	return <DocsLanding index={loaderData.index} version={loaderData.version} />;
}
