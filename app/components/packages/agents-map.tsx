import { Card } from '@astryxdesign/core/Card';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import {
	addAgent,
	createArchitectWorkspace,
	createExampleDraft,
	type StudioDraft,
	type StudioWorkspace,
} from '@theoremjs/studio';
import { goneAt } from '@theoremjs/studio/ui/lib/tree-map-layout.ts';
import { StudioTreeMap } from '@theoremjs/studio/ui/tree-map.tsx';
import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { PackagesPull } from './packages-pull';
import { foldedProfile } from './profile-code';

const still = () => 0;
const unwatched = () => () => {};

/**
 * The example's three models, renamed for the picture: one on Gemini, two through OpenRouter, each
 * in its provider's protocol and on its provider's key.
 */
const MODELS = [
	{
		modelId: 'Gemini 4',
		provider: 'gemini',
		protocol: 'geminiInteractions',
		apiId: 'gemini-4',
		keySlot: 'gemini',
	},
	{
		modelId: 'Opus 5.5',
		provider: 'openrouter',
		protocol: 'openRouterOpenAi',
		apiId: 'anthropic/claude-opus-5.5',
		keySlot: 'openrouter',
	},
	{
		modelId: 'DeepSeek V4',
		provider: 'openrouter',
		protocol: 'openRouterOpenAi',
		apiId: 'deepseek/deepseek-v4',
		keySlot: 'openrouter',
	},
];

/** The architect on the picture's models. */
function renamed<T extends Pick<StudioDraft, 'modelBindings' | 'models'>>(agent: T): T {
	return {
		...agent,
		modelBindings: agent.modelBindings.map((binding, index) => ({ ...binding, ...MODELS[index] })),
		models: { ...agent.models, defaultModel: MODELS[1]?.modelId ?? '' },
	};
}

/**
 * The code architect and its narrator, the architect on the picture's three models. It allows the
 * travel concierge's unit converter too, so its tools hold one of each type: http, mcp, function
 * and the agent tool narrate, under which the map draws the narrator grown.
 */
function pictureWorkspace(): { workspace: StudioWorkspace; agents: string[] } {
	const base = createArchitectWorkspace();
	const architect = base.agents[0];
	const convert = addAgent(base, createExampleDraft()).toolSpecs.find(
		(tool) => tool.toolName === 'convert_units',
	);
	const workspace: StudioWorkspace = {
		...base,
		agents: base.agents.map((agent) =>
			agent.key === architect?.key
				? renamed({
						...agent,
						tools: {
							...agent.tools,
							allow: [...agent.tools.allow, ...(convert ? [convert.key] : [])],
						},
					})
				: agent,
		),
		toolSpecs: [...base.toolSpecs, ...(convert ? [convert] : [])],
	};
	return { workspace, agents: [architect?.key ?? ''] };
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

/** A name in the code the map draws as a token: where it stands in its line, and how wide it is. */
interface Name {
	id: string;
	line: number;
	column: number;
	/** The literal, quotes and all. */
	literal: string;
	/** The spaces the token takes in the line, when measured. */
	room?: number;
	/** How far in from the room's start the token stands, so the room is even either side. */
	inset?: number;
}

const LITERAL = /'[^']*'/g;

/** Each name in the code that is a token's label, the first time it shows. */
function namesIn(lines: readonly string[], labels: ReadonlyMap<string, string>): Name[] {
	const seen = new Set<string>();
	return lines.flatMap((text, line) =>
		[...text.matchAll(LITERAL)].flatMap((match) => {
			const id = labels.get(match[0].slice(1, -1));
			if (id === undefined || seen.has(id)) return [];
			seen.add(id);
			return [{ id, line, column: match.index, literal: match[0] }];
		}),
	);
}

/** The code with each measured name's literal made room for its token, and where each now starts. */
function withRoom(lines: readonly string[], names: readonly Name[]) {
	const at = new Map<Name, number>();
	const code = lines.map((text, line) => {
		let shift = 0;
		let out = text;
		for (const name of names.filter((each) => each.line === line && each.room !== undefined)) {
			const column = name.column + shift;
			const room = ' '.repeat(name.room ?? 0);
			out = out.slice(0, column) + room + out.slice(column + name.literal.length);
			shift += room.length - name.literal.length;
			at.set(name, column);
		}
		return out;
	});
	return { code: code.join('\n'), at };
}

/** Where `inner` stands in `outer`, by layout alone: what is moved or scaled does not count. */
function offsetIn(inner: HTMLElement, outer: HTMLElement): { x: number; y: number } {
	let [x, y, at] = [0, 0, inner as HTMLElement | null];
	while (at && at !== outer) {
		x += at.offsetLeft;
		y += at.offsetTop;
		at = at.offsetParent as HTMLElement | null;
	}
	return { x, y };
}

