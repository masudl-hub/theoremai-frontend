/**
 * What the landing page says, as plain data. The screens render from it and the page's
 * structured data, meta tags and llms.txt are built from it, so none of them can drift.
 * Kernel facts (description, license, version, keywords) come from the package at build time.
 */
import { KERNEL_PACKAGE_VERSION } from './kernel-version';
import { ARGUMENT, GOALS, HOME_TAGLINE } from './site-pitch';

const env = import.meta.env as Record<string, unknown>;

function envString(key: string): string {
	const value = env[key];
	return typeof value === 'string' ? value : '';
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
export const DISCORD_URL = 'https://discord.gg/X6RQvSWQ58';
export const KERNEL_INSTALL_CMD = `npm install ${KERNEL_NAME} zod`;
export const SITE_PAGES = [
	{ label: 'Studio', href: '/studio' },
	{ label: 'Docs', href: '/docs' },
] as const;

export const PACKAGE_LINKS = [
	{ label: 'GitHub', href: REPO_URL },
	{ label: 'JSR', href: `https://jsr.io/${KERNEL_NAME}` },
	{ label: 'npm', href: `https://www.npmjs.com/package/${encodeURIComponent(KERNEL_NAME)}` },
] as const;

export const HEADLINE = [
	{ text: 'Agents are', claim: false },
	{ text: 'probabilistic.', claim: false },
	{ text: 'Your architecture', claim: true },
	{ text: 'shouldn’t be.', claim: true },
] as const;

export type ExampleAction =
	| { kind: 'studio'; href: string }
	| { kind: 'hosted'; href: string; label: string };

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
		id: 'discord',
		title: 'Join the Discord',
		note: 'Ask questions, share what you build and meet other builders.',
		href: DISCORD_URL,
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
	const goals = GOALS.map(({ title, text }) => `${title}: ${text}`).join(' ');
	const examples = EXAMPLES.map(({ title, description, action }) => {
		const where = action.kind === 'hosted' ? 'Opens the hosted app.' : 'Opens in the studio.';
		return `${title}: ${description} ${where}`;
	}).join(' ');
	const ways = WAYS.map(({ title, note }) => `${title}: ${note}`).join(' ');
	return [
		{
			id: 'landing',
			name: 'Landing',
			text: `${HOME_TAGLINE} Install it with ${KERNEL_INSTALL_CMD}. Open the ${SITE_PAGES.map(({ label }) => label).join(' or ')}, or find the package on ${PACKAGE_LINKS.map(({ label }) => label).join(', ')}.`,
		},
		{
			id: 'overview',
			name: 'Overview',
			text: `${HEADLINE_TEXT} ${ARGUMENT} ${goals}`,
		},
		{ id: 'showcase', name: 'Showcase', text: `Built with theorem. ${examples}` },
		{
			id: 'contribute',
			name: 'Contribute',
			text: `Contribute to the theory. ${CONTRIBUTE_INTRO} ${ways}`,
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
		`- Install: \`${KERNEL_INSTALL_CMD}\``,
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

/** Structured data for `/`: the site, who makes it, what it ships, and the page's four screens. */
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
