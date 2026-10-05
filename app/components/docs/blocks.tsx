import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Markdown } from '@astryxdesign/core/Markdown';
import { proportional, Table } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { ResolvedBlock } from '../../lib/docs/schema';
import { CopyIconButton } from './copy-button';

type BlockOf<K extends ResolvedBlock['kind']> = Extract<ResolvedBlock, { kind: K }>;

function BlockAnchor({ id, children }: { id: string; children: React.ReactNode }) {
	return (
		<div id={id} data-docs-block={id}>
			{children}
		</div>
	);
}

/** Astryx CodeBlock wants full language ids (`typescript`, not `ts`). */
function codeLanguage(lang: 'ts' | 'bash' | 'text'): string {
	if (lang === 'ts') return 'typescript';
	return lang === 'bash' ? 'bash' : 'text';
}

/** In-app links go through the router; the rest are plain anchors. */
function ProseLink({ href, children }: { href: string; children: ReactNode }) {
	return href.startsWith('/') ? <Link to={href}>{children}</Link> : <a href={href}>{children}</a>;
}

function InlineCode({ children }: { children: string }) {
	return (
		<Code className="docs-code-wrap" size="inherit">
			{children}
		</Code>
	);
}

const PROSE_COMPONENTS = { link: ProseLink, inlineCode: InlineCode };

function Prose({ text, inline = false }: { text: string; inline?: boolean }) {
	return (
		<Markdown display={inline ? 'inline' : 'block'} components={PROSE_COMPONENTS}>
			{text}
		</Markdown>
	);
}

/** A Markdown pipe table as a header row and body rows. The `---` row is skipped. */
function parseTable(text: string): { head: string[]; rows: string[][] } {
	const split = (line: string) =>
		line
			.replace(/^\s*\||\|\s*$/g, '')
			.split('|')
			.map((cell) => cell.trim());
	const [head = '', , ...rows] = text.split('\n');
	return { head: split(head), rows: rows.map(split) };
}

function TableBlock({ block }: { block: BlockOf<'table'> }) {
	const { head, rows } = parseTable(block.text);
	const columns = head.map((label, at) => ({
		key: `c${String(at)}`,
		header: label,
		width: proportional(at === 0 ? 1 : 2),
		renderCell: (row: Record<string, string>) => (
			<Prose inline text={row[`c${String(at)}`] ?? ''} />
		),
	}));
	const data = rows.map((cells) =>
		Object.fromEntries(cells.map((cell, at) => [`c${String(at)}`, cell])),
	);
	return (
		<VStack gap={2}>
			<Heading level={2}>{block.title}</Heading>
			<Table data={data} columns={columns} density="compact" verticalAlign="top" />
		</VStack>
	);
}

function CopyPromptButton({ text }: { text: string }) {
	return <CopyIconButton label="Copy prompt" copiedLabel="Copied" text={text} />;
}

function MediaFigure({ block }: { block: BlockOf<'media'> }) {
	return (
		<figure className="docs-media">
			{block.media === 'video' ? (
				<video src={block.src} aria-label={block.alt} controls muted playsInline />
			) : (
				<img src={block.src} alt={block.alt} loading="lazy" style={{ filter: block.filter }} />
			)}
			{block.caption ? (
				<figcaption>
					<Text type="supporting" color="secondary">
						{block.caption}
					</Text>
				</figcaption>
			) : null}
		</figure>
	);
}

function AgentPasteCard({ prompt }: { prompt: string }) {
	return (
		<Card padding={3} style={{ maxWidth: '40rem', minWidth: 0, width: '100%' }}>
			<VStack gap={2} style={{ minWidth: 0, maxWidth: '100%' }}>
				<HStack justify="between" align="center">
					<Text type="label" color="secondary">
						Paste into your coding agent
					</Text>
					<CopyPromptButton text={prompt} />
				</HStack>
				<p className="docs-agent-prompt">{prompt}</p>
			</VStack>
		</Card>
	);
}

function CodeSection({ block }: { block: BlockOf<'code'> }) {
	return (
		<VStack gap={2}>
			{block.title ? <Heading level={2}>{block.title}</Heading> : null}
			{block.id === 'install-npm' ? (
				<Text type="supporting" color="secondary">
					or
				</Text>
			) : null}
			<CodeBlock
				language={codeLanguage(block.lang)}
				code={block.code}
				hasCopyButton
				hasLineNumbers={block.lang === 'ts'}
				highlightMode="spans"
				isWrapped={block.lang === 'ts'}
				width="100%"
			/>
		</VStack>
	);
}

export function DocsBlock({ block }: { block: ResolvedBlock }) {
	switch (block.kind) {
		case 'lede':
			return (
				<BlockAnchor id={block.id}>
					<Prose text={block.text} />
				</BlockAnchor>
			);
		case 'prose':
			return (
				<BlockAnchor id={block.id}>
					<VStack gap={2}>
						<Heading level={2}>{block.title}</Heading>
						<Prose text={block.text} />
					</VStack>
				</BlockAnchor>
			);
		case 'table':
			return (
				<BlockAnchor id={block.id}>
					<TableBlock block={block} />
				</BlockAnchor>
			);
		case 'callout':
			return (
				<BlockAnchor id={block.id}>
					<Banner
						status={block.tone === 'warn' ? 'warning' : 'info'}
						title={block.tone === 'warn' ? 'Warning' : 'Note'}
						description={<Prose inline text={block.text} />}
					/>
				</BlockAnchor>
			);
		case 'media':
			return (
				<BlockAnchor id={block.id}>
					<MediaFigure block={block} />
				</BlockAnchor>
			);
		case 'agent.paste':
			return (
				<BlockAnchor id={block.id}>
					<AgentPasteCard prompt={block.prompt} />
				</BlockAnchor>
			);
		case 'code':
			return (
				<BlockAnchor id={block.id}>
					<CodeSection block={block} />
				</BlockAnchor>
			);
		case 'embed.playground':
			return (
				<BlockAnchor id={block.id}>
					<Button href={`/playground?seed=${block.seed}`} label="Try a turn in the playground" />
				</BlockAnchor>
			);
	}
}