/** Where a column of monospaced code starts in its line, in px: across, and the glyphs' middle down. */
function columnAt(line: HTMLElement, column: number): { x: number; y: number } {
	const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
	let left = column;
	for (let text = walker.nextNode(); text; text = walker.nextNode()) {
		const length = text.textContent?.length ?? 0;
		if (left < length) {
			const range = document.createRange();
			range.setStart(text, left);
			range.setEnd(text, left + 1);
			const [glyph, box] = [range.getBoundingClientRect(), line.getBoundingClientRect()];
			return { x: glyph.left - box.left, y: glyph.top + glyph.height / 2 - box.top };
		}
		left -= length;
	}
	return { x: 0, y: line.offsetHeight / 2 };
}

/**
 * The agents tile's card: the code architect's profile, the module the studio writes for it, folded
 * as an editor folds it, with the map's own tokens standing in for the names the map draws. As the
 * run pulls, the code goes and those tokens glide into the map, which grows round them: the
 * profile's rows out of its agent, and what feeds the tree into its columns. Grown, the map fills
 * the card it stands in. Its tokens drag where they are dropped, and the map with them.
 */
export default function AgentsMap({ pull }: { pull?: PackagesPull }) {
	const [{ workspace, agents }] = useState(pictureWorkspace);
	const [lines] = useState(() => foldedProfile(workspace, agents[0] ?? ''));
	const grow = useSyncExternalStore(pull?.subscribe ?? unwatched, pull?.get ?? still, still);
	const card = useRef<HTMLDivElement>(null);
	const codeRef = useRef<HTMLDivElement>(null);
	const [fit, setFit] = useState<{ width: number; height: number }>();
	const [names, setNames] = useState<Name[]>([]);
	const [closed, setClosed] = useState<ReadonlyMap<string, { x: number; y: number }>>();
	const { code, at } = useMemo(() => withRoom(lines, names), [lines, names]);
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
	// The names the map draws, each given the room its token takes in the code, once the face is in.
	useLayoutEffect(() => {
		const measure = () => {
			const root = card.current;
			const sample = codeRef.current?.querySelector<HTMLElement>('[data-line]');
			if (!root || !sample) return;
			const tokens = [...root.querySelectorAll<HTMLElement>('[data-map-token]')];
			const labels = new Map(
				tokens.map((token) => [token.textContent?.trim() ?? '', token.dataset.mapToken ?? '']),
			);
			const context = document.createElement('canvas').getContext('2d');
			if (!context) return;
			context.font = getComputedStyle(sample).font;
			const space = context.measureText(' ').width;
			const widths = new Map(tokens.map((token) => [token.dataset.mapToken, token.offsetWidth]));
			setNames(
				namesIn(lines, labels).map((name) => {
					const width = widths.get(name.id) ?? 0;
					const room = Math.ceil(width / space);
					return { ...name, room, inset: (room * space - width) / 2 };
				}),
			);
		};
		measure();
		void document.fonts.ready.then(measure);
	}, [lines]);
	// Where each token stands closed: where its name now starts in the code, in the map's pixels.
	useLayoutEffect(() => {
		const root = card.current;
		const map = root?.querySelector<HTMLElement>('.studio-tree-map');
		if (!root || !map || names.length === 0) return;
		const origin = offsetIn(map, root);
		const places = new Map<string, { x: number; y: number }>();
		for (const name of names) {
			const line = codeRef.current?.querySelector<HTMLElement>(
				`[data-line="${String(name.line + 1)}"]`,
			);
			const column = at.get(name);
			if (!line || column === undefined) continue;
			const { x, y } = offsetIn(line, root);
			const glyph = columnAt(line, column);
			places.set(name.id, {
				x: x + glyph.x + (name.inset ?? 0) - origin.x,
				y: y + glyph.y - origin.y,
			});
		}
		setClosed(places);
	}, [names, at]);
	// why: The code is gone in half the pull what the map takes away takes, before the tokens are far from it.
	const gone = goneAt(grow * 2);
	return (
		<Card
			ref={card}
			variant="glass"
			padding={0}
			elevation="med"
			className="packages-map"
			// why: Until its tokens have their places in the code, the map would stand over it whole.
			data-placed={closed ? '' : undefined}
			aria-hidden
		>
			<div
				ref={codeRef}
				className="packages-code"
				// why: The code stays where it is and goes as the tokens lift out of it, as what growing takes
				// away goes in the map.
				style={gone > 0 ? { opacity: 1 - gone } : undefined}
			>
				<CodeBlock
					language="typescript"
					code={code}
					container="section"
					hasLanguageLabel={false}
					hasCopyButton={false}
					highlightMode="spans"
					width="100%"
				/>
			</div>
			<StudioTreeMap
				workspace={workspace}
				agents={agents}
				grow={grow}
				fit={fit}
				closed={closed}
				draggable
			/>
		</Card>
	);
}
