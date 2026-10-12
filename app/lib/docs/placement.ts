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
import { AREA_LABEL, type ArrayUnionName, type DocSection, type GlossaryArea } from './schema';

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
	labels: 'statuses',
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
	overrideLabels: 'statuses',
	resetLabels: 'statuses',
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
	overrideLabels: 'labels',
	resetLabels: 'labels',
	TheoremError: 'runner',
} as const satisfies Record<keyof typeof API_EXPORTS, GlossaryArea>;

/**
 * The area of a name whose first segment is not itself an area: a profile section whose area is
 * written differently, and the functions whose fields the catalog names after them.
 */
const HEAD_AREA = {
	providerContinuation: 'models',
	turnBehaviour: 'turn-behaviour',
	registerTool: 'tools',
	registerStructured: 'outputs',
	runTurn: 'runner',
} as const satisfies Record<string, GlossaryArea>;

/** First segments of catalog names that only the studio shows, so the glossary leaves them out. */
const STUDIO_ONLY_HEADS: ReadonlySet<string> = new Set(['studio', 'local']);

export function isStudioOnly(name: string): boolean {
	return STUDIO_ONLY_HEADS.has(name.split('.')[0] ?? '');
}

/** The area a catalog name belongs to: its first segment, which the catalog already makes the object. */
export function areaOfName(name: string): GlossaryArea {
	const head = name.split('.')[0] ?? name;
	const area = head in HEAD_AREA ? HEAD_AREA[head as keyof typeof HEAD_AREA] : head;
	if (!(area in AREA_LABEL)) throw new Error(`${name} names no glossary area (${head})`);
	return area as GlossaryArea;
}
