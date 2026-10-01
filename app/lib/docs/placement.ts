/**
 * Editorial placement: which topic owns each facet and worthy union.
 * Catalog rows render as the page dictionary, not interleaved field tables.
 */

import {
	PROFILE_GRAPH,
	PROFILE_TYPES,
	PROTOCOLS,
	PROVIDERS,
	type ProfileGraphFacetId,
	STREAM_MODES,
	TOOL_LOAD_TIERS,
} from '@theoremjs/agents/schema';
import type { ArrayUnionName, DocSection } from './schema';

/** Unions we surface in the topic dictionary. Compose throws if a member has no catalog doc. */
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

/** Topic that owns each PROFILE_GRAPH facet's fields in the page dictionary. */
export const FACET_SECTION = {
	identity: { page: 'identity' },
	decision: { page: 'modalities' },
	models: { page: 'models' },
	modelBinding: { page: 'models' },
	image: { page: 'modalities' },
	speech: { page: 'modalities' },
	live: { page: 'modalities' },
	tools: { page: 'tools' },
	toolSpec: { page: 'tools' },
	inputs: { page: 'inputs' },
	outputs: { page: 'outputs' },
	turnBehaviour: { page: 'turn-behaviour' },
	guardrails: { page: 'guardrails' },
	observability: { page: 'traces' },
	wording: { page: 'statuses' },
} as const satisfies Record<ProfileGraphFacetId, { page: DocSection }>;

export const UNION_SECTION = {
	PROFILE_TYPES: { page: 'modalities' },
	PROTOCOLS: { page: 'models' },
	PROVIDERS: { page: 'models' },
	TOOL_LOAD_TIERS: { page: 'tools' },
	STREAM_MODES: { page: 'outputs' },
} as const satisfies Record<DocWorthyUnion, { page: DocSection }>;

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
