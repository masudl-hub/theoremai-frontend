import { Card } from '@astryxdesign/core/Card';
import {
	addAgent,
	createArchitectWorkspace,
	decisionExampleDraft,
	defaultToolSpec,
	demoToolSpecs,
	type StudioWorkspace,
} from '@theoremjs/studio';
import type { TreeMapStill } from '@theoremjs/studio/ui/lib/tree-map-layout.ts';
import { StudioTreeMap } from '@theoremjs/studio/ui/tree-map.tsx';
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PackagesPull } from './packages-pull';

const still = () => 0;
/** The decision example's model, named for the picture as the architect's are. */
const JEV = 'Jev 1.14';
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
 * The code architect, through OpenRouter, so the map shows a provider and a runner it shares. The
 * architect calls the decision agent as an agent tool, make_decision, and allows its unit
 * converter, so its tools hold one of each type. Its narrate tool is left out. Closed, the map
 * shows the architect, the narrator and the decision agent, each with its models and tools; grown,
 * the architect alone.
 */
function pictureWorkspace(): {
	workspace: StudioWorkspace;
	agents: string[];
	still: TreeMapStill;
} {
	const base = createArchitectWorkspace();
	const narrate = base.toolSpecs.find((tool) => tool.toolType === 'agent');
	const architect = base.agents[0];
	const trimmed: StudioWorkspace = {
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
			modelId: JEV,
			provider: 'openrouter',
			protocol: 'openRouterDecisions',
			apiId: 'typesafe/jev-1.14',
			options: {},
		})),
		models: { ...jev.models, defaultModel: JEV },
	};
	// why: The decision agent stands last, so as it sinks into place under make_decision it passes no agent.
	const all = addAgent(trimmed, throughOpenRouter);
	const decision = all.agents.at(-1) ?? architect;
	const ask = defaultToolSpec({
		toolName: 'make_decision',
		toolType: 'agent',
		agentKey: decision.key,
		description: 'Asks the decision agent to make a call.',
		activity: 'Making a decision',
		activityPast: 'Made a decision',
		category: 'demo',
	});
	// A function tool: the architect's own tools are http and mcp, so the converter is added here.
	const convertSeed = demoToolSpecs().find((seed) => seed.data.toolName === 'convert_units');
	const convert = convertSeed ? defaultToolSpec(convertSeed.data) : undefined;
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
		toolSpecs: [...all.toolSpecs, ...(convert ? [convert] : []), ask],
	};
	return {
		workspace,
		agents: [architect.key],
		still: { agents: workspace.agents.map((agent) => agent.key), facets: ['models', 'tools'] },
	};
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
 * protocols, the runner's steps and the tool runner draw in, and grown it fills the card it stands in. Its
 * tokens drag where they are dropped, and the map with them.
 */
export default function AgentsMap({ pull }: { pull?: PackagesPull }) {
	const [{ workspace, agents, still: closed }] = useState(pictureWorkspace);
	const grow = useSyncExternalStore(pull?.subscribe ?? unwatched, pull?.get ?? still, still);
	const card = useRef<HTMLDivElement>(null);
	const [fit, setFit] = useState<{ width: number; height: number }>();
	const [room, setRoom] = useState<{ width: number; height: number }>();
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
		// why: The card grows with the pull; the map, grown, fits the card it stands in now.
		const inCard = new ResizeObserver(() => {
			const now = card.current;
			if (now) setRoom({ width: now.clientWidth, height: now.clientHeight });
		});
		if (card.current) inCard.observe(card.current);
		return () => {
			observer.disconnect();
			inCard.disconnect();
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
			<StudioTreeMap
				workspace={workspace}
				agents={agents}
				still={closed}
				grow={grow}
				fit={fit}
				room={room}
				draggable
			/>
		</Card>
	);
}
