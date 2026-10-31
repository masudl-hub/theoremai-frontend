import { Banner } from '@astryxdesign/core/Banner';
import { Card } from '@astryxdesign/core/Card';
import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { HoverCard } from '@astryxdesign/core/HoverCard';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { Link as AstryxLink } from '@astryxdesign/core/Link';
import { Markdown } from '@astryxdesign/core/Markdown';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { symbolTerm } from '../../lib/docs/catalog-rows';
import { chapterIcon } from '../../lib/docs/chapter-icons';
import { CHAPTER_PLUGINS, markdownFences } from '../../lib/docs/chapter-markdown';
import { commandChoices } from '../../lib/docs/commands';
import { parseFigure } from '../../lib/docs/figure';
import {
	type DocArticle,
	type DocTerm,
	isStudioSeed,
	type StudioSeedId,
} from '../../lib/docs/schema';
import { CopyIconButton } from './copy-button';
import { EnhancedCodeView } from './enhanced-code-view';
import { DocsFigure } from './figure';
import { FieldCard } from './glossary';

/** In-app links go through the router; the rest are plain anchors. */
function ProseLink({ href, children }: { href: string; children: ReactNode }) {
	return href.startsWith('/') ? <Link to={href}>{children}</Link> : <a href={href}>{children}</a>;
}

/** What the reader knows about the chapter beyond its Markdown. */
type Chapter = {
	/** The catalog rows the chapter's inline code names. */
	terms: DocArticle['terms'];
	/** The studio seed behind each seeded program, by the program's text. */
	seeds: ReadonlyMap<string, StudioSeedId>;
	codeSlots: DocArticle['codeSlots'];
};

export const ChapterContext = createContext<Chapter>({
	terms: {},
	seeds: new Map(),
	codeSlots: {},
});

/** What the catalog says about a term, and the chapter that lists it. */
function TermCard({ term }: { term: DocTerm }) {
	const { symbol } = term;
	return (
		<VStack gap={2} maxWidth={320}>
			{symbol.kind === 'field' || symbol.kind === 'request-field' ? (
				<FieldCard meta={symbol.meta} />
			) : (
				<Text>{symbolTerm(symbol).text}</Text>
			)}
			<HStack gap={1.5} vAlign="center">
				<Icon icon={chapterIcon(term.slug)} size="sm" color="secondary" />
				<AstryxLink href={term.href}>{term.chapter}</AstryxLink>
			</HStack>
		</VStack>
	);
}

/**
 * A name from the code. One the catalog defines is set as code, and shows its card on hover and on
 * focus. CLI commands carry code styling and a copy button. Other backticked code renders with Code.
 */
function isCliCommand(text: string): boolean {
	return /^(npm|pnpm|yarn|bun|deno|npx)\s+/.test(text.trim());
}

export function InlineCode({ children }: { children: string }) {
	const term = useContext(ChapterContext).terms[children];
	if (term) {
		return (
			<Code className="docs-code-wrap" size="inherit">
				<HoverCard label={children} hasHoverIndication={false} content={<TermCard term={term} />}>
					{children}
				</HoverCard>
			</Code>
		);
	}
	if (isCliCommand(children)) {
		return (
			<span className="docs-inline-command">
				<Code size="inherit">{children}</Code>
				<CopyIconButton label="Copy command" copiedLabel="Copied" text={children.trim()} />
			</span>
		);
	}
	return <Code size="inherit">{children}</Code>;
}

const PROSE_COMPONENTS = { link: ProseLink, inlineCode: InlineCode };

function InlineProse({ text }: { text: string }) {
	return (
		<Markdown display="inline" components={PROSE_COMPONENTS}>
			{text}
		</Markdown>
	);
}

