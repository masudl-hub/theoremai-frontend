/**
 * Generic text helpers for docs output: numbered reads and reading time.
 */

/** `=== title ===` then every line prefixed `Lnn | `, at least two digits wide. */
export function formatWithLineNumbers(title: string, text: string): string {
	const lines = text.split('\n');
	const digits = Math.max(2, String(lines.length).length);
	const numbered = lines.map((line, idx) => `L${String(idx + 1).padStart(digits, '0')} | ${line}`);
	return `=== ${title} ===\n${numbered.join('\n')}`;
}

/** Markdown as the text a person would read: no fences, backticks, emphasis, link targets or table rules. */
export function plainMarkdown(text: string): string {
	return text
		.replace(/```[\s\S]*?(```|$)/g, '\n')
		.replace(/^\s*\|?[-: |]{3,}\|?\s*$/gm, '')
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/`+([^`\n]*)`+/g, '$1')
		.replace(/(\*\*|__)(.+?)\1/g, '$2')
		.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:]|$)/g, '$1$2')
		.replace(/^[ \t]*(#{1,6}|>|[-*+]|\d+\.)[ \t]+/gm, '')
		.replace(/\s*\|\s*/g, ' · ')
		.replace(/^ · | · $/gm, '')
		.replace(/[ \t]+/g, ' ')
		.trim();
}

const WORDS_PER_MINUTE = 200;

/**
 * Whole minutes to read `text`, never less than one. Only words count: a mark standing alone, such
 * as a table rule or a dash, is not read.
 */
export function ttrMinutesFromText(text: string): number {
	const words = text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
	return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
