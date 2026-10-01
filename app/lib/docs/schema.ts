/**
 * Docs data model. Authored chapters and the composed index share these types.
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
	'traces',
	'statuses',
	'runner',
	'interface',
] as const;
export type DocSection = (typeof DOC_SECTIONS)[number];

export const PLAYGROUND_SEED_IDS = ['firstTurn'] as const;
export type PlaygroundSeedId = (typeof PLAYGROUND_SEED_IDS)[number];

/** Schema exports that are closed string arrays — derived, not a hand name list. */
export type ArrayUnionName = {
	[K in keyof typeof SchemaModule]: (typeof SchemaModule)[K] extends readonly string[] ? K : never;
}[keyof typeof SchemaModule];

export type CodeSource =
	| { from: 'seed'; seed: PlaygroundSeedId }
	| { from: 'literal'; lang: 'ts' | 'bash'; code: string };

export type AuthoredBlock =
	| { id: string; kind: 'lede'; text: string }
	| { id: string; kind: 'prose'; title: string; text: string }
	| { id: string; kind: 'code'; title?: string; source: CodeSource }
	/** An image or video from public/; the caption also feeds search and the .md twin. */
	| {
			id: string;
			kind: 'media';
			media: 'image' | 'video';
			src: string;
			alt: string;
			caption?: string;
	  }
	| { id: string; kind: 'callout'; tone: 'note' | 'warn'; text: string }
	/** Copyable prompt for a coding agent. */
	| { id: string; kind: 'agent.paste'; prompt: string }
	| { id: string; kind: 'embed.playground'; seed: PlaygroundSeedId };

/** What an authored chapter and its composed article share. */
export type DocArticleHead = {
	slug: DocSection;
	/** YYYY-MM-DD of the last edit to this chapter. `npm run lint:docs` fails when the file changes and this does not. */
	updated: string;
	title: string;
	/** Kernel-relative file this chapter opens on GitHub. */
	entry: string;
	summary: string;
	/** A still from public/imagery at least 16:9 wide. */
	cover: {
		src: string;
		alt: string;
		/** CSS background-position that keeps the still's clouds in frame wherever it is cropped. */
		position: string;
	};
	/** Idle landing card position. */
	suggest?: { rank: 1 | 2 | 3 | 4; blockId?: string };
	/** Shown as “This page covers” before the body. */
	questions?: readonly { question: string }[];
};

export type DocArticleDef = DocArticleHead & { blocks: readonly AuthoredBlock[] };

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

export type ResolvedBlock =
	| Exclude<AuthoredBlock, { kind: 'code' | 'media' }>
	| (Extract<AuthoredBlock, { kind: 'media' }> & {
			/** Exposure match as a CSS filter; compose sets it for public/imagery stills only. */
			filter?: string;
	  })
	| {
			id: string;
			kind: 'code';
			title?: string;
			lang: 'ts' | 'bash';
			code: string;
			source: CodeSource;
	  };

export type DocArticle = Omit<DocArticleHead, 'cover'> & {
	cover: DocArticleHead['cover'] & { filter?: string };
	questions: readonly { question: string }[];
	canonicalPath: string;
	ttrMinutes: number;
	/** The chapter's `updated` day. */
	dateModified: string;
	blocks: readonly ResolvedBlock[];
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
	suggested: readonly { slug: string; blockId?: string; rank: 1 | 2 | 3 | 4 }[];
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
