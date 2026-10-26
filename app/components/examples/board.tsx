import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
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
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
	COOKBOOK_RECIPES,
	type CookbookRecipe,
	cookbookMcpReference,
} from '../../lib/home-content';
import { stillRenditions } from '../../lib/stills';
import { NewTabLink } from '../links';
import { Statement } from '../statement';
import './examples.css';

/**
 * FLIP the stills when the active recipe changes so they ease into new slots
 * instead of snapping. Position only — no fades. Timing matches the shell
 * (`420ms` / `--th30-ease`).
 */
function useFanFlip(activeId: string) {
	const fanRef = useRef<HTMLDivElement>(null);
	const prior = useRef<Map<string, DOMRect>>(new Map());
	useLayoutEffect(() => {
		// Re-run when the active recipe changes; the DOM order is already committed.
		void activeId;
		const fan = fanRef.current;
		if (!fan) return;
		const nodes = [...fan.querySelectorAll<HTMLElement>('[data-recipe-id]')];
		const next = new Map<string, DOMRect>();
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		for (const node of nodes) {
			const id = node.dataset.recipeId;
			if (!id) continue;
			const last = node.getBoundingClientRect();
			next.set(id, last);
			const first = prior.current.get(id);
			if (reduced || !first || prior.current.size === 0) continue;
			const dx = first.left - last.left;
			const dy = first.top - last.top;
			if (dx === 0 && dy === 0) continue;
			node.style.transition = 'none';
			node.style.transform = `translate(${String(dx)}px, ${String(dy)}px)`;
		}
		prior.current = next;
		if (reduced) return;
		// Double rAF so the invert paint lands before the eased play.
		let play2 = 0;
		const play1 = window.requestAnimationFrame(() => {
			play2 = window.requestAnimationFrame(() => {
				for (const node of nodes) {
					if (!node.style.transform) continue;
					node.style.transition = '';
					node.style.transform = '';
				}
			});
		});
		return () => {
			window.cancelAnimationFrame(play1);
			window.cancelAnimationFrame(play2);
		};
	}, [activeId]);
	return fanRef;
}

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

/** Portrait stills; width (and thus height) comes from the fan rank. */
const STILL_RATIO = 2 / 3;

function buildLabel(kind: CookbookRecipe['kind']): string {
	return kind === 'system' ? 'multi-agent' : 'agent';
}

function tagLabels(recipe: CookbookRecipe): readonly string[] {
	return [buildLabel(recipe.kind), ...recipe.tags.includes.map((tag) => INCLUDE_LABEL[tag])];
}

/**
 * Rotate so the active recipe sits in the centre slot — Drops peak in the middle,
 * sides step down by distance from centre.
 */
function fanSlots(
	recipes: readonly CookbookRecipe[],
	activeId: string,
): readonly { recipe: CookbookRecipe; rank: number }[] {
	const n = recipes.length;
	if (n === 0) return [];
	const activeAt = Math.max(
		0,
		recipes.findIndex((recipe) => recipe.id === activeId),
	);
	const centre = Math.floor(n / 2);
	const shift = (((activeAt - centre) % n) + n) % n;
	const out: { recipe: CookbookRecipe; rank: number }[] = [];
	for (let slot = 0; slot < n; slot += 1) {
		const recipe = recipes[(slot + shift) % n];
		if (!recipe) continue;
		out.push({ recipe, rank: Math.abs(slot - centre) });
	}
	return out;
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
					<Tooltip content={more.join(' · ')} placement="above">
						<Token label={`+${String(overflow.length)}`} size="sm" />
					</Tooltip>
				);
			}}
		>
			{labels.map((label) => (
				<Token key={label} label={label} size="sm" />
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
			{recipe.action.kind === 'studio' ? (
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
			) : null}
		</HStack>
	);
}

function RecipeStill({
	recipe,
	rank,
	onSelect,
}: {
	recipe: CookbookRecipe;
	rank: number;
	onSelect: () => void;
}) {
	return (
		<div className="cookbook-still" data-rank={rank} data-recipe-id={recipe.id} role="listitem">
			<ClickableCard
				label={recipe.label}
				onClick={onSelect}
				padding={0}
				elevation="none"
				width="100%"
			>
				<AspectRatio ratio={STILL_RATIO} fit="cover">
					<img src={stillRenditions(recipe.image).tile} alt={recipe.imageAlt} decoding="async" />
				</AspectRatio>
			</ClickableCard>
		</div>
	);
}

/**
 * Cookbook screen: centred verb and tags on the shell, Drops-style still fan
 * clipped at the left, right and bottom — active recipe peaks in the centre.
 */
export function ExamplesBoard() {
	const [activeId, setActiveId] = useState(COOKBOOK_RECIPES[0]?.id ?? 'research');
	const active = COOKBOOK_RECIPES.find((recipe) => recipe.id === activeId) ?? COOKBOOK_RECIPES[0];
	const slots = useMemo(() => fanSlots(COOKBOOK_RECIPES, activeId), [activeId]);
	const fanRef = useFanFlip(activeId);
	if (!active) return null;
	return (
		<div className="cookbook-frame">
			<div className="cookbook-mark">
				<VStack gap={1} align="end">
					<Heading level={1} justify="end">
						cookbook
					</Heading>
					<Text color="secondary" justify="end" display="block">
						made with theorem
					</Text>
					<Text color="secondary" justify="end" display="block">
						referenceable as you build
					</Text>
				</VStack>
			</div>
			<div className="cookbook-hero">
				<VStack gap={4} align="center" width="100%">
					<Heading
						level={2}
						type="display-1"
						color="secondary"
						justify="center"
						className="cookbook-verb"
					>
						{active.verb}
					</Heading>
					<HStack gap={3} align="center" justify="center" wrap="wrap">
						<RecipeTags recipe={active} />
						<RecipeActions recipe={active} />
					</HStack>
					<Statement className="cookbook-description">{active.description}</Statement>
				</VStack>
			</div>
			<div ref={fanRef} className="cookbook-fan" role="list" aria-label="Cookbook recipes">
				{slots.map(({ recipe, rank }) => (
					<RecipeStill
						key={recipe.id}
						recipe={recipe}
						rank={rank}
						onSelect={() => {
							setActiveId(recipe.id);
						}}
					/>
				))}
			</div>
		</div>
	);
}
