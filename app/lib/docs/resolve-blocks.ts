/**
 * Expand authored blocks into ResolvedBlock. The reader never calls fieldMeta.
 */

import { readmeSnippet } from './readme-source';
import type { AuthoredBlock, CodeSource, ResolvedBlock } from './schema';
import { compileSeedSource } from './seeds';

function resolveCode(
	source: CodeSource,
	readmePath: string,
): Extract<ResolvedBlock, { kind: 'code' }> {
	if (source.from === 'seed') {
		return { id: '', kind: 'code', lang: 'ts', code: compileSeedSource(source.seed), source };
	}
	if (source.from === 'literal') {
		return { id: '', kind: 'code', lang: source.lang, code: source.code, source };
	}
	const snippet = readmeSnippet(readmePath, source.heading, source.nth, source.sha256);
	return { id: '', kind: 'code', lang: snippet.lang, code: snippet.code, source };
}

export function resolveBlock(block: AuthoredBlock, readmePath: string): ResolvedBlock {
	switch (block.kind) {
		case 'lede':
		case 'prose':
		case 'media':
		case 'callout':
		case 'agent.paste':
		case 'embed.playground':
			return block;
		case 'code': {
			const resolved = resolveCode(block.source, readmePath);
			return { ...resolved, id: block.id, title: block.title };
		}
	}
}
