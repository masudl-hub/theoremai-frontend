import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Layout, LayoutContent, LayoutPanel } from '@astryxdesign/core/Layout';
import { Outline, type OutlineItem } from '@astryxdesign/core/Outline';
import { ResizeHandle, useResizable } from '@astryxdesign/core/Resizable';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { Section } from '@astryxdesign/core/Section';
import { SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { MediaTheme } from '@astryxdesign/core/theme';
import { VStack } from '@astryxdesign/core/VStack';
import { IconSearch } from '@tabler/icons-react';
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { chapterIcon } from '../../lib/docs/chapter-icons';
import { articleHref, type DocSearchHit, searchDocs } from '../../lib/docs/query';
import type { DocArticle, DocIndex, DocTreeNode } from '../../lib/docs/schema';
import { stillFilter } from '../../lib/docs/still-match';
import { scrollToBlock } from '../../lib/docs/th30-client';
import { DocsBlock } from './blocks';
import '../hero-video.css';

const SEARCH_LIMIT = 64;

function hashBlockId(hash: string): string | undefined {
	const id = decodeURIComponent(hash.replace(/^#/, ''));
	return id || undefined;
}

function nodeHref(node: DocTreeNode): string | undefined {
	if (!node.slug) return undefined;
	return articleHref({ canonicalPath: `/docs/${node.slug}` }, node.blockId);
}

function treeFromHits(nodes: readonly DocTreeNode[], hits: readonly DocSearchHit[]): DocTreeNode[] {
	const slugs = new Set(hits.map((hit) => hit.slug));
	const blockIds = new Set(hits.flatMap((hit) => (hit.blockId === undefined ? [] : [hit.blockId])));
	const out: DocTreeNode[] = [];
	for (const node of nodes) {
		const children = treeFromHits(node.children, hits);
		const chapterHit =
			node.slug !== undefined && slugs.has(node.slug) && node.blockId === undefined;
		const headingHit = node.blockId !== undefined && blockIds.has(node.blockId);
		if (chapterHit || headingHit || children.length) {
			out.push({ ...node, children });
		}
	}
	return out;
}

function DocsNavItem({
	node,
	article,
	hashId,
	expandAll,
	opened,
	onOpenChange,
}: {
	node: DocTreeNode;
	article: DocArticle | undefined;
	hashId: string | undefined;
	expandAll: boolean;
	opened: ReadonlySet<string>;
	onOpenChange: (id: string, collapsed: boolean) => void;
}) {
	const onArticle = article !== undefined && node.slug === article.slug;
	const selected = onArticle && (node.blockId ? node.blockId === hashId : hashId === undefined);
	const open =
		expandAll ||
		onArticle ||
		(article !== undefined && node.id === article.topic) ||
		opened.has(node.id);
	const href = nodeHref(node);
	return (
		<SideNavItem
			label={node.label}
			href={href}
			icon={node.blockId === undefined ? chapterIcon(node.id) : undefined}
			isSelected={selected}
			collapsible={
				node.children.length
					? {
							isCollapsed: !open,
							onCollapsedChange: (collapsed) => {
								onOpenChange(node.id, collapsed);
							},
						}
					: false
			}
		>
			{node.children.length
				? node.children.map((child) => (
						<DocsNavItem
							key={child.id}
							node={child}
							article={article}
							hashId={hashId}
							expandAll={expandAll}
							opened={opened}
							onOpenChange={onOpenChange}
						/>
					))
				: undefined}
		</SideNavItem>
	);
}

function outlineItems(nodes: readonly DocTreeNode[], level = 2): OutlineItem[] {
	return nodes.flatMap((node) => [
		{ id: node.blockId ?? node.id, label: node.label, level },
		...outlineItems(node.children, Math.min(level + 1, 6)),
	]);
}

function outlineNodes(index: DocIndex, article: DocArticle): readonly DocTreeNode[] {
	return index.tree.find((node) => node.id === article.topic)?.children ?? [];
}

const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'June',
	'July',
	'Aug',
	'Sept',
	'Oct',
	'Nov',
	'Dec',
] as const;

function updatedOn(iso: string | undefined): string | undefined {
	const day = iso === undefined ? undefined : /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	if (!day) return undefined;
	const monthIndex = Number(day[2]) - 1;
	if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return undefined;
	return `Last updated: ${MONTHS[monthIndex]} ${String(Number(day[3]))}, ${day[1]}`;
}

function latestModified(index: DocIndex): string | undefined {
	let latest: string | undefined;
	for (const item of index.articles) {
		const iso = item.dateModified;
		if (iso !== undefined && (latest === undefined || iso > latest)) latest = iso;
	}
	return latest;
}

export function DocsFrame({
	index,
	article,
	hashId,
	children,
}: {
	index: DocIndex;
	article?: DocArticle;
	hashId?: string;
	children: ReactNode;
}) {
	const layoutRef = useRef<HTMLDivElement>(null);
	const treePanel = useResizable({
		defaultSize: '20%',
		minSize: 240,
		containerRef: layoutRef,
		autoSaveId: 'docs.tree',
	});
	const [query, setQuery] = useState('');
	const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
	const updated = updatedOn(article?.dateModified ?? latestModified(index));
	const searching = query.trim().length > 0;
	const tree = useMemo(() => {
		if (!searching) return [...index.tree];
		return treeFromHits(index.tree, searchDocs(index, query, SEARCH_LIMIT).results);
	}, [index, query, searching]);
	const onOpenChange = (id: string, collapsed: boolean) => {
		setOpened((prev) => {
			const next = new Set(prev);
			if (collapsed) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	return (
		<Layout
			ref={layoutRef}
			padding={0}
			start={
				<>
					<LayoutPanel
						resizable={treePanel.props}
						padding={0}
						role="navigation"
						label="Docs"
						isScrollable={false}
						hasDivider
					>
						<Section variant="raised" height="100%" padding={4}>
							<VStack gap={4} height="100%">
								<VStack gap={1}>
									<Heading level={3}>Theorem Docs</Heading>
									{updated ? (
										<Text type="supporting" color="secondary">
											{updated}
										</Text>
									) : null}
								</VStack>
								<TextInput
									label="Search docs"
									isLabelHidden
									placeholder="Search"
									value={query}
									onChange={setQuery}
									startIcon={IconSearch}
									hasClear
								/>
								<StackItem size="fill">
									<ScrollableArea label="Chapters" height="100%">
										<SideNavSection title="Chapters" isHeaderHidden>
											{tree.map((node) => (
												<DocsNavItem
													key={node.id}
													node={node}
													article={article}
													hashId={hashId}
													expandAll={searching}
													opened={opened}
													onOpenChange={onOpenChange}
												/>
											))}
										</SideNavSection>
									</ScrollableArea>
								</StackItem>
							</VStack>
						</Section>
					</LayoutPanel>
					<ResizeHandle
						direction="horizontal"
						isAlwaysVisible={false}
						resizable={treePanel.props}
						label="Resize docs"
					/>
				</>
			}
			content={children}
		/>
	);
}

function ArticleStill({ article }: { article: DocArticle }) {
	const cover = article.cover;
	if (!cover) return null;
	const stillPaint = {
		position: 'absolute',
		inset: 0,
		backgroundImage: `url("${cover.src}")`,
		backgroundSize: '100% auto',
		backgroundRepeat: 'no-repeat',
		backgroundPosition: 'center',
		pointerEvents: 'none',
		...stillFilter(cover.src),
	} as CSSProperties;

	return (
		<VStack height="20%">
			<div className="hero-video-frame">
				<div aria-hidden style={stillPaint} />
				<div className="hero-scrim">
					<MediaTheme mode="dark">
						<VStack height="100%" justify="end" gap={2} padding={4}>
							<Heading level={1} hasCapsize>
								{article.title}
							</Heading>
						</VStack>
					</MediaTheme>
				</div>
			</div>
		</VStack>
	);
}

export function DocsReader({ index, article }: { index: DocIndex; article: DocArticle }) {
	const { hash } = useLocation();
	// location.hash is not on the request. First paint must match SSR or the nav hydrates wrong.
	const [hashReady, setHashReady] = useState(false);
	useEffect(() => {
		setHashReady(true);
	}, []);
	const hashId = hashReady ? hashBlockId(hash) : undefined;
	const outline = outlineItems(outlineNodes(index, article));
	const contentRef = useRef<HTMLDivElement>(null);

	const pageKey = `${article.slug}#${hashId ?? ''}`;
	useEffect(() => {
		const fragment = pageKey.split('#')[1];
		if (!fragment) return;
		const frame = window.requestAnimationFrame(() => {
			scrollToBlock(fragment);
		});
		return () => {
			window.cancelAnimationFrame(frame);
		};
	}, [pageKey]);

	return (
		<DocsFrame index={index} article={article} hashId={hashId}>
			<LayoutContent ref={contentRef} padding={0} className="docs-reader">
				<ArticleStill article={article} />
				<HStack align="start">
					<StackItem size="fill">
						<VStack gap={6} padding={8}>
							{article.blocks.map((block) => (
								<DocsBlock key={block.id} block={block} />
							))}
							{article.related.length ? (
								<HStack gap={3}>
									{article.related.flatMap((slug) => {
										const related = index.bySlug[slug];
										if (related === undefined) return [];
										return [
											<Link key={slug} to={related.canonicalPath}>
												{related.title}
											</Link>,
										];
									})}
								</HStack>
							) : null}
						</VStack>
					</StackItem>
					{outline.length ? (
						<LayoutPanel
							className="docs-outline"
							width={240}
							padding={4}
							isScrollable={false}
							role="complementary"
							label="On this page"
						>
							<Outline
								items={outline}
								density="compact"
								scrollContainerRef={contentRef}
								label="On this page"
							/>
						</LayoutPanel>
					) : null}
				</HStack>
			</LayoutContent>
		</DocsFrame>
	);
}
