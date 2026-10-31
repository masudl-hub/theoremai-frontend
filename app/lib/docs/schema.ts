/**
 * Docs data model. A chapter is a Markdown file in `articles/`; compose turns each into a `DocArticle`.
 * Catalog rows are imported at compose time — nothing here copies FieldMeta.doc.
 */

import type * as SchemaModule from '@theoremjs/agents/schema';
import type { ApiExportMeta, FieldMeta } from '@theoremjs/agents/schema';

/** One chapter per section, in this order. The slug is the section id. */
export const DOC_SECTIONS = [
	'start',
	'start/architecture',
	'profiles',
	'profiles/text',
	'profiles/live',
	'profiles/decision',
	'profiles/image',
	'profiles/speech',
	'profiles/transcription',
	'profiles/embedding',
	'profiles/host',
	'profiles/bindings',
	'profiles/compaction',
	'profiles/resumption',
	'profiles/lifecycle',
	'profiles/labels',
	'tools',
	'tools/function',
	'tools/http',
	'tools/mcp',
	'tools/agent',
	'tools/gates',
	'tools/auth',
	'tools/oauth',
	'tools/liquid-labels',
	'guardrails',
	'guardrails/ingress',
	'guardrails/egress',
	'guardrails/network',
	'providers',
	'providers/defining',
	'providers/protocols',
	'providers/checkpoints',
	'observability',
	'observability/destinations',
	'observability/evals',
	'observability/cli',
	'web',
	'web/react-hooks',
	'web/realtime',
	'web/astryx',
	'studio',
	'studio/setup',
	'studio/compiler',
	'studio/embedded',
	'glossary',
] as const;
export type DocSection = (typeof DOC_SECTIONS)[number];

export type DocNavSubgroup = {
	slug: DocSection;
	label?: string;
	children?: readonly DocSection[];
};

export type DocNavGroupItem = DocSection | DocNavSubgroup;

export type DocNavGroup = {
	id: string;
	label: string;
	overview?: DocSection;
	items: readonly DocNavGroupItem[];
};

export const DOC_GROUPS: readonly DocNavGroup[] = [
	{
		id: 'group:start',
		label: 'Getting Started',
		overview: 'start',
		items: ['start', 'start/architecture'],
	},
	{
		id: 'group:profiles',
		label: 'Profiles & Modalities',
		overview: 'profiles',
		items: [
			{
				slug: 'profiles',
				label: 'Overview',
				children: [
					'profiles/text',
					'profiles/live',
					'profiles/decision',
					'profiles/image',
					'profiles/speech',
					'profiles/transcription',
					'profiles/embedding',
					'profiles/host',
				],
			},
			'profiles/bindings',
			'profiles/compaction',
			'profiles/resumption',
			'profiles/lifecycle',
			'profiles/labels',
		],
	},
	{
		id: 'group:tools',
		label: 'Tools & Execution',
		overview: 'tools',
		items: [
			{
				slug: 'tools',
				label: 'Overview',
				children: ['tools/function', 'tools/http', 'tools/mcp', 'tools/agent'],
			},
			'tools/gates',
			{
				slug: 'tools/auth',
				children: ['tools/oauth'],
			},
			'tools/liquid-labels',
		],
	},
	{
		id: 'group:guardrails',
		label: 'Guardrails & Boundaries',
		overview: 'guardrails',
		items: ['guardrails', 'guardrails/ingress', 'guardrails/egress', 'guardrails/network'],
	},
	{
		id: 'group:providers',
		label: 'Providers & Protocols',
		overview: 'providers',
		items: ['providers', 'providers/defining', 'providers/protocols', 'providers/checkpoints'],
	},
	{
		id: 'group:observability',
		label: 'Observability & Evals',
		overview: 'observability',
		items: [
			'observability',
			'observability/destinations',
			'observability/evals',
			'observability/cli',
		],
	},
	{
		id: 'group:web',
		label: 'Headless Web & UI',
		overview: 'web',
		items: ['web', 'web/react-hooks', 'web/realtime', 'web/astryx'],
	},
	{
		id: 'group:studio',
		label: 'Theorem Studio',
		overview: 'studio',
		items: [
			{
				slug: 'studio',
				label: 'Overview',
				children: ['studio/setup', 'studio/compiler', 'studio/embedded'],
			},
		],
	},
	{
		id: 'group:reference',
		label: 'Reference',
		overview: 'glossary',
		items: ['glossary'],
	},
] as const;

export const STUDIO_SEED_IDS = [
	'firstTurn',
	'research',
	'concierge',
	'architect',
	'live-concierge',
	'decision',
	'gemini-embedding-2',
	'narrator',
	'console',
] as const;
export type StudioSeedId = (typeof STUDIO_SEED_IDS)[number];

