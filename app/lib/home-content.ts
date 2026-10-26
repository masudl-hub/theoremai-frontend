/**
 * What the landing page says, as plain data. The screens render from it and the page's
 * structured data, meta tags, and llms.txt are built from it, so none of them can drift.
 * Kernel facts (description, license, version, keywords) come from the package at build time.
 */
import {
	COOKBOOKS,
	type CookbookId,
	type CookbookIncludeTag,
	type CookbookTags,
} from '@theoremjs/studio';
import { packageLinks, SITE_PAGES } from '@theoremjs/studio/ui/studio-nav.ts';
import { goalText } from './home-goals';
import { KERNEL_PACKAGE_VERSION } from './kernel-version';
import { ARGUMENT, GOALS, HOME_TAGLINE } from './site-pitch';

const env = import.meta.env as Record<string, unknown>;

function envString(key: string): string {
	const value = env[key];
	return typeof value === 'string' ? value : '';
}

function envRecord(key: string): Readonly<Record<string, string>> {
	const value = env[key];
	return typeof value === 'object' && value !== null ? (value as Record<string, string>) : {};
}

function envList(key: string): readonly string[] {
	const value = env[key];
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string')
		: [];
}

export const SITE_NAME = 'theorem';
export const KERNEL_NAME = '@theoremjs/agents';
export const KERNEL = {
	name: KERNEL_NAME,
	version: KERNEL_PACKAGE_VERSION,
	description: envString('KERNEL_DESCRIPTION'),
	license: envString('KERNEL_LICENSE'),
	keywords: envList('KERNEL_KEYWORDS'),
} as const;

export const REPO_URL = envString('KERNEL_REPOSITORY') || 'https://github.com/masudl-hub/theoremai';
/** The holder the package's LICENSE names. */
export const COPYRIGHT = '© 2026 Orchid AI LLC';
export const DISCORD_URL = 'https://discord.gg/X6RQvSWQ58';
/** What each package's README says to install (read at build time), in the order the switch cycles. */
export const INSTALL_COMMANDS = (
	[
		{ id: 'agents', label: 'Agents' },
		{ id: 'web', label: 'Web' },
		{ id: 'react', label: 'React' },
		{ id: 'studio', label: 'Studio' },
	] as const
).map((pkg) => ({ ...pkg, command: envRecord('KERNEL_INSTALL')[pkg.id] ?? '' }));
export type PackageId = (typeof INSTALL_COMMANDS)[number]['id'];

/**
 * The packages screen's tiles, in its order. Web and React share one, the interface: its
 * install command switches between them. `docs` is where the tile's docs link goes.
 */
export const PACKAGE_TILES = [
	{
		id: 'agents',
		title: 'Agents',
		description:
			"The kernel. An agent's `profile` states what it may use, take in, and return. Every turn is held to it, and anything it leaves out is refused.",
		packages: ['agents'],
		docs: '/docs/start',
	},
	{
		id: 'interface',
		title: 'Interface',
		description:
			'Your agents, headless. `Web` serves them to any framework, or none. `React` builds on it with hooks, and with UIs on Astryx and StyleX.',
		packages: ['web', 'react'],
		docs: '/docs/interface',
	},
	{
		id: 'studio',
		title: 'Studio',
		description:
			'A low-code workspace for agents, in your own project. Build, test, and evaluate an agent and every change to it, as a form or as code.',
		packages: ['studio'],
		docs: `${REPO_URL}/blob/main/studio/README.md`,
	},
] as const satisfies readonly {
	id: string;
	title: string;
	description: string;
	packages: readonly PackageId[];
	docs: string;
}[];
export const PACKAGE_LINKS = packageLinks(KERNEL_NAME, REPO_URL);

export const HEADLINE = [
	{ text: 'What if agentic', claim: false },
	{ text: 'experiences kept', claim: false },
	{ text: 'their promises?', claim: false },
] as const;

export type CookbookAction =
	| { kind: 'studio'; cookbook: CookbookId; href: string }
	| { kind: 'hosted'; href: string; label: string };

/** Whether the cookbook screen is on the home page after packages. */
export const COOKBOOK_SHOWN: boolean = true;

/** @deprecated Prefer `COOKBOOK_SHOWN`. */
export const SHOWCASE_SHOWN = COOKBOOK_SHOWN;

/**
 * A recipe on the cookbook screen: studio cookbooks project `verb` / `tags` /
 * `label` / `description` from `COOKBOOKS`; Bonsai is hosted-only and carries
 * the same shape locally.
 */
export type CookbookRecipe = {
	id: string;
	verb: string;
	kind: 'agent' | 'system';
	label: string;
	description: string;
	tags: CookbookTags;
	image: string;
	imageAlt: string;
	action: CookbookAction;
};

const STUDIO_RECIPE_STILLS: Readonly<
	Record<'research' | 'concierge' | 'architect' | 'decision', { image: string; imageAlt: string }>
