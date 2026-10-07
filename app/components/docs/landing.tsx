import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useClipboard } from '@astryxdesign/core/hooks';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import {
	IconBrandGithub,
	IconCheck,
	IconCopy,
	IconPlayerPlay,
	IconSearch,
} from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { articleHref, searchDocs } from '../../lib/docs/query';
import type { DocArticle, DocIndex } from '../../lib/docs/schema';
import 'virtual:docs/landing.css';
import { starterPrompt } from '../../lib/docs/starter-prompt';
import { IconDeepWiki } from '../deepwiki-icon';
import { NewTabLink } from '../links';
import { PageSummary } from '../page-summary';
import { StillText, StillTitle } from '../still-caption';
import { Th30Trigger } from '../th30-dock';

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
/** The reads the landing opens with, each named for what the visitor came to do. */
const FEATURED = [
	{ slug: 'start', title: 'Get started' },
	{ slug: 'modalities', title: 'Define your agent' },
	{ slug: 'tools', title: 'Add tools' },
	{ slug: 'guardrails', title: 'Set guardrails' },
] as const;

const REPO = 'https://github.com/masudl-hub/theoremai';

const RESOURCES = [
	{ label: 'Open an issue', href: `${REPO}/issues/new`, icon: IconBrandGithub },
	{ label: 'Contribute', href: `${REPO}/blob/main/CONTRIBUTING.md`, icon: IconBrandGithub },
	{
		label: 'Query on DeepWiki',
		href: 'https://deepwiki.com/masudl-hub/theoremai',
		icon: IconDeepWiki,
	},
] as const;

const LICENSE_HREF = `${REPO}/blob/main/LICENSE`;

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
		return FEATURED.flatMap(({ slug, title }) => {
			const article = index.bySlug[slug];
			return article === undefined
				? []
				: [
						{
							article,
							href: articleHref(article),
							title,
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
					<AspectRatio className="docs-landing-tile-still" ratio={4 / 3} fit="cover">
						<img src={article.cover.src} alt={article.cover.alt} data-docs-cover={article.slug} />
					</AspectRatio>
				</Card>
				<VStack gap={1}>
					<StillTitle maxLines={1}>{title}</StillTitle>
					{showMeta ? (
						<HStack gap={2} wrap="wrap">
							<Token label={article.slug} />
							<Token label={`${String(article.ttrMinutes)} min`} />
						</HStack>
					) : null}
					<StillText maxLines={3}>{excerpt}</StillText>
				</VStack>
			</VStack>
		</ClickableCard>
	));
}

function LandingGreeting() {
	return (
		<VStack gap={1}>
			<Text type="label" color="secondary">
				theorem documentation
			</Text>
			<Heading level={1} type="display-3">
				What are you building today?
			</Heading>
		</VStack>
	);
}

/** Copies a prompt for the reader's coding agent: it reads these docs, asks, plans, then builds. */
function StarterPromptButton() {
	const { copy, isCopied } = useClipboard({ announce: 'Prompt copied' });
	return (
		<Button
			variant="primary"
			size="md"
			label={isCopied ? 'Copied. Paste it into your agent' : 'Copy a starter prompt'}
			icon={isCopied ? <IconCheck aria-hidden /> : <IconCopy aria-hidden />}
			onClick={() => {
				void copy(starterPrompt(window.location.origin));
			}}
		/>
	);
}

function LandingResources() {
	return (
		<HStack className="docs-landing-resources" gap={2} wrap="wrap" aria-label="Resources">
			<StarterPromptButton />
			{RESOURCES.map(({ label, href, icon: Icon }) => (
				<Button
					key={label}
					as={NewTabLink}
					variant="secondary"
					size="md"
					href={href}
					label={label}
					icon={<Icon aria-hidden />}
				/>
			))}
			<Button
				variant="secondary"
				size="md"
				href="/playground"
				label="Try the playground"
				icon={<IconPlayerPlay aria-hidden />}
			/>
		</HStack>
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
					columns={{ minWidth: 160, max: 4 }}
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

function landingSummary(index: DocIndex): string {
	const reads = FEATURED.map(({ slug, title }) => {
		const summary = index.bySlug[slug]?.summary;
		return summary ? `${title} (${summary})` : title;
	}).join(' ');
	const links = [...RESOURCES.map(({ label }) => label), 'Try the playground'].join(', ');
	return `“What are you building today?” A search box over the docs, a button that copies a starter prompt for the visitor's coding agent, and links: ${links}. Featured reads: ${reads} th30 can search the docs and open any chapter.`;
}

export function DocsLanding({ index }: { index: DocIndex }) {
	const [query, setQuery] = useState('');
	const target = useMemo(() => tilesFromIndex(index, query), [index, query]);
	const { tiles, phase } = useEasedTiles(target);
	const searching = query.trim().length > 0;
	const [focused, setFocused] = useState(false);
	const hint = useSearchHint(focused || query.length > 0);
	const resultsLabel = searching ? 'Search results' : 'Featured reads';

	return (
		<div className="docs-landing-page">
			<PageSummary text={landingSummary(index)} />
			<ScrollableArea className="docs-landing-scroll" axis="block" role="region" label="Docs">
				<div className="docs-landing">
					<VStack className="docs-landing-body" gap={8}>
						<VStack gap={4}>
							<LandingGreeting />
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
								<Th30Trigger placement="search" question={query} />
							</HStack>
						</VStack>
						<LandingResources />
						<LandingResults tiles={tiles} phase={phase} label={resultsLabel} />
					</VStack>
				</div>
			</ScrollableArea>
			<footer className="docs-landing-footer">
				<Text type="supporting" color="secondary">
					<a href={LICENSE_HREF} target="_blank" rel="noopener noreferrer">
						MIT license
					</a>
				</Text>
			</footer>
		</div>
	);
}