function AgentPasteCard({ prompt }: { prompt: string }) {
	const [expanded, setExpanded] = useState(false);
	return (
		<Card padding={2} className="docs-paste-card">
			<VStack gap={expanded ? 2 : 0}>
				<HStack justify="between" vAlign="center">
					<button
						type="button"
						onClick={() => {
							setExpanded((open) => !open);
						}}
						style={{
							background: 'none',
							border: 'none',
							padding: 0,
							margin: 0,
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							gap: '0.5rem',
							color: 'inherit',
							font: 'inherit',
						}}
						aria-expanded={expanded}
					>
						<Icon
							icon={expanded ? IconChevronDown : IconChevronRight}
							size="sm"
							color="secondary"
						/>
						<Text type="label" color="secondary">
							Paste into your coding agent
						</Text>
					</button>
					<CopyIconButton label="Copy prompt" copiedLabel="Copied" text={prompt} />
				</HStack>
				{expanded && <p className="docs-agent-prompt">{prompt}</p>}
			</VStack>
		</Card>
	);
}

/** A `bash` fence on one row: the command, a switch when the fence gives a choice, and copy. */
function Commands({ code }: { code: string }) {
	const choices = commandChoices(code);
	const [picked, setPicked] = useState(choices[0].label);
	const { command } = choices.find((choice) => choice.label === picked) ?? choices[0];
	return (
		<Card padding={2} width="100%">
			<HStack gap={2} vAlign="center">
				{choices.length > 1 ? (
					<SegmentedControl label="Command for" size="sm" value={picked} onChange={setPicked}>
						{choices.map((choice) => (
							<SegmentedControlItem key={choice.label} value={choice.label} label={choice.label} />
						))}
					</SegmentedControl>
				) : null}
				<StackItem size="fill">
					<CodeBlock
						language="bash"
						code={command}
						container="section"
						hasLanguageLabel={false}
						hasCopyButton={false}
						highlightMode="spans"
						width="100%"
					/>
				</StackItem>
				<CopyIconButton label="Copy command" copiedLabel="Copied" text={command} />
			</HStack>
		</Card>
	);
}

/** A `ts` or `text` fence. Seeded programs feature interactive view-switching and token overlays. */
function CodeSample({ code, language }: { code: string; language: string | undefined }) {
	const { seeds, codeSlots } = useContext(ChapterContext);
	return (
		<EnhancedCodeView
			code={code}
			language={language}
			seed={seeds.get(code)}
			codeSlots={codeSlots[code]}
		/>
	);
}

/**
 * One fenced block. `note`, `warning`, `prompt` and `figure` fences are cards; compose refuses any
 * language outside `FENCE_LANGUAGES`, so the rest are code.
 */
function Fence({ code, language }: { code: string; language?: string }) {
	switch (language) {
		case 'note':
			return <Banner status="info" title="Note" description={<InlineProse text={code} />} />;
		case 'warning':
			return <Banner status="warning" title="Warning" description={<InlineProse text={code} />} />;
		case 'prompt':
			return <AgentPasteCard prompt={code} />;
		case 'bash':
			return <Commands code={code} />;
		case 'figure':
			return <DocsFigure figure={parseFigure(code)} />;
		default:
			return <CodeSample code={code} language={language} />;
	}
}

const BODY_COMPONENTS = { ...PROSE_COMPONENTS, code: Fence };

/** A chapter's Markdown. Each heading carries the id the outline and the chapter tree link to. */
export function DocsBody({
	article,
}: {
	article: Pick<DocArticle, 'body' | 'terms' | 'codeSlots'>;
}) {
	const chapter = useMemo(
		() => ({
			terms: article.terms,
			codeSlots: article.codeSlots,
			seeds: new Map(
				markdownFences(article.body).flatMap((fence) =>
					isStudioSeed(fence.meta.seed) ? [[fence.code, fence.meta.seed] as const] : [],
				),
			),
		}),
		[article],
	);
	return (
		<ChapterContext value={chapter}>
			<Markdown components={BODY_COMPONENTS} plugins={CHAPTER_PLUGINS}>
				{article.body}
			</Markdown>
		</ChapterContext>
	);
}
