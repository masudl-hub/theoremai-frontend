import { openStudioRun } from '@theoremjs/studio/ui/lib/studio-run-open.ts';
import { StudioRunScreen, studioRunTitle } from '@theoremjs/studio/ui/studio-run.tsx';
import { redirect } from 'react-router';
import type { Th30PageHandle } from '../lib/th30-page';
import type { Route } from './+types/studio.run';

export const handle = {
	th30Page: (data: Route.ComponentProps['loaderData'] | undefined) => ({
		// The draft loads in the browser, so the server render has no payload yet.
		title: data?.payload ? studioRunTitle(data.payload) : 'Run',
		summary:
			'The agent opened from the studio with Open in a new tab. It fills the panel beside the rail. A decision or a host starts as the centred request. When it runs, the request moves left and the response comes in on the right. The trace docks at the right and eases open. View trace and Keys sit inside that panel, at the top right. The rail returns to the studio.',
	}),
} satisfies Th30PageHandle;

/**
 * The compiled draft lives in this browser's storage, so it only loads client-side. A missing one
 * returns to the studio. A project's agent runs on the dev server only, where a project can be open.
 */
export function clientLoader({ request }: Route.ClientLoaderArgs) {
	return openStudioRun(request.url, { project: import.meta.env.DEV }) ?? redirect('/studio');
}

export function HydrateFallback() {
	return null;
}

/** The run page from `@theoremjs/studio`, in the site's shell. */
export default function StudioRun({ loaderData }: Route.ComponentProps) {
	return <StudioRunScreen opened={loaderData} />;
}
