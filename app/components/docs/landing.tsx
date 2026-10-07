import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Card } from '@astryxdesign/core/Card';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { LayoutContent } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import { IconSearch } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { articleHref, searchDocs } from '../../lib/docs/query';
import type { DocArticle, DocIndex } from '../../lib/docs/schema';
import 'virtual:docs/landing.css';
import { Th30Trigger } from '../th30-dock';
import { DocsFrame } from './reader';

const SEARCH_LIMIT = 16;
const SEARCH_HINTS = [
	'Search the docs',
	'Try “runTurn”',
	'Try “guardrails”',
	'Try “structured outputs”',
	'Try “when a tool pauses”',
	'Try “recording traces”',
];
const TYPE_MS = 55;
const ERASE_MS = 25;
const HOLD_MS = 1800;
const GAP_MS = 350;
type LandingTile = {
	article: DocArticle;
	href: string;
	title: string;
	excerpt: string;
	showMeta: boolean;
};

type TilePhase = 'in' | 'out' | 'enter';

function slugKey(tiles: LandingTile[]): string {
	return tiles.map((tile) => tile.href).join('\0');
}

function motionDurationMs(): number {
	if (typeof document === 'undefined') return 410;
	const raw = getComputedStyle(document.documentElement)
		.getPropertyValue('--duration-medium')
		.trim();
	const ms = Number.parseFloat(raw);
	return Number.isFinite(ms) && ms > 0 ? ms : 410;
}

function useEasedTiles(target: LandingTile[]): { tiles: LandingTile[]; phase: TilePhase } {
	const [tiles, setTiles] = useState(target);
	const [phase, setPhase] = useState<TilePhase>('in');
	const committed = useRef(slugKey(target));

	useEffect(() => {
		const nextKey = slugKey(target);
		if (nextKey === committed.current) {
			setTiles(target);
			setPhase('in');
			return;
		}
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			committed.current = nextKey;
			setTiles(target);
			setPhase('in');
			return;
		}
		setPhase('out');
		const out = window.setTimeout(() => {
			committed.current = nextKey;
			setTiles(target);
			setPhase('enter');
		}, motionDurationMs());
		return () => {
			window.clearTimeout(out);
		};
	}, [target]);

	useEffect(() => {
		if (phase !== 'enter') return;
		let inner = 0;
		const outer = window.requestAnimationFrame(() => {
			inner = window.requestAnimationFrame(() => {
				setPhase('in');
			});
		});
		return () => {
			window.cancelAnimationFrame(outer);
			window.cancelAnimationFrame(inner);
		};
	}, [phase]);

	return { tiles, phase };
}

/**
 * Types each search hint out, holds it, erases it and types the next, while the field is empty
 * and unfocused. Paused, it shows the whole hint; with reduced motion, only the first.
 */
function useSearchHint(paused: boolean): string {
	const [hint, setHint] = useState(0);
	const [shown, setShown] = useState(-1);
	// The loop's place, kept across pauses so it resumes on the hint it stopped at.
	const at = useRef(0);
	useEffect(() => {
		if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			setShown(-1);
			return;
		}
		let index = at.current;
		let length = 0;
		let erasing = false;
		let timer = 0;
		const step = () => {
			const text = SEARCH_HINTS[index] ?? '';
			if (!erasing && length < text.length) {
				length += 1;
				timer = window.setTimeout(step, TYPE_MS);
			} else if (!erasing) {
				erasing = true;
				timer = window.setTimeout(step, HOLD_MS);
				return;
			} else if (length > 0) {
				length -= 1;
				timer = window.setTimeout(step, ERASE_MS);
			} else {
				erasing = false;
				index = (index + 1) % SEARCH_HINTS.length;
				at.current = index;
				setHint(index);
				timer = window.setTimeout(step, GAP_MS);
			}
			setShown(length);
		};
		timer = window.setTimeout(step, GAP_MS);
		return () => {
			window.clearTimeout(timer);
		};
	}, [paused]);
	const text = SEARCH_HINTS[hint] ?? 'Search the docs';
	return shown < 0 ? text : text.slice(0, shown);
}

function tilesFromIndex(index: DocIndex, query: string): LandingTile[] {
	const trimmed = query.trim();
	if (!trimmed) {
		return index.suggested.flatMap((pick) => {
			const article = index.bySlug[pick.slug];
			return article === undefined
				? []
				: [
						{
							article,
							href: articleHref(article),
							title: article.title,
							excerpt: article.summary,
							showMeta: false,
						},
					];
		});
	}
	return searchDocs(index, trimmed, SEARCH_LIMIT).results.flatMap((hit) => {
		const article = index.bySlug[hit.slug];
		return article === undefined
			? []
			: [
					{
						article,
						href: hit.href,
						title: hit.title,
						excerpt: hit.excerpt,
						showMeta: true,
					},
				];
	});
}

