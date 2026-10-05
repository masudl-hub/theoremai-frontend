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
			return fieldHaystack(symbol.path, symbol.meta);
		case 'union-member':
			return `${symbol.value} ${symbol.union} ${symbol.doc}`.toLowerCase();
		case 'trace':
			return `${symbol.key} ${symbol.label} ${symbol.doc}`.toLowerCase();
		case 'lexicon':
			return `${symbol.key} ${symbol.text}`.toLowerCase();
	}
}

function FieldHover({
	path,
	meta,
	children,
}: {
	path: string;
	meta: FieldMeta;
	children: ReactNode;
}) {
	const options = meta.options ?? [meta.type];
	return (
		<HoverCard
			label={path}
			content={
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
			}
		>
			{children}
		</HoverCard>
	);
}

function labelText(label: string): string {
	return label.replaceAll('.', '.\n');
}

function FieldSymbolItem({ symbol }: { symbol: Extract<PageSymbol, { kind: 'field' }> }) {
	const { path, meta } = symbol;
	return (
		<MetadataListItem id={symbol.id} data-docs-block={symbol.id} label={labelText(path)}>
			<FieldHover path={path} meta={meta}>
				<span>{meta.doc}</span>
			</FieldHover>
		</MetadataListItem>
	);
}

function UnionSymbolItem({ symbol }: { symbol: Extract<PageSymbol, { kind: 'union-member' }> }) {
	return (
		<MetadataListItem id={symbol.id} data-docs-block={symbol.id} label={labelText(symbol.value)}>
			{symbol.doc}
		</MetadataListItem>
	);
}

function TraceSymbolItem({ symbol }: { symbol: Extract<PageSymbol, { kind: 'trace' }> }) {
	return (
		<MetadataListItem id={symbol.id} data-docs-block={symbol.id} label={labelText(symbol.key)}>
			{`${symbol.label}. ${symbol.doc}`}
		</MetadataListItem>
	);
}

function LexiconSymbolItem({ symbol }: { symbol: Extract<PageSymbol, { kind: 'lexicon' }> }) {
	return (
		<MetadataListItem id={symbol.id} data-docs-block={symbol.id} label={labelText(symbol.key)}>
			{symbol.text}
		</MetadataListItem>
	);
}

/** One kind of symbol; its label shows only when several kinds are listed. */
function SymbolGroup({
	label,
	labeled,
	children,
}: {
	label: string;
	labeled: boolean;
	children: ReactNode;
}) {
	return (
		<VStack gap={2}>
			{labeled ? (
				<Text type="label" color="secondary">
					{label}
				</Text>
			) : null}
			<MetadataList>{children}</MetadataList>
		</VStack>
	);
}

/** The filtered symbols, grouped by kind in catalog order. Empty groups drop out. */
function SymbolGroups({
	fields,
	unions,
	traces,
	lexicon,
	labeled,
}: {
	fields: readonly Extract<PageSymbol, { kind: 'field' }>[];
	unions: readonly Extract<PageSymbol, { kind: 'union-member' }>[];
	traces: readonly Extract<PageSymbol, { kind: 'trace' }>[];
	lexicon: readonly Extract<PageSymbol, { kind: 'lexicon' }>[];
	labeled: boolean;
}) {
	return (
		<VStack gap={5}>
			{fields.length ? (
				<SymbolGroup label="Fields" labeled={labeled}>
					{fields.map((symbol) => (
						<FieldSymbolItem key={symbol.id} symbol={symbol} />
					))}
				</SymbolGroup>
			) : null}
			{unions.length ? (
				<SymbolGroup label="Union members" labeled={labeled}>
					{unions.map((symbol) => (
						<UnionSymbolItem key={symbol.id} symbol={symbol} />
					))}
				</SymbolGroup>
			) : null}
			{traces.length ? (
				<SymbolGroup label="Trace records" labeled={labeled}>
					{traces.map((symbol) => (
						<TraceSymbolItem key={symbol.id} symbol={symbol} />
					))}
				</SymbolGroup>
			) : null}
			{lexicon.length ? (
				<SymbolGroup label="Status lines" labeled={labeled}>
					{lexicon.map((symbol) => (
						<LexiconSymbolItem key={symbol.id} symbol={symbol} />
					))}
				</SymbolGroup>
			) : null}
		</VStack>
	);
}

export function PageDictionary({ symbols }: { symbols: readonly PageSymbol[] }) {
	const [query, setQuery] = useState('');
	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return [...symbols];
		return symbols.filter((symbol) => symbolHaystack(symbol).includes(needle));
	}, [query, symbols]);

	const fields = useMemo(
		() =>
			filtered.filter(
				(symbol): symbol is Extract<PageSymbol, { kind: 'field' }> => symbol.kind === 'field',
			),
		[filtered],
	);
	const unions = useMemo(
		() =>
			filtered.filter(
				(symbol): symbol is Extract<PageSymbol, { kind: 'union-member' }> =>
					symbol.kind === 'union-member',
			),
		[filtered],
	);
	const traces = useMemo(
		() =>
			filtered.filter(
				(symbol): symbol is Extract<PageSymbol, { kind: 'trace' }> => symbol.kind === 'trace',
			),
		[filtered],
	);
	const lexicon = useMemo(
		() =>
			filtered.filter(
				(symbol): symbol is Extract<PageSymbol, { kind: 'lexicon' }> => symbol.kind === 'lexicon',
			),
		[filtered],
	);
	const groups = [fields, unions, traces, lexicon].filter((group) => group.length > 0);

	if (!symbols.length) return null;

	return (
		<VStack gap={4} id="dictionary" data-docs-block="dictionary" className="docs-dictionary">
			<VStack gap={2}>
				<Heading level={2}>Symbols</Heading>
				<Text color="secondary">
					Catalog paths, members, and records this page owns. Hover a path for the full field card.
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
			{filtered.length === 0 ? (
				<Text color="secondary">No symbols match that filter.</Text>
			) : (
				<SymbolGroups
					fields={fields}
					unions={unions}
					traces={traces}
					lexicon={lexicon}
					labeled={groups.length > 1}
				/>
			)}
		</VStack>
	);
}
