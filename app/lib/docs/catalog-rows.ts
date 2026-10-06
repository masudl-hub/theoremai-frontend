/**
 * Trace and lexicon rows for the topic dictionary.
 * Same catalogs the kernel exports — no authored copies.
 */

import { LEXICON_KEYS, lexiconDefault } from '@theoremjs/agents/guardrails';
import { TRACE_FIELDS, TRACE_SPAN_TYPES } from '@theoremjs/agents/observability';
import type { PageSymbol } from './schema';

export function traceCatalogRows() {
	const spans = Object.entries(TRACE_SPAN_TYPES).map(([key, meta]) => ({
		key,
		label: meta.label,
		doc: meta.doc,
	}));
	const fields = Object.entries(TRACE_FIELDS).map(([key, meta]) => ({
		key,
		label: meta.label,
		doc: meta.doc,
	}));
	return [...spans, ...fields];
}

export function lexiconCatalogRows() {
	return LEXICON_KEYS.map((key) => ({
		key,
		text: lexiconDefault(key),
	}));
}

/** A catalog row as a name and its one-line doc. Search, markdown and JSON-LD all read this. */
export function symbolTerm(symbol: PageSymbol): { name: string; text: string } {
	switch (symbol.kind) {
		case 'field':
		case 'request-field': {
			const unset = symbol.meta.unset ? ` Omit → ${symbol.meta.unset}.` : '';
			return { name: symbol.path, text: `${symbol.meta.doc}${unset}` };
		}
		case 'export':
			return { name: symbol.name, text: symbol.doc };
		case 'union-member':
			return { name: symbol.value, text: symbol.doc };
		case 'trace':
			return { name: symbol.key, text: `${symbol.label}: ${symbol.doc}` };
		case 'lexicon':
			return { name: symbol.key, text: symbol.text };
	}
}
