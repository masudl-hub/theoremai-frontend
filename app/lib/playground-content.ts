/**
 * What the playground says about itself, built from what it is made of: the kernel's profile
 * graph (its sections, which profile types each serves, which are optional), the docs chapter
 * that explains each section, and the example agents. The page's structured data, meta tags,
 * llms.txt and th30 all read this, so none of them can drift from the editor.
 */
import { PROFILE_GRAPH, PROFILE_TYPES } from '@theoremjs/agents/schema';
import type { DocIndex, DocSection } from './docs/schema';
import { KERNEL, KERNEL_NAME, SITE_NAME } from './home-content';

export const PLAYGROUND_TITLE = 'Playground';

/** The docs chapter that explains each profile section. A section with none is not linked. */
const FACET_CHAPTER: Partial<Record<string, DocSection>> = {
	identity: 'identity',
	models: 'models',
	modelBinding: 'models',
	tools: 'tools',
	inputs: 'inputs',
	outputs: 'outputs',
	turnBehaviour: 'turn-behaviour',
	guardrails: 'guardrails',
	observability: 'traces',
	wording: 'statuses',
	image: 'modalities',
	speech: 'modalities',
	live: 'modalities',
	decision: 'modalities',
};

/** The ready agents "Load an example" offers. */
export const PLAYGROUND_EXAMPLES = {
	concierge: {
		label: 'Travel concierge',
		description: 'Text agent with weather, places, currency and trip tools.',
	},
	'live-concierge': {
		label: 'Live concierge',
		description: 'The concierge as a voice call, with the same tools.',
	},
	architect: {
		label: 'Code architect',
		description: 'Reads repos and docs. Brings a Narrator it calls for audio.',
	},
	narrator: { label: 'Narrator', description: 'Reads a script aloud.' },
	console: { label: 'Tool console', description: 'No model. Run its tools by hand.' },
	decision: {
		label: 'Jev decision',
		description: 'Checks tool calls with the Jev decision model.',
	},
} as const;

/** How the playground's screen works, in the order a visitor meets it. */
const PARTS = [
	{
		name: 'Profile sections',
		text: 'On the left, a tree of the agent’s settings. Each open agent lists the sections its profile type allows; optional sections it leaves out are dimmed until added. A Keys panel holds the visitor’s own API keys, kept in the browser tab and sent directly to the provider.',
	},
	{
		name: 'Editor',
		text: 'The middle edits the selected section. Hovering a field shows the same documentation as the docs dictionary. Issues the agent must fix before it can run are flagged, with a button to go to the next one.',
	},
	{
		name: 'Preview',
		text: 'The right is a live preview to chat with the agent as it is built, as text, image, speech or a live voice call, depending on the profile type.',
	},
	{
		name: 'Export and launch',
		text: 'Export downloads every agent as a .zip of source files (the shared tools, a module per agent, the file that registers them in order, and the route and chat for the agent being chatted with), copies them, or copies them with a brief for an LLM. Launch opens the agent in its own tab, where the chat fills the panel.',
	},
] as const;

const typeLabel = (type: string) => type.charAt(0).toUpperCase() + type.slice(1);

type Section = {
	id: string;
	label: string;
	optional: boolean;
	types: readonly string[];
	path: string;
	owns: readonly string[];
};

/** The sections of the editor, in the graph’s order. A section’s own branches (bindings, tools) are not listed. */
function sections(): Section[] {
	return PROFILE_GRAPH.filter(
		(facet) => facet.id !== 'modelBinding' && facet.id !== 'toolSpec',
	).map((facet) => ({
		id: facet.id,
		label: facet.label,
		optional: facet.optional,
		types: facet.profileTypes,
		path: facet.profilePath,
		owns: facet.ownsFields ?? [],
	}));
}

function servesText(section: Section): string {
	return section.types.length === PROFILE_TYPES.length
		? 'every profile type'
		: section.types.map(typeLabel).join(', ');
}

function sectionText(section: Section, index: DocIndex): string {
	const slug = FACET_CHAPTER[section.id];
	// A chapter shared by several types (modalities) can't describe one type's section.
	const summary =
		section.types.length === 1
			? `The ${section.label} settings an agent of that type has and no other does.`
			: slug
				? index.bySlug[slug]?.summary
				: undefined;
	const where = `${section.optional ? 'Optional' : 'Always present'}; for ${servesText(section)}.`;
	return [summary, where, slug ? `Explained in /docs/${slug}.` : undefined]
		.filter(Boolean)
		.join(' ');
}

