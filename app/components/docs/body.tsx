import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { HStack } from '@astryxdesign/core/HStack';
import { Markdown } from '@astryxdesign/core/Markdown';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { CopyIconButton } from './copy-button';

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

function InlineProse({ text }: { text: string }) {
	return (
		<Markdown display="inline" components={PROSE_COMPONENTS}>
			{text}
		</Markdown>
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
					<CopyIconButton label="Copy prompt" copiedLabel="Copied" text={prompt} />
				</HStack>
				<p className="docs-agent-prompt">{prompt}</p>
			</VStack>
		</Card>
	);
}

/** A `ts`, `bash` or `text` fence. Astryx CodeBlock wants `typescript`, not `ts`. */
function CodeSample({ code, language }: { code: string; language: string | undefined }) {
	const isTs = language === 'ts';
	return (
		<CodeBlock
			language={isTs ? 'typescript' : (language ?? 'text')}
			code={code}
			hasCopyButton
			hasLineNumbers={isTs}
			highlightMode="spans"
			isWrapped={isTs}
			width="100%"
		/>
	);
}

/**
 * One fenced block. `note`, `warning`, `prompt` and `playground` fences are cards; compose refuses
 * any language outside `FENCE_LANGUAGES`, so the rest are code.
 */
function Fence({ code, language }: { code: string; language?: string }) {
	switch (language) {
		case 'note':
			return <Banner status="info" title="Note" description={<InlineProse text={code} />} />;
		case 'warning':
			return <Banner status="warning" title="Warning" description={<InlineProse text={code} />} />;
		case 'prompt':
			return <AgentPasteCard prompt={code} />;
		case 'playground':
			return (
				<Button href={`/playground?seed=${code.trim()}`} label="Try a turn in the playground" />
			);
		default:
			return <CodeSample code={code} language={language} />;
	}
}

const BODY_COMPONENTS = { ...PROSE_COMPONENTS, code: Fence };

/** A chapter's Markdown. Each heading carries the id the outline and the chapter tree link to. */
export function DocsBody({ body }: { body: string }) {
	return <Markdown components={BODY_COMPONENTS}>{body}</Markdown>;
}
