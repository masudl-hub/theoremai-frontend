import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { OverflowList } from '@astryxdesign/core/OverflowList';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { VStack } from '@astryxdesign/core/VStack';
import { IconPlayerPlay } from '@tabler/icons-react';
import type { CookbookIncludeTag } from '@theoremjs/studio';
import { IconMcp } from '@theoremjs/studio/ui/mcp-icon.tsx';
import { drags, follow } from '@theoremjs/studio/ui/pan.ts';
import {
	type CSSProperties,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from 'react';
import {
	COOKBOOK_RECIPES,
	type CookbookRecipe,
	cookbookMcpReference,
} from '../../lib/home-content';
import { stillRenditions } from '../../lib/stills';
import { NewTabLink } from '../links';
import './examples.css';

const INCLUDE_LABEL: Readonly<Record<CookbookIncludeTag, string>> = {
	text: 'text',
	decision: 'decision',
	live: 'live',
	speech: 'speech',
	embedding: 'embedding',
	host: 'host',
	'http-tools': 'http tools',
	'mcp-tools': 'mcp tools',
	'agent-tools': 'agent tools',
	'function-tools': 'function tools',
	guardrails: 'guardrails',
	'post-tool': 'post-tool',
};

/**
 * Fixed scatter slots: mixed ratios and sizes among the centred copy.
 * Order matches `COOKBOOK_RECIPES` — place is stable; drag only offsets.
 */
const STILL_PLACES = [
	{ ratio: 5 / 4, place: 0 },
	{ ratio: 2 / 3, place: 1 },
	{ ratio: 1, place: 2 },
	{ ratio: 4 / 5, place: 3 },
	{ ratio: 3 / 2, place: 4 },
] as const;

/** Same threshold as the studio map: a short press is not a drag. */
const DRAG_FROM = 4;

/** Quiet beat between auto-rotations while nothing holds the field. */
const ROTATE_MS = 5200;

type DragOffset = { x: number; y: number };

const ZERO_OFFSET: DragOffset = { x: 0, y: 0 };

function buildLabel(kind: CookbookRecipe['kind']): string {
	return kind === 'system' ? 'multi-agent' : 'agent';
}

function tagLabels(recipe: CookbookRecipe): readonly string[] {
	return [buildLabel(recipe.kind), ...recipe.tags.includes.map((tag) => INCLUDE_LABEL[tag])];
}

/** Blend root around astryx chrome so difference sees the stills. */
function Blend({ children }: { children: ReactNode }) {
	return <span className="cookbook-blend">{children}</span>;
}

function RecipeTags({ recipe }: { recipe: CookbookRecipe }) {
	const labels = tagLabels(recipe);
	return (
		<OverflowList
			gap={1}
			minVisibleItems={2}
			maxVisibleItems={3}
			overflowRenderer={(overflow) => {
				const more = overflow.flatMap(({ index }) => {
					const label = labels[index];
					return label ? [label] : [];
				});
				return (
					<Blend>
						<Tooltip content={more.join(' · ')} placement="above">
							<Token label={`+${String(overflow.length)}`} size="sm" />
						</Tooltip>
					</Blend>
				);
			}}
		>
			{labels.map((label) => (
				<Blend key={label}>
					<Token label={label} size="sm" />
				</Blend>
			))}
		</OverflowList>
	);
}

function RecipeActions({ recipe }: { recipe: CookbookRecipe }) {
	const toast = useToast();
	const openLabel = recipe.action.kind === 'hosted' ? recipe.action.label : 'Open in studio';
	const openHint =
		recipe.action.kind === 'hosted' ? 'Open Bonsai' : 'Open this recipe in the studio';
	return (
		<HStack gap={1} align="center">
			<Blend>
				<Tooltip content={openHint} placement="above">
					<IconButton
						label={openLabel}
						icon={<IconPlayerPlay />}
						variant="ghost"
						size="sm"
						href={recipe.action.href}
						{...(recipe.action.kind === 'hosted' ? { as: NewTabLink } : {})}
					/>
				</Tooltip>
			</Blend>
			{recipe.action.kind === 'studio' ? (
				<Blend>
					<Tooltip content="Copy MCP reference for your coding agent" placement="above">
						<IconButton
							label="Copy MCP reference"
							icon={<IconMcp />}
							variant="ghost"
							size="sm"
							onClick={() => {
								const text = cookbookMcpReference(recipe, window.location.origin);
								void navigator.clipboard.writeText(text).then(
									() => {
										toast({ body: 'MCP reference copied.' });
									},
									() => {
										toast({ body: "Couldn't reach the clipboard.", type: 'error' });
									},
								);
							}}
						/>
					</Tooltip>
				</Blend>
			) : null}
		</HStack>
	);
}

/**
 * Drag via the studio map's `follow` / `drags` from `pan.ts` — the map's
 * `useDrag` itself is tied to node layout and is not reusable here.
 */
function RecipeStill({
	recipe,
	place,
	ratio,
	active,
	offset,
	dragging,
	onOffsetChange,
	onActivate,
	onHover,
	onDragging,
}: {
	recipe: CookbookRecipe;
	place: number;
	ratio: number;
	active: boolean;
	offset: DragOffset;
	dragging: boolean;
	onOffsetChange: (offset: DragOffset) => void;
	onActivate: () => void;
	onHover: (hovered: boolean) => void;
	onDragging: (dragging: boolean) => void;
}) {
	const origin = useRef(offset);
	origin.current = offset;

	const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
		if (!drags(event)) return;
		let moved = false;
		const from = origin.current;
		follow(
			event,
			(x, y) => {
				if (!moved && Math.hypot(x, y) < DRAG_FROM) return;
				if (!moved) {
					moved = true;
					onDragging(true);
					onActivate();
				}
				onOffsetChange({ x: from.x + x, y: from.y + y });
			},
			() => {
				if (moved) onDragging(false);
				else onActivate();
			},
		);
	};

	const style = {
		'--cookbook-drag-x': `${String(offset.x)}px`,
		'--cookbook-drag-y': `${String(offset.y)}px`,
	} as CSSProperties;

	return (
		<button
			type="button"
			className="cookbook-still"
			data-place={place}
			data-active={active ? '' : undefined}
			data-dragging={dragging ? '' : undefined}
			aria-label={recipe.label}
			aria-pressed={active}
			style={style}
			onPointerDown={onPointerDown}
			onPointerEnter={() => {
				onActivate();
				onHover(true);
			}}
			onPointerLeave={() => {
				onHover(false);
			}}
		>
			<AspectRatio ratio={ratio} fit="cover">
				<img
					src={stillRenditions(recipe.image).tile}
					alt=""
					decoding="async"
					draggable={false}
					style={{ objectPosition: recipe.imagePosition }}
				/>
			</AspectRatio>
		</button>
	);
}

