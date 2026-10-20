import { openStudio } from '@theoremjs/studio/ui/lib/studio-open.ts';
import { StudioScreen } from '@theoremjs/studio/ui/studio-screen.tsx';
import { useState } from 'react';
import { SITE_STUDIO_HOST } from '../lib/studio-site-host';

/** The studio screen as /studio shows it, opened on this tab's kept draft. */
export function HomeStudioScreen() {
	const [opened] = useState(() => openStudio());
	return <StudioScreen opened={opened} host={SITE_STUDIO_HOST} />;
}
