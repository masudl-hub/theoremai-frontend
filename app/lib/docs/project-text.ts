import type { DocArticle, PageSymbol, ResolvedBlock } from './schema';

/** A catalog row as a name and its one-line doc. Search, markdown and JSON-LD all read this. */
export function symbolTerm(symbol: PageSymbol): { name: string; text: string } {
	switch (symbol.kind) {
		case 'field': {
			const unset = symbol.meta.unset ? ` Omit → ${symbol.meta.unset}.` : '';
			return { name: symbol.path, text: `${symbol.meta.doc}${unset}` };
		}
		case 'union-member':
			return { name: symbol.value, text: symbol.doc };
		case 'trace':
			return { name: symbol.key, text: `${symbol.label}: ${symbol.doc}` };
		case 'lexicon':
			return { name: symbol.key, text: symbol.text };
	}
}

export function projectBlockText(block: ResolvedBlock): string {
	switch (block.kind) {
		case 'lede':
		case 'prose':
			return block.text;
		case 'agent.paste':
			return block.prompt;
		case 'code':
			return block.code;
		case 'embed.playground':
			return `Playground seed ${block.seed}`;
	}
}

/** Heading for a block in markdown and search: its title, else its id. */
export function blockHeading(block: ResolvedBlock): string {
	if (block.kind === 'prose') return block.title;
	if (block.kind === 'code' && block.title) return block.title;
	return block.id;
}

export function projectArticleText(
	article: Pick<DocArticle, 'title' | 'summary' | 'questions' | 'blocks' | 'symbols'>,
	detail: 'summary' | 'full' | 'code_only' = 'full',
): string {
	if (detail === 'summary') return `${article.title}\n\n${article.summary}`;
	const parts: string[] = [`# ${article.title}`, '', article.summary, ''];
	if (detail === 'full' && article.questions.length) {
		parts.push('This page covers', ...article.questions.map((item) => `- ${item.question}`), '');
	}
	for (const block of article.blocks) {
		if (detail === 'code_only' && block.kind !== 'code') continue;
		parts.push(`## ${blockHeading(block)}`, projectBlockText(block), '');
	}
	if (detail === 'full' && article.symbols.length) {
		const lines = article.symbols.map(symbolTerm).map(({ name, text }) => `${name} — ${text}`);
		parts.push('## dictionary', ...lines, '');
	}
	return parts.join('\n').trim();
}

export function formatWithLineNumbers(title: string, text: string): string {
	const lines = text.split('\n');
	const digits = Math.max(2, String(lines.length).length);
	const numbered = lines.map((line, idx) => `L${String(idx + 1).padStart(digits, '0')} | ${line}`);
	return `=== ${title} ===\n${numbered.join('\n')}`;
}

const WORDS_PER_MINUTE = 200;

export function ttrMinutesFromText(text: string): number {
	const words = text.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