/** Advance through recipes on a timer; hover or drag holds the beat. */
function useCookbookRotation(paused: boolean) {
	const [activeId, setActiveId] = useState(COOKBOOK_RECIPES[0]?.id ?? 'research');
	useEffect(() => {
		if (paused || COOKBOOK_RECIPES.length < 2) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const tick = window.setInterval(() => {
			setActiveId((current) => {
				const at = COOKBOOK_RECIPES.findIndex((recipe) => recipe.id === current);
				const next = COOKBOOK_RECIPES.at((at + 1) % COOKBOOK_RECIPES.length);
				return next?.id ?? current;
			});
		}, ROTATE_MS);
		return () => {
			window.clearInterval(tick);
		};
	}, [paused]);
	return [activeId, setActiveId] as const;
}

/**
 * Cookbook screen: centred verb, tags and description; stills at mixed
 * ratios among the copy, dragged with the studio map's pan helpers.
 */
export function ExamplesBoard() {
	const [hovering, setHovering] = useState(false);
	const [draggingId, setDraggingId] = useState<string>();
	const [offsets, setOffsets] = useState<Readonly<Record<string, DragOffset>>>({});
	const [activeId, setActiveId] = useCookbookRotation(hovering || draggingId !== undefined);
	const active =
		COOKBOOK_RECIPES.find((recipe) => recipe.id === activeId) ?? COOKBOOK_RECIPES.at(0);
	if (!active) return null;
	return (
		<div className="cookbook-frame">
			<div className="cookbook-stage" aria-label="Cookbook recipes">
				{[...COOKBOOK_RECIPES]
					.map((recipe, index) => ({
						recipe,
						index,
						slot: STILL_PLACES[index] ?? STILL_PLACES[0],
					}))
					.sort((a, b) => {
						if (a.recipe.id === activeId) return 1;
						if (b.recipe.id === activeId) return -1;
						return a.index - b.index;
					})
					.map(({ recipe, slot }) => (
						<RecipeStill
							key={recipe.id}
							recipe={recipe}
							place={slot.place}
							ratio={slot.ratio}
							active={recipe.id === activeId}
							offset={offsets[recipe.id] ?? ZERO_OFFSET}
							dragging={draggingId === recipe.id}
							onOffsetChange={(next) => {
								setOffsets((prior) => ({ ...prior, [recipe.id]: next }));
							}}
							onActivate={() => {
								setActiveId(recipe.id);
							}}
							onHover={setHovering}
							onDragging={(next) => {
								setDraggingId(next ? recipe.id : undefined);
							}}
						/>
					))}
				<div className="cookbook-mark">
					<VStack gap={1} align="end">
						<Blend>
							<Heading level={1} justify="end">
								cookbook
							</Heading>
						</Blend>
						<Blend>
							<Text justify="end" display="block">
								made with theorem
							</Text>
						</Blend>
						<Blend>
							<Text justify="end" display="block">
								referenceable as you build
							</Text>
						</Blend>
					</VStack>
				</div>
				<div className="cookbook-hero">
					<div className="cookbook-copy">
						<h2 className="cookbook-blend cookbook-verb">{active.verb}</h2>
						<div className="cookbook-controls">
							<RecipeTags recipe={active} />
							<RecipeActions recipe={active} />
						</div>
						<p className="cookbook-blend cookbook-description">{active.description}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
