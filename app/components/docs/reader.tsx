import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Layout, LayoutContent, LayoutPanel } from '@astryxdesign/core/Layout';
import { Link as AstryxLink } from '@astryxdesign/core/Link';
import { Outline, type OutlineItem } from '@astryxdesign/core/Outline';
import { ResizeHandle, useResizable } from '@astryxdesign/core/Resizable';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { Section } from '@astryxdesign/core/Section';
import { SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { MediaTheme } from '@astryxdesign/core/theme';
import { VStack } from '@astryxdesign/core/VStack';
import { IconBrandGithub, IconMenu2, IconSearch, IconX } from '@tabler/icons-react';
import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useLocation } from 'react-router';
import { chapterIcon } from '../../lib/docs/chapter-icons';
import { chapterGithubHref } from '../../lib/docs/chapter-source';
import { projectArticleText } from '../../lib/docs/project-text';
import { articleHref, chapterNeighbors, type DocSearchHit, searchDocs } from '../../lib/docs/query';
import type { DocArticle, DocIndex, DocTreeNode } from '../../lib/docs/schema';
import { stillFilter } from '../../lib/docs/still-match';
import { NewTabLink } from '../links';
import { holdDocsArticleTransition } from './article-transition';
import { DocsBlock, QuestionsStrip } from './blocks';
import { CopyIconButton } from './copy-button';
import { PageDictionary } from './dictionary';
import '../hero-video.css';

const SEARCH_LIMIT = 64;

