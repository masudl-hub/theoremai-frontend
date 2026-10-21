import { Card } from '@astryxdesign/core/Card';
import { agentNodeId, createArchitectWorkspace } from '@theoremjs/studio';
import { StudioMap } from '@theoremjs/studio/ui/studio-map.tsx';
import { useState } from 'react';

const still = () => {};

/**
 * The agents tile's map: the studio's own map of the code architect and the narrator it calls,
 * collapsed, with the architect marked. Each line is something a profile states it may use.
 */
export default function AgentsMap() {
	const [workspace] = useState(createArchitectWorkspace);
	const architect = workspace.agents[0]?.key ?? '';
	return (
		<Card variant="glass" padding={0} elevation="med" className="packages-map" inert aria-hidden>
			<StudioMap
				workspace={workspace}
				shared={[]}
				selected={agentNodeId(architect)}
				onOpen={still}
				onClose={still}
			/>
		</Card>
	);
}
