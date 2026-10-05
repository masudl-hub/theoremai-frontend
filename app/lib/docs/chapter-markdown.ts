/**
 * Read a chapter's Markdown with the parser that Astryx `Markdown` renders with, so compose,
 * search and the checks see the document the reader sees.
 */

import { visitMarkdownNodes } from '@astryxdesign/core/Markdown';
import {
	type MarkdownAstPhrasingContent,
	type MarkdownAstRoot,
	parseMarkdownAst,
} from '@astryxdesign/core/Markdown/parser';
import { parseOutlineFromMarkdown } from '@astryxdesign/core/Outline';
import type { DocSectionEntry } from './schema';

/** A fenced block. `start` and `end` are its offsets in the Markdown, fence lines included. */
export type Fence = {
	lang: string;
	/** `key=value` pairs after the language on the fence line. */
	meta: Readonly<Partial<Record<string, string>>>;
	code: string;
	start: number;
	end: number;
};

function fenceMeta(meta: string | undefined): Record<string, string> {
	const pairs = (meta ?? '').split(/\s+/).filter(Boolean);
	return Object.fromEntries(
		pairs.map((pair) => {
			const at = pair.indexOf('=');
			if (at <= 0) throw new Error(`fence meta "${pair}" is not key=value`);
			return [pair.slice(0, at), pair.slice(at + 1)];
		}),
	);
}

/** Every fenced block in document order. A fence must be at the top level, not in a list or quote. */
export function markdownFences(markdown: string): Fence[] {
	const fences: Fence[] = [];
	visitMarkdownNodes(parseMarkdownAst(markdown), 'code', (node) => {
		const start = node.position?.start.offset;
		const end = node.position?.end.offset;
		if (start === undefined || end === undefined) {
			throw new Error('a fenced block must be at the top level of the chapter');
		}
		fences.push({
			lang: node.lang ?? '',
			meta: fenceMeta(node.meta),
			code: node.value,
			start,
			end,
		});
	});
	return fences;
}

/** A fenced block as Markdown, with a fence longer than any backtick run in `code`. */
export function fenceMarkdown(info: string, code: string): string {
	const longest = Math.max(2, ...[...code.matchAll(/`+/g)].map((run) => run[0].length));
	const ticks = '`'.repeat(longest + 1);
	return `${ticks}${info}\n${code}\n${ticks}`;
}

/** The chapter's headings as sections. Each runs from its heading to the next heading. */
export function markdownSections(markdown: string): DocSectionEntry[] {
	const starts: number[] = [];
	for (const node of parseMarkdownAst(markdown).children) {
		if (node.type !== 'heading') continue;
		const start = node.position?.start.offset;
		if (start === undefined) throw new Error('a heading has no position in the chapter');
		starts.push(start);
	}
	return parseOutlineFromMarkdown(markdown).map((item, at) => ({
		id: item.id,
		title: item.label,
		level: item.level,
		start: starts[at] ?? markdown.length,
		end: starts[at + 1] ?? markdown.length,
	}));
}

/** The text before the first heading. */
export function introText(article: { body: string; sections: readonly DocSectionEntry[] }): string {
	return article.body.slice(0, article.sections[0]?.start ?? article.body.length).trim();
}

/** A section as Markdown: its heading line and everything under it. */
export function sectionText(article: { body: string }, section: DocSectionEntry): string {
	return article.body.slice(section.start, section.end).trim();
}

/** Runs `read` on the chapter, and on the Markdown inside each note and warning card. */
function eachProse(markdown: string, read: (root: MarkdownAstRoot) => void): void {
	const root = parseMarkdownAst(markdown);
	read(root);
	visitMarkdownNodes(root, 'code', (node) => {
		if (node.lang === 'note' || node.lang === 'warning') eachProse(node.value, read);
	});
}

/** Every inline-code span in the prose, tables and cards. Code samples are not read. */
export function markdownInlineCode(markdown: string): string[] {
	const spans: string[] = [];
	eachProse(markdown, (root) => {
		visitMarkdownNodes(root, 'inlineCode', (node) => {
			spans.push(node.value);
		});
	});
	return spans;
}

/** Every link target in the prose, tables and cards. */
export function markdownLinks(markdown: string): string[] {
	const links: string[] = [];
	eachProse(markdown, (root) => {
		visitMarkdownNodes(root, 'link', (node) => {
			links.push(node.url);
		});
	});
	return links;
}

/** A table cell: the inline-code spans it holds, and all of its text without the backticks. */
export type TableCell = { code: string[]; text: string };

function cellOf(nodes: readonly MarkdownAstPhrasingContent[]): TableCell {
	const cell: TableCell = { code: [], text: '' };
	for (const node of nodes) {
		if (node.type === 'text') cell.text += node.value;
		if (node.type === 'inlineCode') {
			cell.code.push(node.value);
			cell.text += node.value;
		}
		if ('children' in node) {
			const inner = cellOf(node.children);
			cell.code.push(...inner.code);
			cell.text += inner.text;
		}
	}
	return cell;
}

/** Every table in the Markdown as its body rows, the header row left out. */
export function markdownTables(markdown: string): TableCell[][][] {
	const tables: TableCell[][][] = [];
	visitMarkdownNodes(parseMarkdownAst(markdown), 'table', (table) => {
		tables.push(table.children.slice(1).map((row) => row.children.map((c) => cellOf(c.children))));
	});
	return tables;
}

/** A `ts` sample the chapter's author wrote. Seed programs are the kernel's own output. */
export type AuthoredSample = { id: string; frame: string | undefined; code: string };

/** Every authored `ts` sample, named for its section and its place in the chapter. */
export function authoredSamples(article: {
	body: string;
	sections: readonly DocSectionEntry[];
}): AuthoredSample[] {
	return markdownFences(article.body)
		.filter((fence) => fence.lang === 'ts' && fence.meta.seed === undefined)
		.map((fence, at) => {
			const section = article.sections.findLast((entry) => entry.start < fence.start);
			const place = String(at + 1).padStart(2, '0');
			return {
				id: `${place}-${section?.id ?? 'intro'}`,
				frame: fence.meta.frame,
				code: fence.code,
			};
		});
}