function hashBlockId(hash: string): string | undefined {
	const id = decodeURIComponent(hash.replace(/^#/, ''));
	return id || undefined;
}

/** Same landing the outline uses: smooth, at the start of the scrollport. */
function scrollToOutlineTarget(blockId: string): void {
	document.getElementById(blockId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Router scroll restoration runs after this component's layout effect and
 * calls `scrollIntoView()` on the hash target. Drop the id until that effect
 * has run so an article change stays at the top of the new page.
 */
function concealHashTarget(): void {
	const id = hashBlockId(window.location.hash);
	if (!id) return;
	const el = document.getElementById(id);
	if (!el) return;
	const restore = el.id;
	el.removeAttribute('id');
	queueMicrotask(() => {
		if (el.id.length === 0) el.id = restore;
	});
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
	onSection,
}: {
	node: DocTreeNode;
	article: DocArticle | undefined;
	hashId: string | undefined;
	expandAll: boolean;
	opened: ReadonlySet<string>;
	onOpenChange: (id: string, collapsed: boolean) => void;
	onSection: (blockId: string) => void;
}) {
	const onArticle = article !== undefined && node.slug === article.slug;
	const selected = onArticle && (node.blockId ? node.blockId === hashId : hashId === undefined);
	const open =
		expandAll ||
		onArticle ||
		(article !== undefined && node.id === article.topic) ||
		opened.has(node.id);
	const href = nodeHref(node);
	const sectionId = onArticle ? node.blockId : undefined;
	return (
		<SideNavItem
			label={node.label}
			href={href}
			icon={node.blockId === undefined ? chapterIcon(node.id) : undefined}
			isSelected={selected}
			onClick={
				sectionId === undefined
					? undefined
					: (event) => {
							if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
							event.preventDefault();
							onSection(sectionId);
						}
			}
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
							onSection={onSection}
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

function ChapterPane({
	updated,
	query,
	onQueryChange,
	tree,
	article,
	hashId,
	searching,
	opened,
	onOpenChange,
	onSection,
	onClose,
}: {
	updated: string | undefined;
	query: string;
	onQueryChange: (value: string) => void;
	tree: readonly DocTreeNode[];
	article: DocArticle | undefined;
	hashId: string | undefined;
	searching: boolean;
	opened: ReadonlySet<string>;
	onOpenChange: (id: string, collapsed: boolean) => void;
	onSection: (blockId: string) => void;
	onClose?: () => void;
}) {
	return (
		<Section variant="raised" height="100%" padding={4}>
			<VStack gap={4} height="100%">
				<VStack gap={1}>
					<HStack vAlign="center" gap={2}>
						<StackItem size="fill">
							<Heading level={3}>
								<AstryxLink href="/docs" type="inherit" color="inherit" hasUnderline={false}>
									Theorem Docs
								</AstryxLink>
							</Heading>
						</StackItem>
						{onClose ? (
							<IconButton
								label="Close chapters"
								icon={<IconX />}
								variant="ghost"
								onClick={onClose}
							/>
						) : null}
					</HStack>
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
					onChange={onQueryChange}
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
									onSection={onSection}
								/>
							))}
						</SideNavSection>
					</ScrollableArea>
				</StackItem>
			</VStack>
		</Section>
	);
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

function formatDay(iso: string | undefined): string | undefined {
	const day = iso === undefined ? undefined : /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	if (!day) return undefined;
	const monthIndex = Number(day[2]) - 1;
	if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return undefined;
	return `${MONTHS[monthIndex]} ${String(Number(day[3]))}, ${day[1]}`;
}

function docsUpdatedOn(iso: string | undefined): string | undefined {
	const day = formatDay(iso);
	return day === undefined ? undefined : `Docs updated: ${day}`;
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
	onSection,
	children,
}: {
	index: DocIndex;
	article?: DocArticle;
	hashId?: string;
	onSection?: (blockId: string) => void;
	children: ReactNode;
}) {
	const { pathname, hash } = useLocation();
	const layoutRef = useRef<HTMLDivElement>(null);
	const treePanel = useResizable({
		defaultSize: '20%',
		minSize: 240,
		containerRef: layoutRef,
		autoSaveId: 'docs.tree',
	});
	const [query, setQuery] = useState('');
	const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
	const [chaptersOpen, setChaptersOpen] = useState(false);
	useEffect(() => {
		const here = `${pathname}${hash}`;
		if (here.length > 0) setChaptersOpen(false);
	}, [pathname, hash]);
	useEffect(() => {
		if (!chaptersOpen) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setChaptersOpen(false);
		};
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('keydown', onKey);
		};
	}, [chaptersOpen]);
	const closeChapters = () => {
		setChaptersOpen(false);
	};
	const chooseSection = (blockId: string) => {
		setChaptersOpen(false);
		onSection?.(blockId);
	};
	const updated = docsUpdatedOn(latestModified(index));
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
			className="docs-frame"
			padding={0}
			start={
				<>
					<LayoutPanel
						className="docs-tree"
						resizable={treePanel.props}
						padding={0}
						role="navigation"
						label="Docs"
						isScrollable={false}
						hasDivider
					>
						<ChapterPane
							updated={updated}
							query={query}
							onQueryChange={setQuery}
							tree={tree}
							article={article}
							hashId={hashId}
							searching={searching}
							opened={opened}
							onOpenChange={onOpenChange}
							onSection={chooseSection}
						/>
					</LayoutPanel>
					<ResizeHandle
						className="docs-tree-handle"
						direction="horizontal"
						isAlwaysVisible={false}
						resizable={treePanel.props}
						label="Resize docs"
					/>
				</>
			}
			content={
				<>
					<div className="docs-chapters-launch">
						<MediaTheme mode="dark">
							<IconButton
								label="Chapters"
								icon={<IconMenu2 />}
								onClick={() => {
									setChaptersOpen(true);
								}}
							/>
						</MediaTheme>
					</div>
					{children}
					{chaptersOpen ? (
						<div className="docs-chapters-sheet" role="dialog" aria-label="Chapters">
							<ChapterPane
								updated={updated}
								query={query}
								onQueryChange={setQuery}
								tree={tree}
								article={article}
								hashId={hashId}
								searching={searching}
								opened={opened}
								onOpenChange={onOpenChange}
								onSection={chooseSection}
								onClose={closeChapters}
							/>
						</div>
					) : null}
				</>
			}
		/>
	);
}

function CopyMarkdownButton({ article }: { article: DocArticle }) {
	return (
		<CopyIconButton
			label="Copy markdown"
			copiedLabel="Copied markdown"
			text={projectArticleText(article)}
		/>
	);
}

