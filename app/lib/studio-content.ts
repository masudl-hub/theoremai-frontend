/**
 * What the studio says about itself, built from what it is made of: the kernel's profile
 * graph (its sections, which profile types each serves, which are optional), the docs chapter
 * that explains each section, and the example agents. The page's structured data, meta tags,
 * llms.txt and th30 all read this, so none of them can drift from the editor.
 */
import { PROFILE_GRAPH, PROFILE_TYPES } from '@theoremjs/agents/schema';
import { STUDIO_EXAMPLES } from '@theoremjs/studio/ui/lib/studio-examples.ts';
import type { DocIndex, DocSection, PageSymbol } from './docs/schema';
import { KERNEL, KERNEL_NAME, SITE_NAME } from './home-content';

export const STUDIO_TITLE = 'Studio';

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

/** How the studio's screen works, in the order a visitor meets it. */
const PARTS = [
	{
		name: 'Profile sections',
		text: 'The left side shows a tree of the agent’s sections. The open agent shows the sections its profile type allows. An optional section that the agent does not use is dimmed. Click a dimmed section to add it. The Keys panel holds your API keys. The studio keeps the keys in memory and does not store them. With your keys or a local server, your browser calls the model provider directly. With no keys, a turn runs on the site’s server, with the site’s demo key and only the models the demo allows.',
	},
	{
		name: 'Editor',
		text: 'The middle shows the editor for the selected section. Hover over a field to see its description. An issue marks a problem that stops the agent from running. A button goes to the next issue.',
	},
	{
		name: 'Preview',
		text: 'The right side shows a preview. Chat with the agent there while you build it.',
	},
	{
		name: 'Get code and open in a new tab',
		text: 'The Get code menu has three actions. Download saves every agent as a .zip file of source files. Copy copies every file, each under its path. Copy for LLM copies the files with a brief for an LLM. The files are the shared tools, one module for each agent, the file that registers the agents in order, the route and chat for the agent you chat with, and a README. The Open in a new tab button runs the agent you chat with in its own tab.',
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
		: `these profile types: ${section.types.map(typeLabel).join(', ')}`;
}

function sectionText(section: Section, index: DocIndex): string {
	const slug = FACET_CHAPTER[section.id];
	// A chapter shared by several types (modalities) can't describe one type's section.
	const summary =
		section.types.length === 1
			? `The ${section.label} settings.`
			: slug
				? index.bySlug[slug]?.summary
				: undefined;
	const where = [
		`This section is ${section.optional ? 'optional' : 'required'}.`,
		section.types.length === 1
			? `It applies to ${typeLabel(section.types[0])} agents only.`
			: `It applies to ${servesText(section)}.`,
	].join(' ');
	return [summary, where, slug ? `/docs/${slug} describes it.` : undefined]
		.filter(Boolean)
		.join(' ');
}

function fieldLine(symbol: Extract<PageSymbol, { kind: 'field' }>): string {
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
	return `- \`${symbol.path}\` (${facts.join('; ')}): ${meta.doc}`;
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
			lines.push(fieldLine(symbol));
		}
	}
	return lines;
}

export function studioDescription(): string {
	return `Build an agent without code. Choose a profile type (${PROFILE_TYPES.map(typeLabel).join(', ')}), set its sections, and chat with the agent. Get the agent as ${KERNEL_NAME} source code.`;
}

export type StudioPart = { id: string; name: string; text: string; detail?: string };

/** Each part of the screen, with what it says, for structured data, th30 and llms.txt. `detail` is for Markdown only. */
export function studioParts(index: DocIndex): StudioPart[] {
	const examples = Object.values(STUDIO_EXAMPLES)
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
			text: `An agent has one profile type: ${PROFILE_TYPES.map(typeLabel).join(', ')}. The profile type sets which sections the agent has. /docs/modalities describes each type.`,
		},
		...sections().map((section) => ({
			id: `section-${section.id}`,
			name: `${section.label} section`,
			text: sectionText(section, index),
			detail: sectionFields(section, index).join('\n'),
		})),
		{
			id: 'examples',
			name: 'Examples',
			text: `The Add agent menu adds a blank agent or one of these examples. ${examples}`,
		},
	];
}

export function studioMarkdown(index: DocIndex, origin: string): string {
	const parts = studioParts(index)
		.map(({ name, text, detail }) => `### ${name}\n\n${text}${detail ? `\n\n${detail}` : ''}`)
		.join('\n\n');
	return ['## The studio', '', `${origin}/studio. ${studioDescription()}`, '', parts, ''].join(
		'\n',
	);
}

export function studioJsonLd(index: DocIndex, origin: string): Record<string, unknown> {
	const url = `${origin}/studio`;
	const siteId = `${origin}/#website`;
	const appId = `${url}#app`;
	const description = studioDescription();
	return {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebApplication',
				'@id': appId,
				name: `${SITE_NAME} ${STUDIO_TITLE.toLowerCase()}`,
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
					'Get code as source files',
				],
				isPartOf: { '@id': siteId },
				about: { '@type': 'SoftwareSourceCode', name: KERNEL_NAME, version: KERNEL.version },
			},
			{
				'@type': 'WebPage',
				'@id': `${url}#webpage`,
				url,
				name: `${STUDIO_TITLE} · ${SITE_NAME}`,
				description,
				inLanguage: 'en',
				isPartOf: { '@id': siteId },
				mainEntity: { '@id': appId },
				breadcrumb: {
					'@type': 'BreadcrumbList',
					itemListElement: [
						{ '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${origin}/` },
						{ '@type': 'ListItem', position: 2, name: STUDIO_TITLE, item: url },
					],
				},
				hasPart: studioParts(index).map(({ id, name, text }) => ({
					'@type': 'WebPageElement',
					'@id': `${url}#${id}`,
					name,
					description: text,
				})),
			},
		],
	};
}
