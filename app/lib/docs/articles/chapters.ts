/**
 * The chapters' Markdown sources and the retired URLs. Each chapter is one `.md` file here, named
 * for its section in `DOC_SECTIONS`. Catalog symbols compose into the glossary, the last chapter:
 * do not paste `FieldMeta.doc` into a chapter.
 */

export const SITE_REDIRECTS = [
	{ from: '/#use', to: '/docs/start', reason: 'home hash retired' },
	{ from: '/#pillars', to: '/docs', reason: 'home hash retired' },
	{ from: '/#architecture', to: '/docs/start/architecture', reason: 'home hash retired' },
	{ from: '/#playground', to: '/docs/studio', reason: 'home hash retired' },
	{ from: '/docs/modalities', to: '/docs/profiles', reason: 'modalities mapped to profiles' },
	{ from: '/docs/identity', to: '/docs/profiles/text', reason: 'identity mapped to text profiles' },
	{ from: '/docs/models', to: '/docs/providers', reason: 'models mapped to providers' },
	{ from: '/docs/inputs', to: '/docs/profiles/text', reason: 'inputs mapped to text profiles' },
	{ from: '/docs/outputs', to: '/docs/profiles/text', reason: 'outputs mapped to text profiles' },
	{
		from: '/docs/turn-behaviour',
		to: '/docs/profiles/resumption',
		reason: 'turn-behaviour mapped to resumption',
	},
	{ from: '/docs/statuses', to: '/docs/profiles/labels', reason: 'statuses mapped to labels' },
	{ from: '/docs/traces', to: '/docs/observability', reason: 'traces mapped to observability' },
	{ from: '/docs/runner', to: '/docs/profiles/host', reason: 'runner mapped to host profiles' },
	{ from: '/docs/interface', to: '/docs/web', reason: 'interface mapped to web' },
	{ from: '/docs/host', to: '/docs/profiles/host', reason: 'host is a profile' },
	{ from: '/docs/cli', to: '/docs/observability/cli', reason: 'cli mapped to observability/cli' },
	{ from: '/docs/ui', to: '/docs/web/astryx', reason: 'ui folded into astryx' },
	{ from: '/docs/playground', to: '/docs/studio', reason: 'playground mapped to studio' },
] as const;

/** Each chapter's Markdown source, keyed by its path from this folder (`./start.md` or `./start/architecture.md`). */
export const CHAPTER_SOURCES = import.meta.glob<string>('./**/*.md', {
	query: '?raw',
	import: 'default',
	eager: true,
});
