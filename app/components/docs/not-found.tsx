import { Heading } from '@astryxdesign/core/Heading';
import { LayoutContent } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { searchDocs } from '../../lib/docs/query';
import type { DocIndex } from '../../lib/docs/schema';
import { DocsFrame } from './reader';

export function DocsNotFound({ index, slug }: { index: DocIndex; slug: string }) {
	const [query, setQuery] = useState(slug.replace(/-/g, ' '));
	const hits = useMemo(() => searchDocs(index, query, 6).results, [index, query]);

	return (
		<DocsFrame index={index}>
			<LayoutContent padding={8}>
				<VStack gap={4}>
					<Heading level={1}>No /docs/{slug}</Heading>
					<Text color="secondary">Search the same index Th30 reads.</Text>
					<TextInput label="Search docs" value={query} onChange={setQuery} hasClear />
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
