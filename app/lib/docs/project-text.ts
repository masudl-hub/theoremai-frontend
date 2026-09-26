/**
 * One text projector for Th30 read, search indexing, and .md twins.
 */

import type { DocArticle, ResolvedBlock } from './schema';

function factLines(block: Extract<ResolvedBlock, { kind: 'facts' }>): string[] {
	return block.items.map((item) => `${item.label}: ${item.value}`);
}

function fieldLines(block: Extract<ResolvedBlock, { kind: 'fields' }>): string[] {
	return block.rows.map((row) => {
		const unset = row.meta.unset ? ` Omit → ${row.meta.unset}.` : '';
		return `${row.path} — ${row.meta.doc}${unset}`;
	});
}

function unionLines(block: Extract<ResolvedBlock, { kind: 'union' }>): string[] {
	return block.members.map((member) =>
		member.doc ? `${member.value} — ${member.doc}` : member.value,
	);
}

function rowLines(block: Extract<ResolvedBlock, { kind: 'trace' | 'lexicon' }>): string[] {
	if (block.kind === 'trace') {
		return block.rows.map((row) => `${row.key} — ${row.label}: ${row.doc}`);
	}
	return block.rows.map((row) => `${row.key} — ${row.defaultText}`);
}

export function projectBlockText(block: ResolvedBlock): string {
	switch (block.kind) {
		case 'lede':
		case 'prose':
		case 'callout':
			return block.text;
		case 'media':
			return block.media.caption ?? block.media.alt;
		case 'facts':
			return factLines(block).join('\n');
		case 'fields':
			return fieldLines(block).join('\n');
		case 'union':
			return unionLines(block).join('\n');
		case 'trace':
		case 'lexicon':
			return rowLines(block).join('\n');
		case 'code':
			return block.code;
		case 'embed.playground':
			return `Playground seed ${block.seed}`;
	}
}

export function projectArticleText(
	article: DocArticle,
	detail: 'summary' | 'full' | 'code_only' = 'full',
): string {
	if (detail === 'summary') return `${article.title}\n\n${article.summary}`;
	const parts: string[] = [`# ${article.title}`, '', article.summary, ''];
	for (const block of article.blocks) {
		if (detail === 'code_only' && block.kind !== 'code') continue;
		const text = projectBlockText(block);
		if (!text) continue;
		parts.push(`## ${block.id}`, text, '');
	}
	return parts.join('\n').trim();
}

export function formatWithLineNumbers(title: string, text: string): string {
	const lines = text.split('\n');
	const maxDigits = Math.max(2, String(lines.length).length);
	const numbered = lines.map((line, idx) => {
		const num = String(idx + 1).padStart(maxDigits, '0');
		return `L${num} | ${line}`;
	});
	return `=== ${title} ===\n${numbered.join('\n')}`;
}

const WORDS_PER_MINUTE = 200;

export function ttrMinutesFromText(text: string): number {
	const words = text.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
