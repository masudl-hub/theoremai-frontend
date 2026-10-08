/**
 * The studio, opened on the project a local server holds. Same page, same tree, editor and
 * preview; the workspace is the project's, and a run is the project's own code.
 */
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import { IconPlugConnectedX } from '@tabler/icons-react';
import { SITE_NAME } from '../lib/home-content';
import { openProject } from '../lib/studio-project';

export { default, HydrateFallback, handle } from './studio';

export function meta() {
	return [
		{ title: `Your project · Studio · ${SITE_NAME}` },
		{ name: 'robots', content: 'noindex' },
	];
}

/** The project's workspace, as the studio's loader hands its own. Nothing of it is kept in the tab. */
export async function clientLoader() {
	const { project, workspace } = await openProject();
	return {
		start: { workspace, revision: 0, transient: true },
		question: undefined,
		displaced: undefined,
		discarded: false,
		project,
	};
}

export function ErrorBoundary() {
	return (
		<Center style={{ height: '100%' }}>
			<EmptyState
				headingLevel={1}
				icon={<Icon icon={IconPlugConnectedX} size="lg" />}
				title="No project is open"
				description="Start the studio server in your project (studio/server/serve.ts with your setup file), then reload."
			/>
		</Center>
	);
}
