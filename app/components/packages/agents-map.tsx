import { createArchitectWorkspace } from '@theoremjs/studio';
import { StudioTreeMap } from '@theoremjs/studio/ui/tree-map.tsx';
import { useState } from 'react';

/**
 * The agents tile's map: the studio's tree of the code architect and the narrator it calls, every
 * row open, with the providers and tools that feed it, drawn as the map draws on the tile itself.
 */
export default function AgentsMap() {
	const [workspace] = useState(createArchitectWorkspace);
	return (
		<div className="packages-map" inert aria-hidden>
			<StudioTreeMap workspace={workspace} />
		</div>
	);
}
