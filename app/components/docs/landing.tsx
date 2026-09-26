import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Card } from '@astryxdesign/core/Card';
import { Carousel } from '@astryxdesign/core/Carousel';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { MediaTheme } from '@astryxdesign/core/theme';
import { VStack } from '@astryxdesign/core/VStack';
import { IconCircle, IconSearch } from '@tabler/icons-react';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { articleHref, searchDocs } from '../../lib/docs/query';
import type { DocArticle, DocIndex } from '../../lib/docs/schema';
import { stillFilter } from '../../lib/docs/still-match';
import '../hero-video.css';
import { useTh30 } from '../th30-dock';

const LANDING_STILL = '/imagery/th30_goldenmarsh.png';
const SEARCH_LIMIT = 16;
const TILE_MOTION: CSSProperties = {
	transitionProperty: 'opacity, transform',
	transitionDuration: 'var(--duration-medium)',
	transitionTimingFunction: 'var(--ease-standard)',
};

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

function tileMotionStyle(phase: TilePhase): CSSProperties {
	if (phase === 'in') {
		return { ...TILE_MOTION, opacity: 1, transform: 'translateX(0)' };
	}
	if (phase === 'out') {
		return {
			...TILE_MOTION,
			opacity: 0,
			transform: 'translateX(calc(-1 * var(--spacing-2)))',
			pointerEvents: 'none',
		};
	}
	return {
		...TILE_MOTION,
		opacity: 0,
		transform: 'translateX(var(--spacing-2))',
		pointerEvents: 'none',
	};
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
							href: articleHref(article, pick.blockId),
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

export function DocsLanding({ index, version }: { index: DocIndex; version: string }) {
	const th30 = useTh30();
	const [query, setQuery] = useState('');
	const target = useMemo(() => tilesFromIndex(index, query), [index, query]);
	const { tiles, phase } = useEasedTiles(target);
	const searching = query.trim().length > 0;
	const stillPaint = {
		position: 'absolute',
		inset: 0,
		backgroundImage: `url("${LANDING_STILL}")`,
		backgroundSize: '100% auto',
		backgroundRepeat: 'no-repeat',
		backgroundPosition: 'center 78%',
		pointerEvents: 'none',
		...stillFilter(LANDING_STILL),
	} as CSSProperties;
	const motion = tileMotionStyle(phase);

	return (
		<VStack height="100%">
			<StackItem size="fill">
				<div className="hero-video-frame">
					<div aria-hidden style={stillPaint} />
					<div className="hero-scrim">
						<MediaTheme mode="dark">
							<VStack height="100%" justify="end" gap={2} padding={10}>
								<Text type="label">{version}</Text>
								<Heading level={1} type="display-1" hasCapsize>
									Documentation
								</Heading>
							</VStack>
						</MediaTheme>
					</div>
				</div>
			</StackItem>
			<VStack gap={6} padding={8}>
				<HStack justify="center" align="center" gap={4}>
					<TextInput
						label="Search docs"
						isLabelHidden
						placeholder="Search"
						value={query}
						onChange={setQuery}
						startIcon={IconSearch}
						width={720}
						size="lg"
						hasClear
					/>
					<IconButton
						label="Talk to th30"
						icon={<IconCircle />}
						variant="ghost"
						size="lg"
						onClick={() => {
							th30.open();
						}}
					/>
				</HStack>
				<VStack minHeight={332}>
					{tiles.length ? (
						<Carousel gap={4} aria-label={searching ? 'Search results' : 'Suggested chapters'}>
							{tiles.map(({ article, href, title, excerpt, showMeta }) => (
								<ClickableCard
									key={href}
									label={title}
									href={href}
									variant="transparent"
									padding={0}
									width={300}
									style={motion}
								>
									<VStack gap={3}>
										{article.cover ? (
											<Card padding={0}>
												<AspectRatio ratio={16 / 10} fit="cover">
													<img
														src={article.cover.src}
														alt={article.cover.alt}
														style={stillFilter(article.cover.src)}
													/>
												</AspectRatio>
											</Card>
										) : null}
										<VStack gap={1} minHeight={132}>
											<Heading level={3}>{title}</Heading>
											{showMeta ? (
												<HStack gap={2} wrap="wrap">
													<Token label={article.topic} />
													<Token label={`${String(article.ttrMinutes)} min`} />
												</HStack>
											) : null}
											<Text color="secondary" maxLines={3}>
												{excerpt}
											</Text>
										</VStack>
									</VStack>
								</ClickableCard>
							))}
						</Carousel>
					) : (
						<VStack style={motion}>
							<EmptyState
								title="No matching articles"
								description="Try a chapter name, or a word from a summary."
								isCompact
							/>
						</VStack>
					)}
				</VStack>
			</VStack>
		</VStack>
	);
}
