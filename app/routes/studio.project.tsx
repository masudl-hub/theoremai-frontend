/**
 * The studio, opened on the project a local server holds. Same page, same tree, editor and
 * preview; the workspace is the project's, and a run is the project's own code.
 */
import { openStudioProject } from '@theoremjs/studio/ui/lib/studio-open.ts';
import { StudioNoProject } from '@theoremjs/studio/ui/studio-no-project.tsx';
import { SITE_NAME } from '../lib/home-content';

export { default, HydrateFallback, handle } from './studio';

export function meta() {
	return [
		{ title: `Your project · Studio · ${SITE_NAME}` },
		{ name: 'robots', content: 'noindex' },
	];
}

/** The project's workspace, as the studio's loader hands its own. Nothing of it is kept in the tab. */
export function clientLoader() {
	return openStudioProject();
}

export function ErrorBoundary() {
	return <StudioNoProject />;
}
