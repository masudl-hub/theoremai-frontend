import { Card } from '@astryxdesign/core/Card';
import { createArchitectWorkspace } from '@theoremjs/studio';
import { StudioTreeMap } from '@theoremjs/studio/ui/tree-map.tsx';
import { useState } from 'react';

/**
 * The agents tile's map: the studio's tree of the code architect, every row open, with its runner,
 * providers and tool registry beside it, drawn as the map draws on a glass card sized to it.
 */
export default function AgentsMap() {
	const [workspace] = useState(createArchitectWorkspace);
	return (
		<Card variant="glass" padding={0} elevation="med" className="packages-map" inert aria-hidden>
			<StudioTreeMap workspace={workspace} agent={workspace.agents[0]?.key} />
		</Card>
	);
}
