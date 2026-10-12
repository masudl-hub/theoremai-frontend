/** A catalog row as the glossary and search read it: the name the kernel gives it, and what it says. */

import type { PageSymbol } from './schema';

/** Search, markdown and JSON-LD all read this. */
export function symbolTerm(symbol: PageSymbol): { name: string; text: string } {
	switch (symbol.kind) {
		case 'field':
		case 'request-field': {
			const unset = symbol.meta.unset ? ` Omit → ${symbol.meta.unset}.` : '';
			return { name: symbol.path, text: `${symbol.meta.doc}${unset}` };
		}
		case 'export':
		case 'union-member':
		case 'trace':
		case 'label':
			return { name: symbol.name, text: textOf(symbol) };
	}
}

function textOf(symbol: Exclude<PageSymbol, { kind: 'field' | 'request-field' }>): string {
	switch (symbol.kind) {
		case 'export':
		case 'union-member':
			return symbol.doc;
		case 'trace':
			return `${symbol.label}: ${symbol.doc}`;
		case 'label':
			return symbol.text;
	}
}
