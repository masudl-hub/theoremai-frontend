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

const WORDS_PER_MINUTE = 200;

/** Whole minutes to read `text`, never less than one. */
export function ttrMinutesFromText(text: string): number {
	const words = text.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
