/**
 * Docs data model. Authored overlays and the composed index share these types.
 * Catalog rows are imported at compose time — nothing here copies FieldMeta.doc.
 */

import type * as SchemaModule from '@theoremai/agents/schema';
import type { FieldMeta } from '@theoremai/agents/schema';

export const DOC_KINDS = ['guide', 'reference', 'tutorial', 'concept'] as const;
export type DocKind = (typeof DOC_KINDS)[number];

/** Section ids = the IA tree, not PROFILE_GRAPH. */
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

export const PLAYGROUND_SEED_IDS = ['liveVoice', 'firstTurn'] as const;
export type PlaygroundSeedId = (typeof PLAYGROUND_SEED_IDS)[number];

export type DocMediaRef = {
	src: string;
	alt: string;
	kind: 'image' | 'video';
	caption?: string;
};

/** Schema exports that are closed string arrays — derived, not a hand name list. */
export type ArrayUnionName = {
	[K in keyof typeof SchemaModule]: (typeof SchemaModule)[K] extends readonly string[] ? K : never;
}[keyof typeof SchemaModule];

export type DocAction =
	| { kind: 'playground'; seed: PlaygroundSeedId }
	| { kind: 'copy'; blockId: string }
	| { kind: 'open'; slug: string };

export type CodeSource =
	| { from: 'seed'; seed: PlaygroundSeedId }
	| { from: 'readme'; heading: string; nth: number; sha256: string }
	| { from: 'literal'; lang: 'ts' | 'bash'; code: string };

export type AuthoredBlock =
	| { id: string; kind: 'lede'; text: string }
	| { id: string; kind: 'prose'; title: string; text: string }
	| { id: string; kind: 'media'; media: DocMediaRef }
	| { id: string; kind: 'code'; title?: string; source: CodeSource }
	| { id: string; kind: 'callout'; tone: 'note' | 'warn'; text: string }
	/** Copyable prompt for a coding agent — not a Banner note. */
	| { id: string; kind: 'agent.paste'; prompt: string }
	| { id: string; kind: 'embed.playground'; seed: PlaygroundSeedId };

/** Authored overlay only. Catalog rows are composed onto `symbols`, not authored blocks. */
export type DocArticleDef = {
	id: string;
	slug: string;
	title: string;
	topic: DocSection;
	/** Kernel-relative file this chapter opens on GitHub. */
	entry: string;
	kind: Exclude<DocKind, 'reference'>;
	summary: string;
	cover?: DocMediaRef;
	suggest?: { rank: 1 | 2 | 3 | 4; blockId?: string };
	actions?: readonly DocAction[];
	/** Shown as “This page answers” before the body. Agreed questions only. */
	questions?: readonly { question: string }[];
	faq?: readonly { question: string; answer: string }[];
	blocks: readonly AuthoredBlock[];
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

export type ResolvedBlock =
	| Extract<AuthoredBlock, { kind: 'lede' | 'prose' | 'media' | 'callout' | 'agent.paste' }>
	| {
			id: string;
			kind: 'code';
			title?: string;
			lang: 'ts' | 'bash';
			code: string;
			source: CodeSource;
	  }
	| { id: string; kind: 'embed.playground'; seed: PlaygroundSeedId };

export type DocArticle = {
	id: string;
	slug: string;
	title: string;
	topic: DocSection;
	entry: string;
	kind: DocKind;
	summary: string;
	cover?: DocMediaRef;
	suggest?: { rank: 1 | 2 | 3 | 4; blockId?: string };
	actions: readonly DocAction[];
	questions: readonly { question: string }[];
	faq: readonly { question: string; answer: string }[];
	canonicalPath: string;
	truth: {
		kernelVersion: string;
		kernelHead: string;
		catalogHash?: string;
	};
	ttrMinutes: number;
	updatedLabel: string;
	/** ISO from `git log -1 --format=%cI` on source files; omitted when git cannot answer. */
	dateModified?: string;
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
};

export type ComposeOptions = {
	kernelVersion: string;
	kernelHead: string;
	kernelDirty: boolean;
	/** slug → ISO commit time of that article's source files. */
	lastmodBySlug?: Readonly<Record<string, string>>;
	publicRoot: string;
	readmePath: string;
};
