/**
 * The chapters' Markdown sources and the retired URLs. Each chapter is one `.md` file here, named
 * for its section in `DOC_SECTIONS`. Catalog symbols compose into its dictionary: do not paste
 * `FieldMeta.doc` into a chapter.
 */

/** The /docs landing backdrop; position as for a chapter cover. */
export const LANDING_STILL = { src: '/imagery/th30_marigolds.png', position: '75% 73%' };

export const SITE_REDIRECTS = [
	{ from: '/#use', to: '/docs/start', reason: 'home hash retired' },
	{ from: '/#pillars', to: '/docs', reason: 'home hash retired' },
	{ from: '/#overview', to: '/docs', reason: 'home hash retired' },
	{ from: '/#architecture', to: '/docs/modalities#host', reason: 'home hash retired' },
	{ from: '/#playground', to: '/playground', reason: 'home hash retired' },
	{
		from: '/docs/profiles',
		to: '/docs/modalities',
		reason: 'profiles remapped to modalities',
	},
	{
		from: '/docs/providers',
		to: '/docs/models',
		reason: 'providers remapped to models',
	},
	{
		from: '/docs/observability',
		to: '/docs/traces',
		reason: 'observability remapped to traces',
	},
	{ from: '/docs/host', to: '/docs/modalities#host', reason: 'host is a modality' },
	{ from: '/docs/cli', to: '/docs/start', reason: 'cli deferred' },
	{ from: '/docs/ui', to: '/docs/interface', reason: 'ui folded into interface' },
	{ from: '/docs/playground', to: '/playground', reason: 'playground chapter retired' },
] as const;

/** Each chapter's Markdown source, keyed by its path from this folder (`./start.md`). */
export const CHAPTER_SOURCES = import.meta.glob<string>('./*.md', {
	query: '?raw',
	import: 'default',
	eager: true,
});
