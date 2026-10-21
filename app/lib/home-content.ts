/**
 * What the landing page says, as plain data. The screens render from it and the page's
 * structured data, meta tags and llms.txt are built from it, so none of them can drift.
 * Kernel facts (description, license, version, keywords) come from the package at build time.
 */
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
 * The packages screen's tiles, in its order. Web and React share one, the headless interface: its
 * install command switches between them. `docs` is where the tile's docs link goes.
 */
export const PACKAGE_TILES = [
	{
		id: 'agents',
		title: 'Agents',
		description:
			"The kernel. A `profile` states what an agent may use, accept and return. Every turn runs against it, and what it doesn't state is refused.",
		packages: ['agents'],
		docs: '/docs/start',
	},
	{
		id: 'studio',
		title: 'Studio',
		description:
			'Build, test, demo and evaluate agents in your own project, low-code. Edit a `profile` as a form or as code, then run it beside the editor.',
		packages: ['studio'],
		docs: `${REPO_URL}/blob/main/studio/README.md`,
	},
	{
		id: 'interface',
		title: 'Headless interface',
		description:
			'Web serves a `profile` and reads it in the browser, with no framework. React adds hooks, and ready-made UIs built on Astryx and StyleX.',
		packages: ['web', 'react'],
		docs: '/docs/interface',
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

export type ExampleAction =
	| { kind: 'studio'; href: string }
	| { kind: 'hosted'; href: string; label: string };

/**
 * Whether the showcase screen is on the home page. It is off until there are agents worth showing:
 * the screen, its stop and its mentions are held back, and `#showcase` lands on contribute.
 */
export const SHOWCASE_SHOWN: boolean = false;

/** The first cards on the showcase board. Positions live in examples.css. */
export const EXAMPLES: readonly {
	id: string;
	title: string;
	description: string;
	image: string;
	imageAlt: string;
	action: ExampleAction;
}[] = [
	{
		id: 'concierge',
		title: 'Travel concierge',
		description:
			'Plans a trip from what you tell it and from tickets or notes you attach. It uses tools for weather, places and currency before it answers.',
		image: '/imagery/th30_wildflowerroad.png',
		imageAlt: 'A stone path splitting through a meadow of yellow and pink wildflowers',
		action: { kind: 'studio', href: '/studio' },
	},
	{
		id: 'harbor',
		title: 'Harbor',
		description:
			'The front desk for a shipment on hold. It looks up why the shipment is on hold, and can check the weather and the news at the port. It gives one next step.',
		image: '/imagery/th30_ceruleanshelf.png',
		imageAlt: 'Shallow turquoise water meeting deep blue along a reef shelf',
		action: { kind: 'studio', href: '/studio?seed=firstTurn' },
	},
	{
		id: 'bonsai',
		title: 'Bonsai',
		description:
			'A plant care companion. It identifies a plant from a photo, finds what is wrong, and explains how to look after it.',
		image: '/imagery/th30_terracedgarden.png',
		imageAlt: 'Curved stone terraces of yellow grass set in a green forest',
		action: { kind: 'hosted', href: 'https://askbonsai.xyz', label: 'Open Bonsai' },
	},
];

export const CONTRIBUTE_INTRO =
	'Theorem is open source. We welcome questions, bugs, ideas and code.';

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
		note: 'Set up the repo, run the checks and send a pull request.',
		href: `${REPO_URL}/blob/main/CONTRIBUTING.md`,
		src: '/imagery/th30_farm.png',
		position: '50% 50%',
	},
	{
		id: 'discussions',
		title: 'Join the discussions',
		note: 'Ask questions, share what you build and meet other builders.',
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
	const examples = EXAMPLES.map(({ title, description, action }) => {
		const where = action.kind === 'hosted' ? 'Opens the hosted app.' : 'Opens in the studio.';
		return `${title}: ${description} ${where}`;
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
		...(SHOWCASE_SHOWN
			? [{ id: 'showcase', name: 'Showcase', text: `Built with theorem. ${examples}` }]
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