export function isStudioSeed(value: string | null | undefined): value is StudioSeedId {
	return Boolean(value && (STUDIO_SEED_IDS as readonly string[]).includes(value));
}

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
 * - `tool:<type>`: members of a `registerTool` call of that type.
 * - `models`: a text profile's `models`, where an indented `// ...` stands for a binding's required fields.
 */
export const SNIPPET_FRAMES = [
	'statements',
	'request',
	'request-object',
	'guardrails',
	'profile:text',
	'profile:image',
	'profile:speech',
	'profile:transcription',
	'profile:live',
	'profile:decision',
	'profile:embedding',
	'profile:host',
	'tool:function',
	'tool:http',
	'tool:mcp',
	'tool:agent',
	'models',
] as const;

/**
 * The fence languages a chapter may use. `ts`, `bash` and `text` are code; the rest are cards.
 * A `ts seed=<id>` fence shows that seed's program, and a button that opens it in the studio.
 */
export const FENCE_LANGUAGES = [
	'ts',
	'tsx',
	'bash',
	'text',
	'note',
	'warning',
	'prompt',
	'figure',
	'mermaid',
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
	suggest?: { rank: 1 | 2 | 3 | 4 | 5 | 6 };
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

/** One catalog row, before it is placed in an area. */
export type SymbolRow =
	| { kind: 'field'; id: string; path: string; meta: FieldMeta }
	| { kind: 'request-field'; id: string; path: string; meta: FieldMeta }
	| {
			kind: 'export';
			id: string;
			name: string;
			exported: ApiExportMeta['kind'] | 'type';
			doc: string;
	  }
	| { kind: 'union-member'; id: string; name: string; value: string; doc: string }
	| { kind: 'trace'; id: string; name: string; label: string; doc: string }
	| { kind: 'label'; id: string; name: string; text: string };

/** The domains the glossary sorts its rows by, as a builder thinks of them, and what it calls each. */
export const AREA_LABEL = {
	profile: 'Profile',
	identity: 'Identity',
	models: 'Models',
	providers: 'Providers',
	decision: 'Decision',
	image: 'Image',
	speech: 'Speech',
	live: 'Live',
	tools: 'Tools',
	inputs: 'Inputs',
	outputs: 'Outputs',
	'turn-behaviour': 'Turn behaviour',
	guardrails: 'Guardrails',
	observability: 'Observability',
	labels: 'Labels',
	runner: 'Runner',
} as const;

export type GlossaryArea = keyof typeof AREA_LABEL;

/**
 * A catalog row of the glossary, the one page that lists them all. `area` is the domain it belongs
 * to; `chapter` is the chapter that explains it, per the placement in `placement.ts`.
 */
export type PageSymbol = SymbolRow & { area: GlossaryArea; chapter: DocSection };

/** A catalog row that a chapter's inline code names: its glossary row, and the chapter that explains it. */
export type DocTerm = { symbol: PageSymbol; slug: DocSection; href: string; chapter: string };

export type DocArticle = Omit<DocArticleHead, 'cover'> & {
	cover: DocArticleHead['cover'] & { filter?: string };
	canonicalPath: string;
	ttrMinutes: number;
	/** The chapter's `updated` day. */
	dateModified: string;
	/** The chapter as Markdown, without its front matter and with every seed fence filled. */
	body: string;
	sections: readonly DocSectionEntry[];
	/** The glossary lists every catalog row; every other chapter has none. */
	symbols: readonly PageSymbol[];
	/** The inline-code spans in `body` that name one catalog row, by the span's text. */
	terms: Readonly<Partial<Record<string, DocTerm>>>;
};

/** A chapter as a docs page lists it: everything but its text, which only its own page and search read. */
export type DocArticleCard = Omit<DocArticle, 'body' | 'sections' | 'symbols' | 'terms'>;

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
	suggested: readonly { slug: string; rank: 1 | 2 | 3 | 4 | 5 | 6 }[];
	bySlug: Readonly<Record<string, DocArticle | undefined>>;
	redirects: readonly { from: string; to: string; reason?: string }[];
};

/**
 * What every docs page carries: the chapter tree and each chapter's card. Search fetches the
 * whole index the first time it is used, so a page does not ship every chapter's text.
 */
export type DocShell = {
	tree: DocIndex['tree'];
	articles: readonly DocArticleCard[];
};

export type ComposeOptions = {
	publicRoot: string;
	/** Kernel checkout; chapter entries resolve against it. */
	kernelRoot: string;
};
