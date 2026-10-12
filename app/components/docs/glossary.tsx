/**
 * The glossary: every catalog row in one table, filtered by words, area and kind.
 */

import { HoverCard } from '@astryxdesign/core/HoverCard';
import { HStack } from '@astryxdesign/core/HStack';
import { Link } from '@astryxdesign/core/Link';
import { Selector } from '@astryxdesign/core/Selector';
import { pixel, proportional, Table } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import { IconSearch } from '@tabler/icons-react';
import type { FieldMeta } from '@theoremjs/agents/schema';
import { useMemo, useState } from 'react';
import { symbolTerm } from '../../lib/docs/catalog-rows';
import { AREA_LABEL, type GlossaryArea, type PageSymbol } from '../../lib/docs/schema';

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

/** What a kind of row is called in the Kind column and in its filter. */
const KIND_LABEL: Record<PageSymbol['kind'], string> = {
	export: 'Function or class',
	'request-field': 'Request field',
	field: 'Field',
	'union-member': 'Union member',
	trace: 'Trace record',
	lexicon: 'Status line',
};

/** The kinds in the order the filter lists them. */
const KINDS = Object.keys(KIND_LABEL) as PageSymbol['kind'][];

/** The words a row is found by, beyond its name and what it says: its options, default and types. */
function extraWords(symbol: PageSymbol): string {
	switch (symbol.kind) {
		case 'field':
		case 'request-field':
			return [
				symbol.meta.unset,
				symbol.meta.options?.join(' '),
				symbol.meta.type,
				symbol.meta.optionNote,
				symbol.meta.profileTypes?.join(' '),
			]
				.filter(Boolean)
				.join(' ');
		case 'union-member':
			return symbol.union;
		case 'trace':
			return symbol.label;
		case 'export':
			return symbol.exported;
		case 'lexicon':
			return '';
	}
}

type Row = {
	id: string;
	name: string;
	kind: string;
	area: string;
	areaTitle: string;
	chapter: string;
	chapterTitle: string;
	text: string;
	haystack: string;
	symbol: PageSymbol;
};

function rowOf(symbol: PageSymbol, chapterTitle: string): Row {
	const { name, text } = symbolTerm(symbol);
	const kind = KIND_LABEL[symbol.kind];
	return {
		id: symbol.id,
		name,
		kind,
		area: symbol.area,
		areaTitle: AREA_LABEL[symbol.area],
		chapter: symbol.chapter,
		chapterTitle,
		text,
		haystack:
			`${name} ${kind} ${AREA_LABEL[symbol.area]} ${chapterTitle} ${text} ${extraWords(symbol)}`.toLowerCase(),
		symbol,
	};
}

const ALL = 'all';

/** The rows whose every typed word appears in the row, in the chosen area and kind. */
function useGlossaryRows(
	symbols: readonly PageSymbol[],
	titles: ReadonlyMap<string, string>,
	filter: { query: string; area: string; kind: string },
) {
	const rows = useMemo(
		() => symbols.map((symbol) => rowOf(symbol, titles.get(symbol.chapter) ?? symbol.chapter)),
		[symbols, titles],
	);
	return useMemo(() => {
		const words = filter.query.toLowerCase().split(/\s+/).filter(Boolean);
		return rows.filter(
			(row) =>
				(filter.area === ALL || row.area === filter.area) &&
				(filter.kind === ALL || row.kind === filter.kind) &&
				words.every((word) => row.haystack.includes(word)),
		);
	}, [rows, filter.query, filter.area, filter.kind]);
}

function NameCell({ row }: { row: Row }) {
	return (
		<span id={row.id} data-docs-block={row.id} className="docs-glossary-name">
			{row.name}
		</span>
	);
}

function MeaningCell({ row }: { row: Row }) {
	const { symbol } = row;
	if (symbol.kind === 'field' || symbol.kind === 'request-field') {
		return (
			<HoverCard label={symbol.path} content={<FieldCard meta={symbol.meta} />}>
				<span>{row.text}</span>
			</HoverCard>
		);
	}
	return <span>{row.text}</span>;
}

/** Every catalog row in one table. `titles` names each area's chapter, by slug. */
export function Glossary({
	symbols,
	titles,
}: {
	symbols: readonly PageSymbol[];
	titles: ReadonlyMap<string, string>;
}) {
	const [query, setQuery] = useState('');
	const [area, setArea] = useState(ALL);
	const [kind, setKind] = useState(ALL);
	const rows = useGlossaryRows(symbols, titles, { query, area, kind });

	const areaOptions = useMemo(() => {
		const present = new Set(symbols.map((symbol) => symbol.area));
		return [
			{ value: ALL, label: 'All areas' },
			...(Object.keys(AREA_LABEL) as GlossaryArea[])
				.filter((slug) => present.has(slug))
				.map((slug) => ({ value: slug, label: AREA_LABEL[slug] })),
		];
	}, [symbols]);
	const kindOptions = useMemo(() => {
		const present = new Set(symbols.map((symbol) => symbol.kind));
		return [
			{ value: ALL, label: 'All kinds' },
			...KINDS.filter((item) => present.has(item)).map((item) => ({
				value: KIND_LABEL[item],
				label: KIND_LABEL[item],
			})),
		];
	}, [symbols]);

	if (!symbols.length) return null;

	return (
		<VStack gap={4} id="glossary" data-docs-block="glossary" className="docs-glossary">
			<HStack gap={3} wrap="wrap" vAlign="end">
				<div className="docs-glossary-search">
					<TextInput
						label="Search the glossary"
						isLabelHidden
						placeholder="Search by name, area, kind or meaning"
						value={query}
						onChange={setQuery}
						startIcon={IconSearch}
						hasClear
					/>
				</div>
				<Selector
					label="Area"
					isLabelHidden
					options={areaOptions}
					value={area}
					onChange={setArea}
					width={220}
				/>
				<Selector
					label="Kind"
					isLabelHidden
					options={kindOptions}
					value={kind}
					onChange={setKind}
					width={200}
				/>
			</HStack>
			<Text color="secondary" aria-live="polite">
				{rows.length === symbols.length
					? `${String(rows.length)} rows`
					: `${String(rows.length)} of ${String(symbols.length)} rows`}
			</Text>
			<Table
				data={rows}
				idKey="id"
				density="compact"
				dividers="rows"
				verticalAlign="top"
				emptyState={<Text color="secondary">No row matches. Try fewer words or another area.</Text>}
				columns={[
					{
						key: 'name',
						header: 'Name',
						width: proportional(3),
						renderCell: (row) => <NameCell row={row} />,
					},
					{ key: 'kind', header: 'Kind', width: pixel(150) },
					{ key: 'areaTitle', header: 'Area', width: pixel(140) },
					{
						key: 'chapterTitle',
						header: 'Chapter',
						width: pixel(160),
						renderCell: (row) => <Link href={`/docs/${row.chapter}`}>{row.chapterTitle}</Link>,
					},
					{
						key: 'text',
						header: 'What it does',
						width: proportional(5),
						renderCell: (row) => <MeaningCell row={row} />,
					},
				]}
			/>
		</VStack>
	);
}
