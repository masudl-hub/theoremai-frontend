/**
 * Docs data model. Authored overlays and the composed index share these types.
 * Catalog rows are imported at compose time — nothing here copies FieldMeta.doc.
 */

import type * as SchemaModule from '@theoremai/agents/schema';
import type { FieldMeta, ProfileGraphFacetId } from '@theoremai/agents/schema';

export const DOC_KINDS = ['guide', 'reference', 'tutorial', 'concept'] as const;
export type DocKind = (typeof DOC_KINDS)[number];

/** Section ids = the IA tree, not PROFILE_GRAPH. */
export const DOC_SECTIONS = [
	'start',
	'runner',
	'profiles',
	'tools',
	'guardrails',
	'observability',
	'providers',
	'interface',
	'ui',
	'playground',
	'host',
	'cli',
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

export type PairTableName = 'PROFILE_TYPE_PROTOCOLS' | 'PROTOCOL_PROVIDERS';

export type DocFact =
	| {
			id: string;
			label: string;
			from: 'field';
			path: string;
			show: 'unset' | 'required' | 'type' | 'profileTypes';
	  }
	| { id: string; label: string; from: 'union'; union: ArrayUnionName; member: string }
	| { id: string; label: string; from: 'pairs'; table: PairTableName; key: string };

export type DocAction =
	| { kind: 'playground'; seed: PlaygroundSeedId }
	| { kind: 'copy'; blockId: string }
	| { kind: 'open'; slug: string };

export type CodeSource =
	| { from: 'seed'; seed: PlaygroundSeedId }
	| { from: 'readme'; heading: string; nth: number; sha256: string };

export type AuthoredBlock =
	| { id: string; kind: 'lede'; text: string }
	| { id: string; kind: 'prose'; text: string }
	| { id: string; kind: 'media'; media: DocMediaRef }
	| { id: string; kind: 'code'; source: CodeSource }
	| { id: string; kind: 'callout'; tone: 'note' | 'warn'; text: string }
	| { id: string; kind: 'facts'; items: readonly DocFact[] }
	| { id: string; kind: 'catalog.fields'; paths: readonly string[] | { prefix: string } }
	| { id: string; kind: 'catalog.union'; union: ArrayUnionName }
	| { id: string; kind: 'catalog.trace'; group?: string }
	| { id: string; kind: 'catalog.lexicon'; keys?: readonly string[] }
	| { id: string; kind: 'embed.playground'; seed: PlaygroundSeedId };

export type DocBlockKind = AuthoredBlock['kind'];

export type DocHeading = readonly [string, ...string[]];

export type DocPlacement = {
	page: DocSection;
	heading: DocHeading;
};

export type CatalogReplace =
	| { kind: 'catalog.facet'; id: ProfileGraphFacetId }
	| { kind: 'catalog.union'; union: ArrayUnionName }
	| { kind: 'catalog.trace'; group?: string }
	| { kind: 'catalog.lexicon' };

/** Authored overlay only. Generated articles never use this type. */
export type DocArticleDef = {
	id: string;
	slug: string;
	title: string;
	topic: DocSection;
	kind: Exclude<DocKind, 'reference'>;
	summary: string;
	cover?: DocMediaRef;
	suggest?: { rank: 1 | 2 | 3 | 4; blockId?: string };
	tree: { parent?: string; order: number };
	replaces?: CatalogReplace | readonly CatalogReplace[];
	related?: readonly string[];
	actions?: readonly DocAction[];
	faq?: readonly { question: string; answer: string }[];
	blocks: readonly AuthoredBlock[];
};

export type ResolvedFact = { id: string; label: string; value: string };

export type ResolvedFieldRow = { path: string; meta: FieldMeta };

export type ResolvedUnionMember = { value: string; doc: string };

export type ResolvedTraceRow = { key: string; label: string; doc: string };

export type ResolvedLexiconRow = { key: string; defaultText: string };

export type ResolvedBlock =
	| Extract<AuthoredBlock, { kind: 'lede' | 'prose' | 'media' | 'callout' }>
	| { id: string; kind: 'facts'; items: readonly ResolvedFact[] }
	| { id: string; kind: 'fields'; rows: readonly ResolvedFieldRow[] }
	| { id: string; kind: 'union'; name: ArrayUnionName; members: readonly ResolvedUnionMember[] }
	| { id: string; kind: 'trace'; rows: readonly ResolvedTraceRow[] }
	| { id: string; kind: 'lexicon'; rows: readonly ResolvedLexiconRow[] }
	| { id: string; kind: 'code'; lang: 'ts' | 'bash'; code: string; source: CodeSource }
	| { id: string; kind: 'embed.playground'; seed: PlaygroundSeedId };

export type DocArticle = {
	id: string;
	slug: string;
	title: string;
	topic: DocSection;
	kind: DocKind;
	summary: string;
	cover?: DocMediaRef;
	suggest?: { rank: 1 | 2 | 3 | 4; blockId?: string };
	tree: { parent?: string; order: number };
	related: readonly string[];
	actions: readonly DocAction[];
	faq: readonly { question: string; answer: string }[];
	origin: 'authored' | 'catalog';
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
