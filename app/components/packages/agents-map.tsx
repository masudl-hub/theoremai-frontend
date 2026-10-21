import { Card } from '@astryxdesign/core/Card';
import { createArchitectWorkspace } from '@theoremjs/studio';
import { StudioTreeMap } from '@theoremjs/studio/ui/tree-map.tsx';
import { useState } from 'react';

/**
 * The agents tile's map: the studio's tree of the code architect and the narrator it calls, every
 * row open, drawn as the map draws.
 */
export default function AgentsMap() {
	const [workspace] = useState(createArchitectWorkspace);
	return (
		<Card variant="glass" padding={0} elevation="med" className="packages-map" inert aria-hidden>
			<StudioTreeMap workspace={workspace} />
		</Card>
	);
}
