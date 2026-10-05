/**
 * Docs data model. A chapter is a Markdown file in `articles/`; compose turns each into a `DocArticle`.
 * Catalog rows are imported at compose time — nothing here copies FieldMeta.doc.
 */

import type * as SchemaModule from '@theoremjs/agents/schema';
import type { FieldMeta } from '@theoremjs/agents/schema';

/** One chapter per section, in this order. The slug is the section id. */
export const DOC_SECTIONS = [
	'start',
	'modalities',
	'identity',
	'models',
	'tools',
	'inputs',
	'outputs',
	'turn-behaviour',
	'guardrails',
	'runner',
	'interface',
	'statuses',
	'traces',
] as const;
export type DocSection = (typeof DOC_SECTIONS)[number];

export const PLAYGROUND_SEED_IDS = ['firstTurn'] as const;
export type PlaygroundSeedId = (typeof PLAYGROUND_SEED_IDS)[number];

/** Schema exports that are closed string arrays — derived, not a hand name list. */
export type ArrayUnionName = {
	[K in keyof typeof SchemaModule]: (typeof SchemaModule)[K] extends readonly string[] ? K : never;
}[keyof typeof SchemaModule];

/**
 * How `npm run lint:docs` completes a `ts` sample before it type-checks it. A sample with an
 * `import` is a whole program and needs no frame. Any other `ts` sample must name one in its
 * fence line: ` ```ts frame=statements `.
 * - `statements`: statements that run in a function.
 * - `request`: members of the `TurnRequest` that `runTurn` takes.
 * - `request-object`: a whole `TurnRequest`.
 * - `profile:<type>`: members of a `defineProfile` call of that type.
 * - `guardrails`: members of a text profile's `guardrails`.
 */
export const SNIPPET_FRAMES = [
	'statements',
	'request',
	'request-object',
	'guardrails',
	'profile:text',
	'profile:image',
	'profile:speech',
	'profile:live',
	'profile:decision',
	'profile:host',
] as const;

/** The fence languages a chapter may use. `ts`, `bash` and `text` are code; the rest are cards. */
export const FENCE_LANGUAGES = [
	'ts',
	'bash',
	'text',
	'note',
	'warning',
	'prompt',
	'playground',
] as const;

/** What an authored chapter and its composed article share. */
export type DocArticleHead = {
	slug: DocSection;
	/** YYYY-MM-DD of the last edit to this chapter. `npm run lint:docs` fails when the file changes and this does not. */
	updated: string;
	title: string;
	/** Kernel-relative file this chapter opens on GitHub. */
	entry: string;
	/**
	 * Package files and folders (relative to the package root) whose behaviour this chapter
	 * describes. `npm run lint:docs` fails when one changes after the chapter's last review.
	 */
	covers: readonly string[];
	summary: string;
	/** A still from public/imagery at least 16:9 wide. */
	cover: {
		src: string;
		alt: string;
		/** CSS background-position that keeps the still's clouds in frame wherever it is cropped. */
		position: string;
	};
	/** Idle landing card position. */
	suggest?: { rank: 1 | 2 | 3 | 4 };
};

/**
 * A heading and what follows it, up to the next heading. `start` and `end` are offsets into the
 * article's `body`; the slice starts at the heading line.
 */
export type DocSectionEntry = {
	/** The id Astryx `Markdown` renders on the heading. */
	id: string;
	title: string;
	/** Heading depth, 2 to 6. */
	level: number;
	start: number;
	end: number;
};

/** Catalog rows owned by a topic page — rendered as a filterable dictionary. */
export type PageSymbol =
	| { kind: 'field'; id: string; path: string; meta: FieldMeta }
	| {
			kind: 'union-member';
			id: string;
			union: ArrayUnionName;
			value: string;
			doc: string;
	  }
	| { kind: 'trace'; id: string; key: string; label: string; doc: string }
	| { kind: 'lexicon'; id: string; key: string; text: string };

export type DocArticle = Omit<DocArticleHead, 'cover'> & {
	cover: DocArticleHead['cover'] & { filter?: string };
	canonicalPath: string;
	ttrMinutes: number;
	/** The chapter's `updated` day. */
	dateModified: string;
	/** The chapter as Markdown, without its front matter and with every seed fence filled. */
	body: string;
	sections: readonly DocSectionEntry[];
	/** Facet fields, worthy-union members, and the trace or lexicon catalog this topic owns. */
	symbols: readonly PageSymbol[];
};

export type DocTreeNode = {
	id: string;
	label: string;
	slug?: string;
	blockId?: string;
	children: readonly DocTreeNode[];
};

export type DocIndex = {
	articles: readonly DocArticle[];
	tree: readonly DocTreeNode[];
	suggested: readonly { slug: string; rank: 1 | 2 | 3 | 4 }[];
	bySlug: Readonly<Record<string, DocArticle | undefined>>;
	redirects: readonly { from: string; to: string; reason?: string }[];
	/** The /docs landing backdrop. */
	landing: { src: string; position: string; filter?: string };
};

export type ComposeOptions = {
	publicRoot: string;
	/** Kernel checkout; chapter entries resolve against it. */
	kernelRoot: string;
};
