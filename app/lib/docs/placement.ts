/**
 * Editorial placement: which chapter heading owns each facet and worthy union.
 * These maps are the only handwritten topology besides SITE_ARTICLES.
 */

import {
	PROFILE_GRAPH,
	PROFILE_TYPES,
	PROTOCOLS,
	PROVIDERS,
	type ProfileGraphFacetId,
	STREAM_MODES,
	TOOL_LOAD_TIERS,
} from '@theoremai/agents/schema';
import type { ArrayUnionName, DocPlacement } from './schema';

/** Unions we nest as headings. Compose throws if a member has no catalog doc. */
export const DOC_WORTHY_UNIONS = [
	'PROFILE_TYPES',
	'PROTOCOLS',
	'PROVIDERS',
	'TOOL_LOAD_TIERS',
	'STREAM_MODES',
] as const satisfies readonly ArrayUnionName[];

export type DocWorthyUnion = (typeof DOC_WORTHY_UNIONS)[number];

const WORTHY_VALUES = {
	PROFILE_TYPES,
	PROTOCOLS,
	PROVIDERS,
	TOOL_LOAD_TIERS,
	STREAM_MODES,
} as const satisfies Record<DocWorthyUnion, readonly string[]>;

export function worthyUnionValues(name: DocWorthyUnion): readonly string[] {
	return WORTHY_VALUES[name];
}

export function isDocWorthyUnion(name: string): name is DocWorthyUnion {
	return (DOC_WORTHY_UNIONS as readonly string[]).includes(name);
}

/**
 * Where each PROFILE_GRAPH facet's fields render. Type-scoped pins nest under
 * profiles#types; shared anatomy sits beside it. Total over ProfileGraphFacetId.
 */
export const FACET_SECTION = {
	identity: { page: 'profiles', heading: ['identity'] },
	decision: { page: 'profiles', heading: ['types', 'decision'] },
	models: { page: 'profiles', heading: ['models'] },
	modelBinding: { page: 'profiles', heading: ['models'] },
	image: { page: 'profiles', heading: ['types', 'image'] },
	speech: { page: 'profiles', heading: ['types', 'speech'] },
	live: { page: 'profiles', heading: ['types', 'live'] },
	tools: { page: 'tools', heading: ['allow'] },
	toolSpec: { page: 'tools', heading: ['register'] },
	inputs: { page: 'profiles', heading: ['inputs'] },
	outputs: { page: 'profiles', heading: ['outputs'] },
	turnBehaviour: { page: 'profiles', heading: ['turn-behaviour'] },
	guardrails: { page: 'guardrails', heading: ['inbound'] },
	observability: { page: 'observability', heading: ['traces'] },
} as const satisfies Record<ProfileGraphFacetId, DocPlacement>;

export const UNION_SECTION = {
	PROFILE_TYPES: { page: 'profiles', heading: ['types'] },
	PROTOCOLS: { page: 'providers', heading: ['pairs'] },
	PROVIDERS: { page: 'providers', heading: ['pairs'] },
	TOOL_LOAD_TIERS: { page: 'tools', heading: ['register'] },
	STREAM_MODES: { page: 'profiles', heading: ['outputs'] },
} as const satisfies Record<DocWorthyUnion, DocPlacement>;

const GRAPH_IDS = new Set(PROFILE_GRAPH.map((facet) => facet.id));

/** Fail closed if the kernel adds a facet we have not placed. */
export function assertFacetPlacementComplete(): void {
	for (const facet of PROFILE_GRAPH) {
		if (!(facet.id in FACET_SECTION)) {
			throw new Error(`FACET_SECTION missing ${facet.id}`);
		}
	}
	for (const id of Object.keys(FACET_SECTION)) {
		if (!GRAPH_IDS.has(id as ProfileGraphFacetId)) {
			throw new Error(`FACET_SECTION has unknown facet ${id}`);
		}
	}
}

export function headingId(heading: readonly string[]): string {
	const last = heading[heading.length - 1];
	if (!last) throw new Error('empty heading');
	return last;
}

/** True when this union block *is* the IA heading, not a nested catalog under one. */
export function unionOwnsHeading(name: DocWorthyUnion, blockId: string): boolean {
	return headingId(UNION_SECTION[name].heading) === blockId;
}
