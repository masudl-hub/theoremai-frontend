/**
 * Trace and lexicon rows for the topic dictionary.
 * Same catalogs the kernel exports — no authored copies.
 */

import { LEXICON_KEYS, lexiconDefault } from '@theoremjs/agents/guardrails';
import { TRACE_FIELDS, TRACE_SPAN_TYPES } from '@theoremjs/agents/observability';

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
