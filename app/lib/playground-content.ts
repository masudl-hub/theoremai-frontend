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

type Section = { id: string; label: string; optional: boolean; types: readonly string[] };

/** The sections of the editor, in the graph’s order. A section’s own branches (bindings, tools) are not listed. */
function sections(): Section[] {
	return PROFILE_GRAPH.filter(
		(facet) => facet.id !== 'modelBinding' && facet.id !== 'toolSpec',
	).map((facet) => ({
		id: facet.id,
		label: facet.label,
		optional: facet.optional,
		types: facet.profileTypes,
	}));
}

function sectionText(section: Section, index: DocIndex): string {
	const slug = FACET_CHAPTER[section.id];
	const summary = slug ? index.bySlug[slug]?.summary : undefined;
	const serves =
		section.types.length === PROFILE_TYPES.length
			? 'every profile type'
			: section.types.map(typeLabel).join(', ');
	const where = `${section.optional ? 'Optional' : 'Always present'}; for ${serves}.`;
	return [summary, where, slug ? `Explained in /docs/${slug}.` : undefined]
		.filter(Boolean)
		.join(' ');
}

export function playgroundDescription(): string {
	return `Build an agent without code: pick a profile type (${PROFILE_TYPES.map(typeLabel).join(', ')}), set its sections, and chat with it live. Export it as ${KERNEL_NAME} source.`;
}

/** Each part of the screen, with what it says, for structured data, th30 and llms.txt. */
export function playgroundParts(index: DocIndex): { id: string; name: string; text: string }[] {
	const list = sections()
		.map((section) => `${section.label}: ${sectionText(section, index)}`)
		.join(' ');
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
		{ id: 'section-list', name: 'Sections', text: list },
		{ id: 'examples', name: 'Examples', text: `Load an example offers ready agents. ${examples}` },
	];
}

export function playgroundMarkdown(index: DocIndex, origin: string): string {
	const parts = playgroundParts(index)
		.map(({ name, text }) => `### ${name}\n\n${text}`)
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
