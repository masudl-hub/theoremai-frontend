/**
 * Facet field ownership. Most specific PROFILE_GRAPH profilePath prefix wins.
 * `ownsFields` adds extra top-level keys. decision.ownsFields: ['inputs'] is a
 * cross-link and does not take the inputs catalog.
 */

import { PROFILE_FIELDS, PROFILE_GRAPH, type ProfileGraphFacetId } from '@theoremjs/agents/schema';

const CROSS_LINK_OWNS: Readonly<Partial<Record<ProfileGraphFacetId, readonly string[]>>> = {
	decision: ['inputs'],
};

function prefixScore(path: string, profilePath: string): number {
	if (path === profilePath) return profilePath.length + 1000;
	if (path.startsWith(`${profilePath}.`) || path.startsWith(`${profilePath}.*`)) {
		return profilePath.length;
	}
	// models.* matches models.foo and models.*.apiId (catalog keys already use *).
	if (profilePath.endsWith('.*')) {
		const stem = profilePath.slice(0, -2);
		if (path === stem) return -1;
		if (path.startsWith(`${stem}.`)) return profilePath.length;
	}
	return -1;
}

type ProfileGraphFacet = (typeof PROFILE_GRAPH)[number];
type Owner = { id: ProfileGraphFacetId; score: number };

/** The higher score wins; a tie keeps the owner already found. */
function better(best: Owner | undefined, next: Owner): Owner {
	return !best || next.score > best.score ? next : best;
}

/** Owner by the most specific profilePath prefix, if any facet matches. */
function prefixOwner(path: string): Owner | undefined {
	let best: Owner | undefined;
	for (const facet of PROFILE_GRAPH) {
		const score = prefixScore(path, facet.profilePath);
		if (score >= 0) best = better(best, { id: facet.id, score });
	}
	return best;
}

/** True when the facet lists `top` in ownsFields and it is not a cross-link. */
function ownsTopField(facet: ProfileGraphFacet, top: string): boolean {
	const extra = facet.ownsFields ?? [];
	const skipped = CROSS_LINK_OWNS[facet.id] ?? [];
	return extra.includes(top) && !skipped.includes(top);
}

function ownerForField(path: string): ProfileGraphFacetId {
	let best = prefixOwner(path);
	const top = path.split('.')[0] ?? path;
	for (const facet of PROFILE_GRAPH) {
		if (ownsTopField(facet, top)) best = better(best, { id: facet.id, score: 500 + top.length });
	}

	if (!best) throw new Error(`No PROFILE_GRAPH owner for field ${path}`);
	return best.id;
}

/** Every PROFILE_FIELDS path under exactly one facet. Throws if a path has no owner. */
export function fieldsByFacet(): Map<ProfileGraphFacetId, string[]> {
	const owned = new Map<ProfileGraphFacetId, string[]>();
	for (const path of Object.keys(PROFILE_FIELDS)) {
		const owner = ownerForField(path);
		owned.set(owner, [...(owned.get(owner) ?? []), path]);
	}
	return owned;
}
