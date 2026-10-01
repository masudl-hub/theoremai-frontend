/**
 * Trace and lexicon rows for the topic dictionary.
 * Same catalogs the kernel exports — no authored copies.
 */

import { LEXICON_KEYS, lexiconDefault } from '@theoremai/agents/guardrails';
import { TRACE_FIELDS, TRACE_SPAN_TYPES } from '@theoremai/agents/observability';

type TraceCatalogRow = { key: string; label: string; doc: string };

type LexiconCatalogRow = { key: string; text: string };

export function traceCatalogRows(): TraceCatalogRow[] {
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

export function lexiconCatalogRows(): LexiconCatalogRow[] {
	return LEXICON_KEYS.map((key) => ({
		key,
		text: lexiconDefault(key),
	}));
}