> = {
	research: {
		image: '/imagery/th30_blueabyss.png',
		imageAlt: 'A deep blue whirlpool seen from above, clouds at the rim',
	},
	concierge: {
		image: '/imagery/th30_siennadunes.png',
		imageAlt: 'Sienna sand dunes under scattered white clouds',
	},
	architect: {
		image: '/imagery/th30_basaltplanes.png',
		imageAlt: 'Dark basalt planes under patchy snow and low clouds',
	},
	decision: {
		image: '/imagery/th30_marigolds.png',
		imageAlt: 'Golden marigold fields divided by pale paths, clouds overhead',
	},
};

function studioRecipe(id: keyof typeof STUDIO_RECIPE_STILLS): CookbookRecipe {
	const entry = COOKBOOKS[id];
	const still = STUDIO_RECIPE_STILLS[id];
	return {
		id,
		verb: entry.verb,
		kind: entry.kind,
		label: entry.label,
		description: entry.description,
		tags: entry.tags,
		image: still.image,
		imageAlt: still.imageAlt,
		action: { kind: 'studio', cookbook: id, href: `/studio?cookbook=${id}` },
	};
}

/**
 * Paste for a coding agent: names the Theorem cookbook, what the recipe shows
 * how to use (from `COOKBOOKS.teaches`), how to load it, and where to look it
 * up over the docs MCP.
 */
export function cookbookMcpReference(recipe: CookbookRecipe, origin: string): string {
	if (recipe.action.kind !== 'studio') {
		throw new Error(`Cookbook '${recipe.id}' has no studio MCP reference.`);
	}
	const { cookbook } = recipe.action;
	const entry = COOKBOOKS[cookbook];
	const load = /^[A-Za-z_]\w*$/.test(cookbook)
		? `COOKBOOKS.${cookbook}`
		: `COOKBOOKS[${JSON.stringify(cookbook)}]`;
	return [
		`# Theorem cookbook · ${cookbook}`,
		'',
		`${recipe.verb} — ${recipe.label}`,
		'',
		recipe.description,
		'',
		'This recipe shows how to use:',
		...entry.teaches.map((line) => `- ${line}`),
		'',
		'Theorem already has a recipe for this. Load it from `@theoremjs/studio`:',
		'',
		'```ts',
		"import { COOKBOOKS } from '@theoremjs/studio'",
		`const workspace = await ${load}.createWorkspace()`,
		'```',
		'',
		`Studio: ${origin}/studio?cookbook=${cookbook}`,
		`Docs MCP: ${origin}/mcp — search_docs for ${JSON.stringify(recipe.label)}, then read_docs the hits.`,
	].join('\n');
}

/**
 * Fan order is circular: blueabyss (research) and malachite (bonsai) must not sit
 * next to each other when the active recipe peaks in the centre.
 */
export const COOKBOOK_RECIPES: readonly CookbookRecipe[] = [
	studioRecipe('research'),
	studioRecipe('concierge'),
	studioRecipe('architect'),
	{
		id: 'bonsai',
		verb: 'care from a photo',
		kind: 'agent',
		label: 'Bonsai',
		description:
			'Snap a leaf or a pot. Bonsai names the plant, spots what is wrong, and tells you how to bring it back — a full Theorem agent out in the wild.',
		tags: {
			includes: ['text', 'http-tools', 'guardrails'] satisfies readonly CookbookIncludeTag[],
		},
		image: '/imagery/th30_malachite.png',
		imageAlt: 'Turquoise terrace pools set in dense green forest',
		action: { kind: 'hosted', href: 'https://askbonsai.xyz', label: 'Open Bonsai' },
	},
	studioRecipe('decision'),
];

/** @deprecated Prefer `COOKBOOK_RECIPES`. */
export const EXAMPLES = COOKBOOK_RECIPES;

export const CONTRIBUTE_INTRO =
	'Theorem is open source. We welcome questions, bugs, ideas, and code.';

/** Four ways in, each a link. */
export const WAYS = [
	{
		id: 'issue',
		title: 'Raise an issue',
		note: 'Tell us about a bug or an idea. Say what you ran and what happened.',
		href: `${REPO_URL}/issues/new`,
		src: '/imagery/th30_sanddunes.png',
		position: '50% 50%',
	},
	{
		id: 'code',
		title: 'Contribute code',
		note: 'Set up the repo, run the checks, and send a pull request.',
		href: `${REPO_URL}/blob/main/CONTRIBUTING.md`,
		src: '/imagery/th30_farm.png',
		position: '50% 50%',
	},
	{
		id: 'discussions',
		title: 'Join the discussions',
		note: 'Ask questions, share what you build, and meet other builders.',
		href: `${REPO_URL}/discussions`,
		src: '/imagery/th30_cherryblossoms.png',
		position: '50% 50%',
	},
	{
		id: 'security',
		title: 'Report a vulnerability',
		note: 'Report a security problem to us in private. Do not use a public issue.',
		href: `${REPO_URL}/security/advisories/new`,
		src: '/imagery/th30_glacialice.png',
		position: '50% 80%',
	},
] as const;

/** One screen of the landing page: where it lives, and what it says in plain sentences. */
export type HomeScreen = { id: string; name: string; text: string };

