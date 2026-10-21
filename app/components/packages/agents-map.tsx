import { Card } from '@astryxdesign/core/Card';
import {
	addAgent,
	createArchitectWorkspace,
	createExampleDraft,
	decisionExampleDraft,
	type StudioWorkspace,
} from '@theoremjs/studio';
import { StudioTreeMap } from '@theoremjs/studio/ui/tree-map.tsx';
import { useState } from 'react';

/** The architect's three models, renamed for the picture: one on Gemini, two through OpenRouter. */
const MODELS = [
	{ modelId: 'Gemini 4', provider: 'gemini', apiId: 'gemini-4' },
	{ modelId: 'Opus 5.5', provider: 'openrouter', apiId: 'anthropic/claude-opus-5.5' },
	{ modelId: 'DeepSeek V4', provider: 'openrouter', apiId: 'deepseek/deepseek-v4' },
];

/**
 * The code architect and the narrator it calls, with the concierge's first function tool in the
 * registry so it holds one tool of each type, and the decision example after them, so the map shows
 * both runners.
 */
function pictureWorkspace(): { workspace: StudioWorkspace; agents: string[] } {
	const base = createArchitectWorkspace();
	const architect = base.agents[0];
	const fn = createExampleDraft().toolSpecs.find((tool) => tool.toolType === 'function');
	const withTools: StudioWorkspace = {
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
						tools: { ...agent.tools, allow: [...(fn ? [fn.key] : []), ...agent.tools.allow] },
					}
				: agent,
		),
		toolSpecs: fn ? [fn, ...base.toolSpecs] : base.toolSpecs,
	};
	const workspace = addAgent(withTools, decisionExampleDraft());
	return { workspace, agents: workspace.agents.map((agent) => agent.key) };
}

/**
 * The agents tile's map: the studio's tree of the code architect, its narrator, and a decision agent, every row
 * open, with their runners, providers and tool registry beside them, drawn as the map draws on a
 * glass card the tile crops.
 */
export default function AgentsMap() {
	const [{ workspace, agents }] = useState(pictureWorkspace);
	return (
		<Card variant="glass" padding={0} elevation="med" className="packages-map" inert aria-hidden>
			<StudioTreeMap workspace={workspace} agents={agents} />
		</Card>
	);
}