function ArticleStill({ article }: { article: DocArticle }) {
	const cover = article.cover;
	if (!cover) return null;
	const updated = formatDay(article.dateModified);
	const source = chapterGithubHref(article.entry);
	const stillPaint = {
		position: 'absolute',
		inset: 0,
		backgroundImage: `url("${cover.src}")`,
		pointerEvents: 'none',
		...stillFilter(cover.src),
	} as CSSProperties;

	return (
		<VStack className="docs-still">
			<Card padding={0} height="100%">
				<div className="hero-video-frame">
					<div aria-hidden className="docs-still-paint" style={stillPaint} />
					<div className="hero-scrim">
						<VStack height="100%" justify="end" gap={2} padding={4}>
							<MediaTheme mode="dark">
								<Heading level={1} hasCapsize>
									{article.title}
								</Heading>
							</MediaTheme>
							<HStack gap={2} wrap="wrap" vAlign="center">
								{updated ? <Token label={updated} /> : null}
								<Token label={`${String(article.ttrMinutes)} min`} />
								<MediaTheme mode="dark">
									<HStack gap={2} vAlign="center">
										<CopyMarkdownButton article={article} />
										{source ? (
											<IconButton
												label="Source on GitHub"
												tooltip="Source on GitHub"
												variant="ghost"
												size="sm"
												icon={<IconBrandGithub />}
												href={source}
												as={NewTabLink}
											/>
										) : null}
									</HStack>
								</MediaTheme>
							</HStack>
						</VStack>
					</div>
				</div>
			</Card>
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
	const locationKey = `${article.slug}\n${hash}`;
	const [sectionPick, setSectionPick] = useState<{ key: string; id: string } | null>(null);
	const pickedId =
		sectionPick !== null && sectionPick.key === locationKey ? sectionPick.id : undefined;
	const hashId = pickedId ?? (hashReady ? hashBlockId(hash) : undefined);
	const outline = outlineItems(outlineNodes(index, article));
	const { prev, next } = chapterNeighbors(index, article.slug);
	const contentRef = useRef<HTMLDivElement>(null);
	const slugRef = useRef<string | null>(null);
	const suppressScrollSlug = useRef<string | null>(null);

	useLayoutEffect(() => {
		const previous = slugRef.current;
		slugRef.current = article.slug;
		if (previous === null || previous === article.slug) return;
		suppressScrollSlug.current = article.slug;
		const container = contentRef.current;
		if (container) container.scrollTop = 0;
		concealHashTarget();
		holdDocsArticleTransition();
	}, [article.slug]);

	useEffect(() => {
		if (suppressScrollSlug.current === article.slug) {
			suppressScrollSlug.current = null;
			return;
		}
		if (!hashId) return;
		scrollToOutlineTarget(hashId);
	}, [article.slug, hashId]);

	const selectSection = (blockId: string) => {
		const nextHash = `#${blockId}`;
		if (hashBlockId(window.location.hash) !== blockId) {
			window.history.pushState(null, '', nextHash);
		}
		// Already on this section: the hash effect will not run again, so scroll here.
		if (hashId === blockId) {
			scrollToOutlineTarget(blockId);
			return;
		}
		setSectionPick({ key: locationKey, id: blockId });
	};

	return (
		<DocsFrame index={index} article={article} hashId={hashId} onSection={selectSection}>
			<LayoutContent ref={contentRef} padding={0} className="docs-reader">
				<ArticleStill article={article} />
				<HStack className="docs-article" align="start">
					<StackItem size="fill">
						<VStack gap={6} padding={8}>
							<QuestionsStrip questions={article.questions} />
							{article.blocks.map((block) => (
								<DocsBlock key={block.id} block={block} />
							))}
							<PageDictionary symbols={article.symbols} />
							{prev || next ? (
								<HStack justify={prev ? 'between' : 'end'} wrap="wrap" gap={4}>
									{prev ? (
										<VStack gap={1}>
											<Text type="supporting" color="secondary">
												Previous
											</Text>
											<AstryxLink href={prev.canonicalPath}>{prev.title}</AstryxLink>
										</VStack>
									) : null}
									{next ? (
										<VStack gap={1} align="end">
											<Text type="supporting" color="secondary">
												Next
											</Text>
											<AstryxLink href={next.canonicalPath}>{next.title}</AstryxLink>
										</VStack>
									) : null}
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
