import type { ResolvedBlock } from './schema';

/** A block's body as plain text for markdown and search. */
export function projectBlockText(block: ResolvedBlock): string {
	switch (block.kind) {
		case 'lede':
		case 'prose':
		case 'callout':
			return block.text;
		case 'agent.paste':
			return block.prompt;
		case 'media':
			return block.caption ?? block.alt;
		case 'code':
			return block.code;
		case 'embed.playground':
			return `Playground seed ${block.seed}`;
	}
}
