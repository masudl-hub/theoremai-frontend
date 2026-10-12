/**
 * Member docs for worthy unions, from fieldMeta.optionDescriptions.
 * PROFILE_TYPES has no optionDescriptions in the kernel yet, so its member
 * sentence is composed from PROFILE_TYPE_PROTOCOLS, PROFILE_GRAPH pins and
 * the host clause on fieldMeta('profile.type').doc. Do not invent product copy.
 */

import {
	EXTRA_FIELDS,
	fieldMeta,
	PROFILE_FIELDS,
	PROFILE_GRAPH,
	PROFILE_TYPE_PROTOCOLS,
	type ProfileType,
} from '@theoremjs/agents/schema';
import { type DocWorthyUnion, UNION_SECTION } from './placement';

/** The catalog field that documents `values`, with its descriptions. */
function documentingField(
	values: readonly string[],
): { path: string; descriptions: Record<string, string> } | undefined {
	for (const [path, meta] of [...Object.entries(PROFILE_FIELDS), ...Object.entries(EXTRA_FIELDS)]) {
		const options = meta.options;
		if (!options || !meta.optionDescriptions || options.length !== values.length) continue;
		if (values.every((value) => options.includes(value))) {
			return { path, descriptions: meta.optionDescriptions };
		}
	}
	return undefined;
}

function hostClauseFromTypeDoc(): string {
	const doc = fieldMeta('profile.type')?.doc ?? '';
	const clause = /(?:^|[,\s])host\s*\(([^)]+)\)/i.exec(doc)?.[1]?.trim();
	if (!clause) throw new Error("fieldMeta('profile.type').doc has no host (…) clause to project");
	return clause.charAt(0).toUpperCase() + clause.slice(1) + (clause.endsWith('.') ? '' : '.');
}

function profileTypeDoc(type: ProfileType): string {
	const fromField = fieldMeta('profile.type')?.optionDescriptions?.[type];
	if (fromField) return fromField;
	if (type === 'host') return hostClauseFromTypeDoc();
	const protocols = `Legal protocols: ${PROFILE_TYPE_PROTOCOLS[type].join(', ')}.`;
	const pin = PROFILE_GRAPH.find((facet) => facet.id === type && facet.profilePath === type);
	return pin ? `Type-scoped pins live on ${pin.profilePath}. ${protocols}` : protocols;
}

/** Each member of `union`, named by the field that documents it: `outputs.streaming.mode.sse`. */
export function unionMembers(
	union: DocWorthyUnion,
): readonly { name: string; value: string; doc: string }[] {
	const values = UNION_SECTION[union].values;
	if (union === 'PROFILE_TYPES') {
		return values.map((value) => ({
			name: `profile.type.${value}`,
			value,
			doc: profileTypeDoc(value as ProfileType),
		}));
	}
	const documented = documentingField(values);
	return values.map((value) => {
		const doc = documented?.descriptions[value];
		if (!documented || !doc) throw new Error(`${union} member ${value} has no optionDescriptions`);
		return { name: `${documented.path}.${value}`, value, doc };
	});
}
