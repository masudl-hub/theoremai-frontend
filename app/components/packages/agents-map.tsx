import { Card } from '@astryxdesign/core/Card';
import {
	addAgent,
	createArchitectWorkspace,
	createExampleDraft,
	decisionExampleDraft,
	defaultToolSpec,
	type StudioDraft,
	type StudioWorkspace,
} from '@theoremjs/studio';
import { StudioTreeMap } from '@theoremjs/studio/ui/tree-map.tsx';
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PackagesPull } from './packages-pull';

const still = () => 0;
/** The decision example's model, named for the picture as the architect's are. */
const JEV = 'Jev 1.14';
/** The tools the architect and the travel concierge both allow, drawn first of their types. */
const SHARED = ['wikipedia_summary', 'search_web', 'convert_units'];
const unwatched = () => () => {};

/** The examples' three models, renamed for the picture: one on Gemini, two through OpenRouter, each in its provider's protocol. */
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

/** An example text agent on the picture's models. */
function renamed<T extends Pick<StudioDraft, 'modelBindings' | 'models'>>(agent: T): T {
	return {
		...agent,
		modelBindings: agent.modelBindings.map((binding, index) => ({ ...binding, ...MODELS[index] })),
		models: { ...agent.models, defaultModel: MODELS[1]?.modelId ?? '' },
	};
}

/**
 * The code architect and the travel concierge, both through OpenRouter, so the map shows a provider
 * and a runner they share. The architect calls the decision agent as an agent tool, make_decision,
 * and allows the concierge's unit converter, so its tools hold one of each type; the narrator and
 * its narrate tool are left out. The first of each type is one both allow. Closed, the map shows
 * the architect, the concierge and the decision agent, each whole, with their models and tools;
 * grown, the architect alone, the decision agent under make_decision.
 */
function pictureWorkspace(): {
	workspace: StudioWorkspace;
	agents: string[];
	still: string[];
} {
	const base = createArchitectWorkspace();
	const narrate = base.toolSpecs.find((tool) => tool.toolType === 'agent');
	const trimmed: StudioWorkspace = {
		...base,
		agents: base.agents
			.filter((agent) => agent.key !== narrate?.agentKey)
			.map((agent) =>
				renamed({
					...agent,
					tools: {
						...agent.tools,
						allow: agent.tools.allow.filter((key) => key !== narrate?.key),
					},
				}),
			),
		toolSpecs: base.toolSpecs
			.filter((tool) => tool !== narrate)
			.sort((a, b) => Number(SHARED.includes(b.toolName)) - Number(SHARED.includes(a.toolName))),
	};
	const architect = trimmed.agents[0];
	const withConcierge = addAgent(trimmed, renamed(createExampleDraft()));
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
	// why: The decision agent stands last, so it rises into place under make_decision past the fewest rows.
	const all = addAgent(withConcierge, throughOpenRouter);
	const decision = all.agents.at(-1);
	const ask = defaultToolSpec({
		toolName: 'make_decision',
		toolType: 'agent',
		agentKey: decision?.key ?? '',
		description: 'Asks the decision agent to make a call.',
		activity: 'Making a decision',
		activityPast: 'Made a decision',
		category: 'demo',
	});
	// A function tool: the architect's own tools are http and mcp, so it allows the concierge's converter.
	const convert = all.toolSpecs.find((tool) => tool.toolName === 'convert_units');
	const workspace: StudioWorkspace = {
		...all,
		agents: all.agents.map((agent) =>
			agent.key === architect?.key
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
	return {
		workspace,
		agents: [architect?.key ?? ''],
		still: workspace.agents.map((agent) => agent.key),
	};
}

/**
 * The part of the card its tile shows: closed, the tile crops the card's right and foot; opened,
 * the card stands inside it.
 */
function shownBox(card: HTMLElement): { width: number; height: number } {
	const tile = card.closest<HTMLElement>('.packages-tile');
	const box = card.getBoundingClientRect();
	const bounds = tile?.getBoundingClientRect() ?? box;
	return {
		width: Math.round(Math.min(box.right, bounds.right) - Math.max(box.left, bounds.left)),
		height: Math.round(Math.min(box.bottom, bounds.bottom) - Math.max(box.top, bounds.top)),
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
 * glass card the tile crops. It grows with the run's pull: each agent moves to its own zone as the
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
		// why: The card grows with the pull; the map fits the part of it the tile shows now.
		const inCard = new ResizeObserver(() => {
			const now = card.current;
			if (now) setRoom(shownBox(now));
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
