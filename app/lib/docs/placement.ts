/**
 * Editorial placement: which chapter explains each facet's fields and each worthy union's
 * members. The glossary lists them all, and gives each row an area, the domain it belongs to.
 */

import {
	type API_EXPORTS,
	PROFILE_TYPES,
	type ProfileGraphFacetId,
	STREAM_MODES,
	TOOL_LOAD_TIERS,
} from '@theoremjs/agents/schema';
import type { ArrayUnionName, DocSection, GlossaryArea } from './schema';

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

/** The chapter that explains the fields of a `runTurn` request. */
export const REQUEST_SECTION = 'runner' satisfies DocSection;

/** The chapter that explains each export a builder calls by name. */
export const EXPORT_SECTION = {
	defineProfile: 'modalities',
	registerProfile: 'runner',
	registerTool: 'tools',
	registerStructured: 'outputs',
	registerTraceDestination: 'traces',
	defineProvider: 'models',
	registerProvider: 'models',
	runTurn: 'runner',
	runSession: 'runner',
	runDecision: 'runner',
	invokeTool: 'runner',
	compactHistory: 'runner',
	takeSlot: 'guardrails',
	releaseSlot: 'guardrails',
	overrideLexicon: 'statuses',
	resetLexicon: 'statuses',
	TheoremError: 'runner',
} as const satisfies Record<keyof typeof API_EXPORTS, DocSection>;

/** Unions the docs list member by member. Compose throws if a member has no catalog doc. */
export const UNION_SECTION = {
	PROFILE_TYPES: { section: 'modalities', values: PROFILE_TYPES },
	TOOL_LOAD_TIERS: { section: 'tools', values: TOOL_LOAD_TIERS },
	STREAM_MODES: { section: 'outputs', values: STREAM_MODES },
} as const satisfies Partial<
	Record<ArrayUnionName, { section: DocSection; values: readonly string[] }>
>;

export type DocWorthyUnion = keyof typeof UNION_SECTION;

/** The area of each profile section's fields. */
export const FACET_AREA = {
	identity: 'identity',
	decision: 'decision',
	models: 'models',
	modelBinding: 'models',
	image: 'image',
	speech: 'speech',
	live: 'live',
	tools: 'tools',
	toolSpec: 'tools',
	inputs: 'inputs',
	outputs: 'outputs',
	turnBehaviour: 'turn-behaviour',
	guardrails: 'guardrails',
	observability: 'observability',
	wording: 'labels',
} as const satisfies Record<ProfileGraphFacetId, GlossaryArea>;

/** The area of each export: the domain it acts on. */
export const EXPORT_AREA = {
	defineProfile: 'profile',
	registerProfile: 'profile',
	registerTool: 'tools',
	registerStructured: 'outputs',
	registerTraceDestination: 'observability',
	defineProvider: 'providers',
	registerProvider: 'providers',
	runTurn: 'runner',
	runSession: 'runner',
	runDecision: 'runner',
	invokeTool: 'tools',
	compactHistory: 'runner',
	takeSlot: 'guardrails',
	releaseSlot: 'guardrails',
	overrideLexicon: 'labels',
	resetLexicon: 'labels',
	TheoremError: 'runner',
} as const satisfies Record<keyof typeof API_EXPORTS, GlossaryArea>;

/** The area of each union's members. */
export const UNION_AREA = {
	PROFILE_TYPES: 'profile',
	TOOL_LOAD_TIERS: 'tools',
	STREAM_MODES: 'outputs',
} as const satisfies Record<keyof typeof UNION_SECTION, GlossaryArea>;

/** The profile's own top-level fields, which belong to no section. */
export const PROFILE_FIELD_AREA = { id: 'profile', type: 'profile' } as const;

/**
 * Catalog rows the glossary leaves out because only the studio shows them: its local-model
 * connection, and the editor's per-tool test fields. A builder never sets them.
 */
export const STUDIO_ONLY_PREFIXES = ['studio.', 'local.'] as const;

/** The area of an extra catalog row that no profile section owns. */
export function extraFieldArea(path: string): GlossaryArea {
	if (path === 'decision.questions.type') return 'decision';
	if (path === 'registerStructured.jsonSchema') return 'outputs';
	return 'tools';
}
