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
	TURN_STOP_KINDS,
} from '@theoremjs/agents/schema';
import { AREA_LABEL, type ArrayUnionName, type DocSection, type GlossaryArea } from './schema';

export const FACET_SECTION = {
	identity: 'profiles/text',
	decision: 'profiles/decision',
	models: 'providers',
	modelBinding: 'providers',
	image: 'profiles/image',
	speech: 'profiles/speech',
	live: 'profiles/live',
	tools: 'tools',
	toolSpec: 'tools',
	inputs: 'profiles/text',
	outputs: 'profiles/text',
	turnBehaviour: 'profiles/resumption',
	guardrails: 'guardrails',
	observability: 'observability',
	labels: 'profiles/labels',
} as const satisfies Record<ProfileGraphFacetId, DocSection>;

/** The chapter that explains the fields of a `runTurn` request. */
export const REQUEST_SECTION = 'profiles/host' satisfies DocSection;

/** The chapter that explains each export a builder calls by name. */
export const EXPORT_SECTION = {
	defineProfile: 'profiles',
	registerProfile: 'profiles/host',
	registerTool: 'tools',
	registerStructured: 'profiles/text',
	registerTraceDestination: 'observability/destinations',
	defineProvider: 'providers/defining',
	registerProvider: 'providers/defining',
	runTurn: 'profiles/host',
	runSession: 'profiles/host',
	runDecision: 'profiles/decision',
	invokeTool: 'tools',
	runTool: 'tools',
	compactHistory: 'profiles/compaction',
	takeSlot: 'guardrails',
	releaseSlot: 'guardrails',
	overrideLabels: 'profiles/labels',
	resetLabels: 'profiles/labels',
	TheoremError: 'profiles/host',
} as const satisfies Record<keyof typeof API_EXPORTS, DocSection>;

/** Unions the docs list member by member. Compose throws if a member has no catalog doc. */
export const UNION_SECTION = {
	PROFILE_TYPES: { section: 'profiles', values: PROFILE_TYPES },
	TOOL_LOAD_TIERS: { section: 'tools', values: TOOL_LOAD_TIERS },
	STREAM_MODES: { section: 'profiles/text', values: STREAM_MODES },
	TURN_STOP_KINDS: { section: 'profiles/resumption', values: TURN_STOP_KINDS },
} as const satisfies Partial<
	Record<ArrayUnionName, { section: DocSection; values: readonly string[] }>
>;

export type DocWorthyUnion = keyof typeof UNION_SECTION;

/** The chapter that explains each group of fields the catalog holds outside the profile. */
export const EXTRA_FIELD_SECTION = {
	registerTool: 'tools',
	registerStructured: 'profiles/text',
	decision: 'profiles/decision',
	done: 'profiles/host',
} as const satisfies Record<string, DocSection>;

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
	runTool: 'tools',
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
	done: 'runner',
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

/** The chapter for a field the catalog holds outside the profile; throws when its object has none. */
export function extraFieldSection(path: string): DocSection {
	const head = path.split('.')[0] ?? path;
	if (!(head in EXTRA_FIELD_SECTION)) throw new Error(`${path} has no chapter (${head})`);
	return EXTRA_FIELD_SECTION[head as keyof typeof EXTRA_FIELD_SECTION];
}
