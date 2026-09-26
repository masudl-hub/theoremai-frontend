import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import { Link } from 'react-router';
import { headingLabel } from '../../lib/docs/headings';
import { isDocWorthyUnion, unionOwnsHeading } from '../../lib/docs/placement';
import type { ResolvedBlock } from '../../lib/docs/schema';
import { stillFilter } from '../../lib/docs/still-match';

function unionShowsHeading(block: Extract<ResolvedBlock, { kind: 'union' }>): boolean {
	return !isDocWorthyUnion(block.name) || unionOwnsHeading(block.name, block.id);
}

function BlockAnchor({ id, children }: { id: string; children: React.ReactNode }) {
	return (
		<div id={id} data-docs-block={id}>
			{children}
		</div>
	);
}

function FieldRow({ path, doc, unset }: { path: string; doc: string; unset?: string }) {
	return (
		<VStack id={path} gap={1} paddingBlock={2} className="docs-field">
			<HStack gap={2} align="center">
				<Text type="code">{path}</Text>
				{unset ? <Token label={`${unset} (default)`} /> : null}
			</HStack>
			<Text color="secondary">{doc}</Text>
		</VStack>
	);
}

export function DocsBlock({ block }: { block: ResolvedBlock }) {
	switch (block.kind) {
		case 'lede':
			return (
				<BlockAnchor id={block.id}>
					<VStack gap={2}>
						{block.id !== 'lede' ? <Heading level={2}>{headingLabel(block.id)}</Heading> : null}
						<Text type="large">{block.text}</Text>
					</VStack>
				</BlockAnchor>
			);
		case 'prose':
			return (
				<BlockAnchor id={block.id}>
					<VStack gap={2}>
						<Heading level={2}>{headingLabel(block.id)}</Heading>
						<Text>{block.text}</Text>
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
					<VStack gap={2}>
						{block.media.kind === 'video' ? (
							<video src={block.media.src} poster={undefined} controls muted playsInline />
						) : (
							<img
								src={block.media.src}
								alt={block.media.alt}
								style={stillFilter(block.media.src)}
							/>
						)}
						{block.media.caption ? (
							<Text type="supporting" color="secondary">
								{block.media.caption}
							</Text>
						) : null}
					</VStack>
				</BlockAnchor>
			);
		case 'facts':
			return (
				<BlockAnchor id={block.id}>
					<HStack gap={4} className="docs-facts">
						{block.items.map((item) => (
							<VStack key={item.id} id={item.id} gap={1}>
								<Text type="label" color="secondary">
									{item.label}
								</Text>
								<Text type="code">{item.value}</Text>
							</VStack>
						))}
					</HStack>
				</BlockAnchor>
			);
		case 'fields':
			return (
				<BlockAnchor id={block.id}>
					<VStack gap={2} className="docs-fields">
						{block.rows.map((row) => (
							<FieldRow key={row.path} path={row.path} doc={row.meta.doc} unset={row.meta.unset} />
						))}
					</VStack>
				</BlockAnchor>
			);
		case 'union':
			return (
				<BlockAnchor id={block.id}>
					<VStack gap={3}>
						{unionShowsHeading(block) ? (
							<Heading level={2}>{headingLabel(block.id)}</Heading>
						) : null}
						{block.members.map((member) =>
							member.doc ? (
								<VStack key={member.value} id={`${block.id}:${member.value}`} gap={1}>
									<Text type="code">{member.value}</Text>
									<Text color="secondary">{member.doc}</Text>
								</VStack>
							) : (
								<Link key={member.value} to={`#${member.value}`}>
									<Text type="code">{member.value}</Text>
								</Link>
							),
						)}
					</VStack>
				</BlockAnchor>
			);
		case 'trace':
		case 'lexicon':
			return (
				<BlockAnchor id={block.id}>
					<VStack gap={2}>
						{block.rows.map((row) => (
							<VStack key={row.key} id={`${block.id}:${row.key}`} gap={1}>
								<Text type="code">{row.key}</Text>
								<Text color="secondary">
									{'label' in row ? `${row.label}. ${row.doc}` : row.defaultText}
								</Text>
							</VStack>
						))}
					</VStack>
				</BlockAnchor>
			);
		case 'code':
			return (
				<BlockAnchor id={block.id}>
					<VStack gap={2}>
						{block.source.from === 'readme' ? (
							<Heading level={2}>{headingLabel(block.id)}</Heading>
						) : null}
						<CodeBlock language={block.lang} code={block.code} />
					</VStack>
				</BlockAnchor>
			);
		case 'embed.playground':
			return (
				<BlockAnchor id={block.id}>
					<Button href={`/playground?seed=${block.seed}`} label="Open in playground" />
				</BlockAnchor>
			);
	}
}
