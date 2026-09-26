/**
 * Expand authored catalog blocks into ResolvedBlock rows. The reader never
 * calls fieldMeta — compose already did.
 */

import { LEXICON_KEYS, type LexiconKey, lexiconDefault } from '@theoremai/agents/guardrails';
import {
	TRACE_ATTRIBUTE_GROUPS,
	TRACE_FIELDS,
	TRACE_SPAN_TYPES,
	type TraceAttributeGroup,
} from '@theoremai/agents/observability';
import { EXTRA_FIELDS, fieldMeta, PROFILE_FIELDS } from '@theoremai/agents/schema';
import { resolveFacts } from './facts';
import { isDocWorthyUnion } from './placement';
import { readmeSnippet } from './readme-source';
import type { AuthoredBlock, CodeSource, ResolvedBlock, ResolvedFieldRow } from './schema';
import { compileSeedSource } from './seeds';
import { unionMembers } from './union-docs';

function fieldRows(paths: readonly string[]): ResolvedFieldRow[] {
	return paths.map((path) => {
		const meta = fieldMeta(path);
		if (!meta) throw new Error(`fieldMeta(${path}) is undefined`);
		return { path, meta };
	});
}

function pathsFromSelector(selector: readonly string[] | { prefix: string }): string[] {
	if ('prefix' in selector) {
		const { prefix } = selector;
		const keys = [...Object.keys(PROFILE_FIELDS), ...Object.keys(EXTRA_FIELDS)];
		const hits = keys.filter(
			(path) => path === prefix.replace(/\.$/, '') || path.startsWith(prefix),
		);
		if (!hits.length) throw new Error(`No fields match prefix ${prefix}`);
		return hits;
	}
	if (!selector.length) throw new Error('catalog.fields paths is empty');
	return [...selector];
}

function resolveCode(
	source: CodeSource,
	readmePath: string,
): Extract<ResolvedBlock, { kind: 'code' }> {
	if (source.from === 'seed') {
		return { id: '', kind: 'code', lang: 'ts', code: compileSeedSource(source.seed), source };
	}
	const snippet = readmeSnippet(readmePath, source.heading, source.nth, source.sha256);
	return { id: '', kind: 'code', lang: snippet.lang, code: snippet.code, source };
}

function resolveTrace(group?: string): { key: string; label: string; doc: string }[] {
	if (group) {
		if (!(group in TRACE_ATTRIBUTE_GROUPS)) {
			throw new Error(`TRACE_ATTRIBUTE_GROUPS has no ${group}`);
		}
		const meta = TRACE_ATTRIBUTE_GROUPS[group as TraceAttributeGroup];
		return [{ key: group, label: meta.label, doc: meta.doc }];
	}
	const fields = Object.entries(TRACE_FIELDS).map(([key, meta]) => ({
		key,
		label: meta.label,
		doc: meta.doc,
	}));
	const spans = Object.entries(TRACE_SPAN_TYPES).map(([key, meta]) => ({
		key,
		label: meta.label,
		doc: meta.doc,
	}));
	return [...spans, ...fields];
}

function resolveLexicon(keys?: readonly string[]): { key: string; defaultText: string }[] {
	const wanted = keys?.length ? keys : [...LEXICON_KEYS];
	return wanted.map((key) => {
		if (!(LEXICON_KEYS as readonly string[]).includes(key)) {
			throw new Error(`Unknown lexicon key ${key}`);
		}
		return { key, defaultText: lexiconDefault(key as LexiconKey) };
	});
}

export function resolveBlock(block: AuthoredBlock, readmePath: string): ResolvedBlock {
	switch (block.kind) {
		case 'lede':
		case 'prose':
		case 'media':
		case 'callout':
		case 'embed.playground':
			return block;
		case 'facts':
			return { id: block.id, kind: 'facts', items: resolveFacts(block.items) };
		case 'catalog.fields':
			return { id: block.id, kind: 'fields', rows: fieldRows(pathsFromSelector(block.paths)) };
		case 'catalog.union':
			if (!isDocWorthyUnion(block.union)) {
				throw new Error(`${block.union} is not in DOC_WORTHY_UNIONS`);
			}
			return { id: block.id, kind: 'union', name: block.union, members: unionMembers(block.union) };
		case 'catalog.trace':
			return { id: block.id, kind: 'trace', rows: resolveTrace(block.group) };
		case 'catalog.lexicon':
			return { id: block.id, kind: 'lexicon', rows: resolveLexicon(block.keys) };
		case 'code': {
			const resolved = resolveCode(block.source, readmePath);
			return { ...resolved, id: block.id };
		}
	}
}