/** The fields a section edits, with the kernel’s own documentation for each. */
function sectionFields(section: Section, index: DocIndex): string[] {
	const seen = new Set<string>();
	const lines: string[] = [];
	for (const article of index.articles) {
		for (const symbol of article.symbols) {
			if (symbol.kind !== 'field' || seen.has(symbol.path)) continue;
			const own =
				symbol.path === section.path ||
				symbol.path.startsWith(`${section.path}.`) ||
				section.owns.includes(symbol.path);
			if (!own) continue;
			seen.add(symbol.path);
			const { meta } = symbol;
			const facts = [
				meta.type,
				meta.required === true
					? 'required'
					: typeof meta.required === 'string'
						? `required ${meta.required}`
						: undefined,
				meta.options?.length && !meta.type.includes(`'${meta.options[0]}'`)
					? `one of ${meta.options.join(', ')}`
					: undefined,
				meta.profileTypes ? `for ${meta.profileTypes.map(typeLabel).join(', ')}` : undefined,
				meta.unset ? `left out: ${meta.unset}` : undefined,
			].filter(Boolean);
			lines.push(`- \`${symbol.path}\` (${facts.join('; ')}): ${meta.doc}`);
		}
	}
	return lines;
}

export function playgroundDescription(): string {
	return `Build an agent without code: pick a profile type (${PROFILE_TYPES.map(typeLabel).join(', ')}), set its sections, and chat with it live. Export it as ${KERNEL_NAME} source.`;
}

type PlaygroundPart = { id: string; name: string; text: string; detail?: string };

/** Each part of the screen, with what it says, for structured data, th30 and llms.txt. `detail` is for Markdown only. */
export function playgroundParts(index: DocIndex): PlaygroundPart[] {
	const examples = Object.values(PLAYGROUND_EXAMPLES)
		.map(({ label, description }) => `${label}: ${description}`)
		.join(' ');
	return [
		...PARTS.map(({ name, text }) => ({
			id: name.toLowerCase().replaceAll(' ', '-'),
			name,
			text,
		})),
		{
			id: 'profile-types',
			name: 'Profile types',
			text: `An agent is one of six types: ${PROFILE_TYPES.map(typeLabel).join(', ')}. The type decides which sections it has. Each is explained in /docs/modalities.`,
		},
		...sections().map((section) => ({
			id: `section-${section.id}`,
			name: `${section.label} section`,
			text: sectionText(section, index),
			detail: sectionFields(section, index).join('\n'),
		})),
		{ id: 'examples', name: 'Examples', text: `Load an example offers ready agents. ${examples}` },
	];
}

export function playgroundMarkdown(index: DocIndex, origin: string): string {
	const parts = playgroundParts(index)
		.map(({ name, text, detail }) => `### ${name}\n\n${text}${detail ? `\n\n${detail}` : ''}`)
		.join('\n\n');
	return [
		'## The playground',
		'',
		`${origin}/playground. ${playgroundDescription()}`,
		'',
		parts,
		'',
	].join('\n');
}

export function playgroundJsonLd(index: DocIndex, origin: string): Record<string, unknown> {
	const url = `${origin}/playground`;
	const siteId = `${origin}/#website`;
	const appId = `${url}#app`;
	const description = playgroundDescription();
	return {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebApplication',
				'@id': appId,
				name: `${SITE_NAME} ${PLAYGROUND_TITLE.toLowerCase()}`,
				url,
				description,
				applicationCategory: 'DeveloperApplication',
				operatingSystem: 'Any',
				browserRequirements: 'Requires JavaScript',
				isAccessibleForFree: true,
				featureList: [
					`Profile types: ${PROFILE_TYPES.map(typeLabel).join(', ')}`,
					...sections().map((section) => section.label),
					'Live preview chat',
					'Export as source files',
				],
				isPartOf: { '@id': siteId },
				about: { '@type': 'SoftwareSourceCode', name: KERNEL_NAME, version: KERNEL.version },
			},
			{
				'@type': 'WebPage',
				'@id': `${url}#webpage`,
				url,
				name: `${PLAYGROUND_TITLE} · ${SITE_NAME}`,
				description,
				inLanguage: 'en',
				isPartOf: { '@id': siteId },
				mainEntity: { '@id': appId },
				breadcrumb: {
					'@type': 'BreadcrumbList',
					itemListElement: [
						{ '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${origin}/` },
						{ '@type': 'ListItem', position: 2, name: PLAYGROUND_TITLE, item: url },
					],
				},
				hasPart: playgroundParts(index).map(({ id, name, text }) => ({
					'@type': 'WebPageElement',
					'@id': `${url}#${id}`,
					name,
					description: text,
				})),
			},
		],
	};
}
