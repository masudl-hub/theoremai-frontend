import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { List, ListItem } from '@astryxdesign/core/List';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { ResolvedBlock } from '../../lib/docs/schema';
import { CopyIconButton } from './copy-button';

function BlockAnchor({ id, children }: { id: string; children: React.ReactNode }) {
	return (
		<div id={id} data-docs-block={id}>
			{children}
		</div>
	);
}

/** Astryx CodeBlock wants full language ids (`typescript`, not `ts`). */
function codeLanguage(lang: 'ts' | 'bash'): string {
	return lang === 'ts' ? 'typescript' : 'bash';
}

/** Inline `code` and [label](href) — enough for authored prose, not a Markdown engine. */
function inlineMarks(text: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	const pattern = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`)/g;
	let last = 0;
	let match = pattern.exec(text);
	let key = 0;
	while (match) {
		if (match.index > last) nodes.push(text.slice(last, match.index));
		const full = match[0];
		if (full.startsWith('[')) {
			const label = match[2];
			const href = match[3];
			nodes.push(
				href.startsWith('/') ? (
					<Link key={key} to={href}>
						{label}
					</Link>
				) : (
					<a key={key} href={href}>
						{label}
					</a>
				),
			);
		} else {
			nodes.push(
				<Text key={key} className="docs-code-wrap" type="code" as="span">
					{match[4]}
				</Text>,
			);
		}
		key += 1;
		last = match.index + match[0].length;
		match = pattern.exec(text);
	}
	if (last < text.length) nodes.push(text.slice(last));
	return nodes;
}

function ProseParagraphs({ text }: { text: string }) {
	const paragraphs = text.split(/\n\n+/).filter(Boolean);
	return (
		<VStack gap={3}>
			{paragraphs.map((paragraph) => (
				<Text key={paragraph.slice(0, 48)}>{inlineMarks(paragraph)}</Text>
			))}
		</VStack>
	);
}

function CopyPromptButton({ text }: { text: string }) {
	return <CopyIconButton label="Copy prompt" copiedLabel="Copied" text={text} />;
}

export function QuestionsStrip({ questions }: { questions: readonly { question: string }[] }) {
	if (!questions.length) return null;
	return (
		<VStack gap={2} className="docs-questions">
			<List
				listStyle="disc"
				density="compact"
				header={
					<Text type="label" color="secondary">
						This page covers
					</Text>
				}
			>
				{questions.map((item) => (
					<ListItem key={item.question} label={item.question} />
				))}
			</List>
		</VStack>
	);
}

export function DocsBlock({ block }: { block: ResolvedBlock }) {
	switch (block.kind) {
		case 'lede':
			return (
				<BlockAnchor id={block.id}>
					<ProseParagraphs text={block.text} />
				</BlockAnchor>
			);
		case 'prose':
			return (
				<BlockAnchor id={block.id}>
					<VStack gap={2}>
						<Heading level={2}>{block.title}</Heading>
						<ProseParagraphs text={block.text} />
					</VStack>
				</BlockAnchor>
			);
		case 'callout':
			return (
				<BlockAnchor id={block.id}>
					<Banner
						status={block.tone === 'warn' ? 'warning' : 'info'}
						title={block.tone === 'warn' ? 'Warning' : 'Note'}
						description={block.text}
					/>
				</BlockAnchor>
			);
		case 'media':
			return (
				<BlockAnchor id={block.id}>
					<figure className="docs-media">
						{block.media === 'video' ? (
							<video src={block.src} aria-label={block.alt} controls muted playsInline />
						) : (
							<img
								src={block.src}
								alt={block.alt}
								loading="lazy"
								style={{ filter: block.filter }}
							/>
						)}
						{block.caption ? (
							<figcaption>
								<Text type="supporting" color="secondary">
									{block.caption}
								</Text>
							</figcaption>
						) : null}
					</figure>
				</BlockAnchor>
			);
		case 'agent.paste':
			return (
				<BlockAnchor id={block.id}>
					<Card padding={3} style={{ maxWidth: '40rem', minWidth: 0, width: '100%' }}>
						<VStack gap={2} style={{ minWidth: 0, maxWidth: '100%' }}>
							<HStack justify="between" align="center">
								<Text type="label" color="secondary">
									Paste into your coding agent
								</Text>
								<CopyPromptButton text={block.prompt} />
							</HStack>
							<p className="docs-agent-prompt">{block.prompt}</p>
						</VStack>
					</Card>
				</BlockAnchor>
			);
		case 'code':
			return (
				<BlockAnchor id={block.id}>
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
