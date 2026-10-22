import { Card } from '@astryxdesign/core/Card';
import {
	addAgent,
	createArchitectWorkspace,
	createExampleDraft,
	decisionExampleDraft,
	defaultToolSpec,
	type StudioWorkspace,
} from '@theoremjs/studio';
import { StudioTreeMap } from '@theoremjs/studio/ui/tree-map.tsx';
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PackagesPull } from './packages-pull';

const still = () => 0;
const unwatched = () => () => {};

/** The architect's three models, renamed for the picture: one on Gemini, two through OpenRouter, each in its provider's protocol. */
const MODELS = [
	{ modelId: 'Gemini 4', provider: 'gemini', protocol: 'geminiInteractions', apiId: 'gemini-4' },
	{
		modelId: 'Opus 5.5',
		provider: 'openrouter',
		protocol: 'openRouterOpenAi',
		apiId: 'anthropic/claude-opus-5.5',
	},
	{
		modelId: 'DeepSeek V4',
		provider: 'openrouter',
		protocol: 'openRouterOpenAi',
		apiId: 'deepseek/deepseek-v4',
	},
];

/**
 * The code architect and the decision example, both through OpenRouter, so the map shows a provider
 * and a runner they share. The architect calls the travel concierge as an agent tool and allows its
 * unit converter, so its tools hold one of each type. The narrator the architect starts with, and
 * its tool, are left out.
 */
function pictureWorkspace(): { workspace: StudioWorkspace; agents: string[] } {
	const base = createArchitectWorkspace();
	const narrate = base.toolSpecs.find((tool) => tool.toolType === 'agent');
	const architect = base.agents[0];
	const trimmed: StudioWorkspace = {
		...base,
		agents: base.agents
			.filter((agent) => agent.key !== narrate?.agentKey)
			.map((agent) =>
				agent === architect
					? {
							...agent,
							modelBindings: agent.modelBindings.map((binding, index) => ({
								...binding,
								...MODELS[index],
							})),
							models: { ...agent.models, defaultModel: MODELS[1]?.modelId ?? '' },
							tools: {
								...agent.tools,
								allow: agent.tools.allow.filter((key) => key !== narrate?.key),
							},
						}
					: agent,
			),
		// why: The map draws the first allowed tool of each type; the repo's file reader, beside its docs.
		toolSpecs: base.toolSpecs
			.filter((tool) => tool !== narrate)
			.sort(
				(a, b) => Number(b.toolName === 'read_repo_file') - Number(a.toolName === 'read_repo_file'),
			),
	};
	const jev = decisionExampleDraft();
	const throughOpenRouter = {
		...jev,
		modelBindings: jev.modelBindings.map((binding) => ({
			...binding,
			provider: 'openrouter',
			protocol: 'openRouterDecisions',
		})),
	};
	const all = addAgent(addAgent(trimmed, throughOpenRouter), createExampleDraft());
	const [, decision, concierge] = all.agents;
	const ask = defaultToolSpec({
		toolName: 'ask_concierge',
		toolType: 'agent',
		agentKey: concierge.key,
		description: 'Asks the travel concierge where to stay, eat and go.',
		activity: 'Asking the concierge',
		activityPast: 'Asked the concierge',
		category: 'demo',
	});
	const convert = all.toolSpecs.find((tool) => tool.toolName === 'convert_units');
	const workspace: StudioWorkspace = {
		...all,
		agents: all.agents.map((agent) =>
			agent.key === architect.key
				? {
						...agent,
						tools: {
							...agent.tools,
							allow: [...agent.tools.allow, ...(convert ? [convert.key] : []), ask.key],
						},
					}
				: agent,
		),
		toolSpecs: [...all.toolSpecs, ask],
	};
	return { workspace, agents: [architect.key, decision.key] };
}

/**
 * The card's box opened, at a pull of 1: the share of the tile `.packages-map` takes then, of the
 * tile at two thirds of the row.
 * invariant: Two thirds as `--packages-two-thirds` has it in packages.css, net of the one gap.
 */
function openedBox(card: HTMLElement): { width: number; height: number } | undefined {
	const tile = card.closest<HTMLElement>('.packages-tile');
	const row = tile?.closest<HTMLElement>('.packages-row');
	if (!tile || !row) return undefined;
	const rowStyle = getComputedStyle(row);
	const share = (name: string) => Number.parseFloat(rowStyle.getPropertyValue(name)) || 1;
	const content =
		row.clientWidth -
		Number.parseFloat(rowStyle.paddingLeft) -
		Number.parseFloat(rowStyle.paddingRight);
	const gap = Number.parseFloat(rowStyle.columnGap) || 0;
	return {
		width: Math.round((((content - gap) * 2) / 3) * share('--packages-map-open-width')),
		height: Math.round(tile.clientHeight * share('--packages-map-open-height')),
	};
}

/**
 * The agents tile's map: the studio's tree of the code architect and a decision agent, every row
 * open, with the providers, tools and runner they share beside them, drawn as the map draws on a
 * glass card the tile crops. It grows with the run's pull: each agent drifts to its own zone as the
 * protocols, the runner's steps and the tool runner draw in, and grown it fills the card opened. Its
 * tokens drag where they are dropped, and the map with them.
 */
export default function AgentsMap({ pull }: { pull?: PackagesPull }) {
	const [{ workspace, agents }] = useState(pictureWorkspace);
	const grow = useSyncExternalStore(pull?.subscribe ?? unwatched, pull?.get ?? still, still);
	const card = useRef<HTMLDivElement>(null);
	const [fit, setFit] = useState<{ width: number; height: number }>();
	// why: The map fills the card as it stands opened, which only the page's size changes; measured
	// as it pulls, it would refit on every frame.
	useLayoutEffect(() => {
		const row = card.current?.closest('.packages-row');
		const measure = () => {
			const box = card.current ? openedBox(card.current) : undefined;
			setFit((last) => (last?.width === box?.width && last?.height === box?.height ? last : box));
		};
		measure();
		const observer = new ResizeObserver(measure);
		if (row) observer.observe(row);
		return () => {
			observer.disconnect();
		};
	}, []);
	return (
		<Card
			ref={card}
			variant="glass"
			padding={0}
			elevation="med"
			className="packages-map"
			aria-hidden
		>
			<StudioTreeMap workspace={workspace} agents={agents} grow={grow} fit={fit} draggable />
		</Card>
	);
}
