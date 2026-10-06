/**
 * Filterable catalog dictionary for a docs topic.
 * Long groups collapse.
 */

import { Heading } from '@astryxdesign/core/Heading';
import { HoverCard } from '@astryxdesign/core/HoverCard';
import { HStack } from '@astryxdesign/core/HStack';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import { IconSearch } from '@tabler/icons-react';
import type { FieldMeta } from '@theoremjs/agents/schema';
import { type ReactNode, useMemo, useState } from 'react';
import type { PageSymbol } from '../../lib/docs/schema';

function fieldHaystack(path: string, meta: FieldMeta): string {
	const unset = meta.unset ? ` ${meta.unset}` : '';
	const options = meta.options?.join(' ') ?? '';
	return `${path} ${meta.doc}${unset} ${options}`.toLowerCase();
}

function symbolHaystack(symbol: PageSymbol): string {
	switch (symbol.kind) {
		case 'field':
		case 'request-field':
			return fieldHaystack(symbol.path, symbol.meta);
		case 'export':
			return `${symbol.name} ${symbol.doc}`.toLowerCase();
		case 'union-member':
			return `${symbol.value} ${symbol.union} ${symbol.doc}`.toLowerCase();
		case 'trace':
			return `${symbol.key} ${symbol.label} ${symbol.doc}`.toLowerCase();
		case 'lexicon':
			return `${symbol.key} ${symbol.text}`.toLowerCase();
	}
}

/** A field's catalog card: what it does, what it takes, and when it applies. */
export function FieldCard({ meta }: { meta: FieldMeta }) {
	const options = meta.options ?? [meta.type];
	return (
		<VStack gap={2} maxWidth={320}>
			<Text>{meta.doc}</Text>
			<HStack gap={1} wrap="wrap">
				{options.map((option) => (
					<Token key={option} label={option} size="sm" />
				))}
			</HStack>
			{meta.optionNote ? <Text color="secondary">{meta.optionNote}</Text> : null}
			{typeof meta.required === 'string' ? (
				<Text color="secondary">{`Required ${meta.required}.`}</Text>
			) : null}
			{meta.unset ? <Text color="secondary">{`Left out: ${meta.unset}.`}</Text> : null}
			{meta.profileTypes?.length ? (
				<Text color="secondary">{`Only on ${meta.profileTypes.join(', ')} profiles.`}</Text>
			) : null}
		</VStack>
	);
}

function labelText(label: string): string {
	return label.replaceAll('.', '.\n');
}

/** One row: the symbol's name, and what the catalog says about it. */
function SymbolItem({ symbol }: { symbol: PageSymbol }) {
	const row = (label: string, children: ReactNode) => (
		<MetadataListItem id={symbol.id} data-docs-block={symbol.id} label={labelText(label)}>
			{children}
		</MetadataListItem>
	);
	switch (symbol.kind) {
		case 'field':
		case 'request-field':
			return row(
				symbol.path,
				<HoverCard label={symbol.path} content={<FieldCard meta={symbol.meta} />}>
					<span>{symbol.meta.doc}</span>
				</HoverCard>,
			);
		case 'export':
			return row(symbol.name, symbol.doc);
		case 'union-member':
			return row(symbol.value, symbol.doc);
		case 'trace':
			return row(symbol.key, `${symbol.label}. ${symbol.doc}`);
		case 'lexicon':
			return row(symbol.key, symbol.text);
	}
}

/** The kinds of symbol in the order the dictionary lists them, each with its group's label. */
const SYMBOL_GROUPS: readonly { kind: PageSymbol['kind']; label: string }[] = [
	{ kind: 'export', label: 'Functions and classes' },
	{ kind: 'request-field', label: 'Request fields' },
	{ kind: 'field', label: 'Fields' },
	{ kind: 'union-member', label: 'Union members' },
	{ kind: 'trace', label: 'Trace records' },
	{ kind: 'lexicon', label: 'Status lines' },
];

/** The symbols matching the filter, grouped by kind in catalog order. Empty groups drop out. */
function useSymbolGroups(symbols: readonly PageSymbol[], query: string) {
	return useMemo(() => {
		const needle = query.trim().toLowerCase();
		const filtered = needle
			? symbols.filter((symbol) => symbolHaystack(symbol).includes(needle))
			: symbols;
		return SYMBOL_GROUPS.map((group) => ({
			label: group.label,
			symbols: filtered.filter((symbol) => symbol.kind === group.kind),
		})).filter((group) => group.symbols.length > 0);
	}, [query, symbols]);
}

export function PageDictionary({ symbols }: { symbols: readonly PageSymbol[] }) {
	const [query, setQuery] = useState('');
	const groups = useSymbolGroups(symbols, query);

	if (!symbols.length) return null;

	return (
		<VStack gap={4} id="dictionary" data-docs-block="dictionary" className="docs-dictionary">
			<VStack gap={2}>
				<Heading level={2}>Symbols</Heading>
				<Text color="secondary">
					The functions, fields, members and records that this chapter owns. Hover a field for its
					full card.
				</Text>
				<TextInput
					label="Filter symbols"
					isLabelHidden
					placeholder="Filter symbols"
					value={query}
					onChange={setQuery}
					startIcon={IconSearch}
					hasClear
				/>
			</VStack>
			{groups.length === 0 ? (
				<Text color="secondary">No symbols match that filter.</Text>
			) : (
				<VStack gap={5}>
					{groups.map((group) => (
						<VStack key={group.label} gap={2}>
							{groups.length > 1 ? (
								<Text type="label" color="secondary">
									{group.label}
								</Text>
							) : null}
							<MetadataList>
								{group.symbols.map((symbol) => (
									<SymbolItem key={symbol.id} symbol={symbol} />
								))}
							</MetadataList>
						</VStack>
					))}
				</VStack>
			)}
		</VStack>
	);
}
