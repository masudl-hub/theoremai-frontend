import { Heading } from '@astryxdesign/core/Heading';
import { LayoutContent } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { Link } from 'react-router';
import type { DocIndex } from '../../lib/docs/schema';
import { useDocsSearch, warmDocsSearchFor } from '../../lib/docs/use-docs-search';
import { DocsFrame } from './reader';

export function DocsNotFound({ index, slug }: { index: DocIndex; slug: string }) {
	const [query, setQuery] = useState(slug.replace(/-/g, ' '));
	const hits = useDocsSearch(index, query, 6).results;

	return (
		<DocsFrame index={index}>
			<LayoutContent padding={8}>
				<VStack gap={4}>
					<Heading level={1}>No /docs/{slug}</Heading>
					<Text color="secondary">Search the same index Th30 reads.</Text>
					<TextInput
						label="Search docs"
						placeholder="Search, or ask a question"
						value={query}
						onChange={setQuery}
						onFocus={() => {
							warmDocsSearchFor(index);
						}}
						hasClear
					/>
					<VStack gap={2}>
						{hits.map((hit) => (
							<Link key={hit.href} to={hit.href}>
								{hit.title} — {hit.excerpt}
							</Link>
						))}
					</VStack>
				</VStack>
			</LayoutContent>
		</DocsFrame>
	);
}
