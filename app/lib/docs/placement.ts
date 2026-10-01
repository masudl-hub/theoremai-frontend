/**
 * Editorial placement: which chapter's dictionary lists each facet's fields
 * and each worthy union's members.
 */

import {
	PROFILE_TYPES,
	PROTOCOLS,
	PROVIDERS,
	type ProfileGraphFacetId,
	STREAM_MODES,
	TOOL_LOAD_TIERS,
} from '@theoremjs/agents/schema';
import type { ArrayUnionName, DocSection } from './schema';

export const FACET_SECTION = {
	identity: 'identity',
	decision: 'modalities',
	models: 'models',
	modelBinding: 'models',
	image: 'modalities',
	speech: 'modalities',
	live: 'modalities',
	tools: 'tools',
	toolSpec: 'tools',
	inputs: 'inputs',
	outputs: 'outputs',
	turnBehaviour: 'turn-behaviour',
	guardrails: 'guardrails',
	observability: 'traces',
	wording: 'statuses',
} as const satisfies Record<ProfileGraphFacetId, DocSection>;

/** Unions the docs list member by member. Compose throws if a member has no catalog doc. */
export const UNION_SECTION = {
	PROFILE_TYPES: { section: 'modalities', values: PROFILE_TYPES },
	PROTOCOLS: { section: 'models', values: PROTOCOLS },
	PROVIDERS: { section: 'models', values: PROVIDERS },
	TOOL_LOAD_TIERS: { section: 'tools', values: TOOL_LOAD_TIERS },
	STREAM_MODES: { section: 'outputs', values: STREAM_MODES },
} as const satisfies Partial<
	Record<ArrayUnionName, { section: DocSection; values: readonly string[] }>
>;

export type DocWorthyUnion = keyof typeof UNION_SECTION;