const HEADLINE_TEXT = HEADLINE.map(({ text }) => text).join(' ');

export function homeScreens(): readonly HomeScreen[] {
	const goals = GOALS.map(({ title }) => title).join(' ');
	const recipes = COOKBOOK_RECIPES.map(({ label, description, action }) => {
		const open = action.kind === 'hosted' ? `Opens ${action.label}.` : 'Opens in the studio.';
		return `${label}: ${description} ${open}`;
	}).join(' ');
	const ways = WAYS.map(({ title, note }) => `${title}: ${note}`).join(' ');
	const installText = INSTALL_COMMANDS.map(({ label, command }) => `${command} (${label})`).join(
		', ',
	);
	return [
		{
			id: 'landing',
			name: 'Landing',
			text: `${HOME_TAGLINE} Install it with ${installText}. Open the ${SITE_PAGES.map(({ label }) => label).join(' or ')}, or find the package on ${PACKAGE_LINKS.map(({ label }) => label).join(', ')}.`,
		},
		{
			id: 'overview',
			name: 'Overview',
			text: `${HEADLINE_TEXT} ${ARGUMENT} ${goals}`,
		},
		...GOALS.map(({ id, title }) => ({ id, name: title, text: goalText(id) })),
		{
			id: 'packages',
			name: 'Packages',
			text: PACKAGE_TILES.map(
				({ title, description }) => `${title}. ${description.replaceAll('`', '')}`,
			).join(' '),
		},
		...(COOKBOOK_SHOWN
			? [
					{
						id: 'cookbook',
						name: 'Cookbook',
						text: `Made in theorem. ${recipes}`,
					},
				]
			: []),
		{
			id: 'contribute',
			name: 'Contribute',
			text: `Contribute to the theory. ${CONTRIBUTE_INTRO} ${ways}`,
		},
		{
			id: 'start',
			name: 'Get started',
			text: `Ready to keep your promises? Install it with ${installText}. Open the ${SITE_PAGES.map(({ label }) => label).join(' or ')}, or copy a prompt for your coding agent.`,
		},
	];
}

/** The page's own description, for meta tags and the WebPage node. */
export const HOME_DESCRIPTION = KERNEL.description || HOME_TAGLINE;

/** The whole landing page as Markdown, for llms.txt. */
export function homeMarkdown(origin: string): string {
	const screens = homeScreens()
		.map(({ name, text }) => `### ${name}\n\n${text}`)
		.join('\n\n');
	return [
		`# ${SITE_NAME}`,
		'',
		`> ${HOME_DESCRIPTION}`,
		'',
		`- Package: ${KERNEL_NAME} ${KERNEL.version} (${KERNEL.license || 'see repository'})`,
		...INSTALL_COMMANDS.map(({ label, command }) => `- Install ${label}: \`${command}\``),
		...PACKAGE_LINKS.map(({ label, href }) => `- ${label}: ${href}`),
		`- Studio: ${origin}/studio`,
		`- Docs: ${origin}/docs`,
		'',
		'## The landing page',
		'',
		screens,
		'',
	].join('\n');
}

/** Structured data for `/`: the site, who makes it, what it ships, and the page's screens. */
export function homeJsonLd(origin: string): Record<string, unknown> {
	const orgId = `${origin}/#organization`;
	const siteId = `${origin}/#website`;
	const pageId = `${origin}/#webpage`;
	const kernelId = `${origin}/#kernel`;
	return {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'Organization',
				'@id': orgId,
				name: SITE_NAME,
				url: origin,
				logo: `${origin}/favicon.svg`,
				sameAs: [...PACKAGE_LINKS.map(({ href }) => href), DISCORD_URL],
			},
			{
				'@type': 'WebSite',
				'@id': siteId,
				name: SITE_NAME,
				url: origin,
				description: HOME_DESCRIPTION,
				inLanguage: 'en',
				publisher: { '@id': orgId },
			},
			{
				'@type': 'SoftwareSourceCode',
				'@id': kernelId,
				name: KERNEL_NAME,
				description: KERNEL.description,
				version: KERNEL.version,
				license: KERNEL.license ? `https://spdx.org/licenses/${KERNEL.license}.html` : undefined,
				codeRepository: REPO_URL,
				programmingLanguage: 'TypeScript',
				runtimePlatform: ['Node.js', 'Deno'],
				keywords: KERNEL.keywords.join(', '),
				url: origin,
				author: { '@id': orgId },
			},
			{
				'@type': 'WebPage',
				'@id': pageId,
				url: origin,
				name: SITE_NAME,
				description: HOME_DESCRIPTION,
				inLanguage: 'en',
				isPartOf: { '@id': siteId },
				about: { '@id': kernelId },
				primaryImageOfPage: `${origin}${GOALS[0].src}`,
				hasPart: homeScreens().map(({ id, name, text }) => ({
					'@type': 'WebPageElement',
					'@id': `${origin}/#${id}`,
					name,
					description: text,
					url: id === 'landing' ? origin : `${origin}/#${id}`,
				})),
			},
		],
	};
}
