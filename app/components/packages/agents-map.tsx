import { Card } from '@astryxdesign/core/Card';
import {
	addAgent,
	createArchitectWorkspace,
	createLiveExampleDraft,
	decisionExampleDraft,
	type StudioWorkspace,
} from '@theoremjs/studio';
import { StudioTreeMap, type StudioTreeMapProps } from '@theoremjs/studio/ui/tree-map.tsx';
import { useState } from 'react';

/** The architect's three models, renamed for the picture: one on Gemini, two through OpenRouter. */
const MODELS = [
	{ modelId: 'Gemini 4', provider: 'gemini', apiId: 'gemini-4' },
	{ modelId: 'Opus 5.5', provider: 'openrouter', apiId: 'anthropic/claude-opus-5.5' },
	{ modelId: 'DeepSeek V4', provider: 'openrouter', apiId: 'deepseek/deepseek-v4' },
];

/**
 * The code architect, with the decision example and the travel concierge on a call after it, so the
 * map shows three runners. The concierge's tools join the registry, so it holds one of each type.
 * The narrator the architect calls stays in the workspace, for its tool, but off the map.
 */
function pictureWorkspace(): { workspace: StudioWorkspace; agents: string[] } {
	const base = createArchitectWorkspace();
	const architect = base.agents[0];
	const renamed: StudioWorkspace = {
		...base,
		agents: base.agents.map((agent) =>
			agent === architect
				? {
						...agent,
						modelBindings: agent.modelBindings.map((binding, index) => ({
							...binding,
							...MODELS[index],
						})),
						models: { ...agent.models, defaultModel: MODELS[1]?.modelId ?? '' },
					}
				: agent,
		),
	};
	const workspace = addAgent(addAgent(renamed, decisionExampleDraft()), createLiveExampleDraft());
	const added = workspace.agents.slice(base.agents.length).map((agent) => agent.key);
	return { workspace, agents: [architect.key, ...added] };
}

/**
 * The agents tile's map: the studio's tree of the code architect, a decision agent, and a live agent, every row
 * open, with their runners, providers and tool registry beside them, drawn as the map draws on a
 * glass card the tile crops. Opened, it draws more: every tool, and the steps of a turn in each turn runner.
 */
export default function AgentsMap({ detail = false }: Pick<StudioTreeMapProps, 'detail'>) {
	const [{ workspace, agents }] = useState(pictureWorkspace);
	return (
		<Card variant="glass" padding={0} elevation="med" className="packages-map" inert aria-hidden>
			<StudioTreeMap workspace={workspace} agents={agents} detail={detail} />
		</Card>
	);
}
