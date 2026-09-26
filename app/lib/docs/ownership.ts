/**
 * Facet field ownership. Most specific PROFILE_GRAPH profilePath prefix wins.
 * `ownsFields` adds extra top-level keys. decision.ownsFields: ['inputs'] is a
 * cross-link and does not take the inputs catalog.
 */

import { PROFILE_FIELDS, PROFILE_GRAPH, type ProfileGraphFacetId } from '@theoremai/agents/schema';

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

export function ownerForField(path: string): ProfileGraphFacetId {
	let best: { id: ProfileGraphFacetId; score: number } | undefined;
	for (const facet of PROFILE_GRAPH) {
		const score = prefixScore(path, facet.profilePath);
		if (score < 0) continue;
		if (!best || score > best.score) best = { id: facet.id, score };
	}

	const top = path.split('.')[0] ?? path;
	for (const facet of PROFILE_GRAPH) {
		const extra = facet.ownsFields ?? [];
		const skipped = CROSS_LINK_OWNS[facet.id] ?? [];
		if (extra.includes(top) && !skipped.includes(top)) {
			const ownedScore = 500 + top.length;
			if (!best || ownedScore > best.score) best = { id: facet.id, score: ownedScore };
		}
	}

	if (!best) throw new Error(`No PROFILE_GRAPH owner for field ${path}`);
	return best.id;
}

/** Every PROFILE_FIELDS path has exactly one owner. */
export function assertFieldOwnership(): Map<ProfileGraphFacetId, string[]> {
	const owned = new Map<ProfileGraphFacetId, string[]>();
	for (const path of Object.keys(PROFILE_FIELDS)) {
		const owner = ownerForField(path);
		const list = owned.get(owner) ?? [];
		list.push(path);
		owned.set(owner, list);
	}
	return owned;
}

export function fieldsForFacet(id: ProfileGraphFacetId): string[] {
	return [...Object.keys(PROFILE_FIELDS)].filter((path) => ownerForField(path) === id);
}