/** The result cards for one layout: a carousel row, or the narrow-screen column. */
function landingTileCards(tiles: LandingTile[], phase: TilePhase) {
	return tiles.map(({ article, href, title, excerpt, showMeta }) => (
		<ClickableCard
			key={href}
			label={title}
			href={href}
			variant="transparent"
			padding={0}
			width="100%"
			className="docs-landing-tile"
			data-phase={phase}
		>
			<VStack gap={3}>
				<Card padding={0}>
					<AspectRatio className="docs-landing-tile-still" ratio={5 / 2} fit="cover">
						<img src={article.cover.src} alt={article.cover.alt} data-docs-cover={article.slug} />
					</AspectRatio>
				</Card>
				<VStack gap={1}>
					<Heading level={3}>{title}</Heading>
					{showMeta ? (
						<HStack gap={2} wrap="wrap">
							<Token label={article.slug} />
							<Token label={`${String(article.ttrMinutes)} min`} />
						</HStack>
					) : null}
					<Text color="secondary" maxLines={3}>
						{excerpt}
					</Text>
				</VStack>
			</VStack>
		</ClickableCard>
	));
}

function LandingIntroduction({ version }: { version: string }) {
	return (
		<VStack gap={6}>
			<VStack gap={2}>
				<Text type="label" color="secondary">
					@theoremjs/agents {version}
				</Text>
				<Heading level={1} type="display-1" hasCapsize>
					Documentation
				</Heading>
			</VStack>
			<Grid className="docs-landing-packages" columns={2} gap={6}>
				<VStack gap={2}>
					<Heading level={2}>@theoremjs/agents</Heading>
					<Text color="secondary">
						Define an agent once as a typed profile. Run text, image, speech, or live voice with the
						profile’s models, tools, and guardrails.
					</Text>
				</VStack>
				<VStack gap={2}>
					<Heading level={2}>@theoremjs/react</Heading>
					<Text color="secondary">
						Bring that profile into your application. React components and server handlers connect
						the interface, conversation, and tool approvals to the same agent.
					</Text>
				</VStack>
			</Grid>
		</VStack>
	);
}

/** The result cards, or an empty state when nothing matches. */
function LandingResults({
	tiles,
	phase,
	label,
}: {
	tiles: LandingTile[];
	phase: TilePhase;
	label: string;
}) {
	return (
		<VStack className="docs-landing-results">
			{tiles.length ? (
				<Grid
					className="docs-landing-grid"
					columns={3}
					gap={4}
					rowGap={6}
					role="region"
					aria-label={label}
				>
					{landingTileCards(tiles, phase)}
				</Grid>
			) : (
				<VStack className="docs-landing-empty" data-phase={phase}>
					<EmptyState
						title="No matching articles"
						description="Try a chapter name, or a word from a summary."
						isCompact
					/>
				</VStack>
			)}
		</VStack>
	);
}

export function DocsLanding({ index, version }: { index: DocIndex; version: string }) {
	const [query, setQuery] = useState('');
	const target = useMemo(() => tilesFromIndex(index, query), [index, query]);
	const { tiles, phase } = useEasedTiles(target);
	const searching = query.trim().length > 0;
	const [focused, setFocused] = useState(false);
	const hint = useSearchHint(focused || query.length > 0);
	const resultsLabel = searching ? 'Search results' : 'Suggested chapters';

	return (
		<DocsFrame index={index} className="docs-landing-frame">
			<LayoutContent className="docs-landing" padding={8}>
				<VStack className="docs-landing-body" gap={8}>
					<LandingIntroduction version={version} />
					<HStack className="docs-landing-search" justify="start" align="center" gap={4}>
						<div
							className="docs-landing-query"
							onFocus={() => {
								setFocused(true);
							}}
							onBlur={() => {
								setFocused(false);
							}}
						>
							<TextInput
								label="Search docs"
								isLabelHidden
								placeholder={hint}
								value={query}
								onChange={setQuery}
								startIcon={IconSearch}
								width="100%"
								size="lg"
								hasClear
							/>
						</div>
						<Th30Trigger placement="search" />
					</HStack>
					<VStack gap={4}>
						<Heading level={2}>{searching ? 'Search results' : 'Featured reads'}</Heading>
						<LandingResults tiles={tiles} phase={phase} label={resultsLabel} />
					</VStack>
				</VStack>
			</LayoutContent>
		</DocsFrame>
	);
}
