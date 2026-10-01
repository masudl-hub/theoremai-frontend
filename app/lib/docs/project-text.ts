import type { DocArticle, PageSymbol, ResolvedBlock } from './schema';

function symbolLine(symbol: PageSymbol): string {
	switch (symbol.kind) {
		case 'field': {
			const unset = symbol.meta.unset ? ` Omit → ${symbol.meta.unset}.` : '';
			return `${symbol.path} — ${symbol.meta.doc}${unset}`;
		}
		case 'union-member':
			return symbol.doc ? `${symbol.value} — ${symbol.doc}` : symbol.value;
		case 'trace':
			return `${symbol.key} — ${symbol.label}: ${symbol.doc}`;
		case 'lexicon':
			return `${symbol.key} — ${symbol.text}`;
		default: {
			const unreachable: never = symbol;
			return unreachable;
		}
	}
}

function symbolLines(symbols: readonly PageSymbol[]): string[] {
	return symbols.map(symbolLine);
}

export function projectBlockText(block: ResolvedBlock): string {
	switch (block.kind) {
		case 'lede':
		case 'prose':
		case 'callout':
			return block.text;
		case 'agent.paste':
			return block.prompt;
		case 'media':
			return block.media.caption ?? block.media.alt;
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
	if (detail === 'full' && article.questions.length) {
		parts.push('This page covers', ...article.questions.map((item) => `- ${item.question}`), '');
	}
	for (const block of article.blocks) {
		if (detail === 'code_only' && block.kind !== 'code') continue;
		const text = projectBlockText(block);
		if (!text) continue;
		const heading =
			block.kind === 'prose'
				? block.title
				: block.kind === 'code' && block.title
					? block.title
					: block.id;
		parts.push(`## ${heading}`, text, '');
	}
	if (detail === 'full' && article.symbols.length) {
		parts.push('## dictionary', ...symbolLines(article.symbols), '');
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
