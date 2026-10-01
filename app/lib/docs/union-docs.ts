/**
 * Member docs for worthy unions, from fieldMeta.optionDescriptions.
 * PROFILE_TYPES has no optionDescriptions in the kernel yet, so its member
 * sentence is composed from PROFILE_TYPE_PROTOCOLS, PROFILE_GRAPH pins and
 * the host clause on fieldMeta('type').doc. Do not invent product copy.
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

function optionDescriptionsFor(values: readonly string[]): Record<string, string> | undefined {
	for (const meta of [...Object.values(PROFILE_FIELDS), ...Object.values(EXTRA_FIELDS)]) {
		const options = meta.options;
		if (!options || !meta.optionDescriptions || options.length !== values.length) continue;
		if (values.every((value) => options.includes(value))) return meta.optionDescriptions;
	}
	return undefined;
}

function hostClauseFromTypeDoc(): string {
	const doc = fieldMeta('type')?.doc ?? '';
	const clause = /(?:^|[,\s])host\s*\(([^)]+)\)/i.exec(doc)?.[1]?.trim();
	if (!clause) throw new Error("fieldMeta('type').doc has no host (…) clause to project");
	return clause.charAt(0).toUpperCase() + clause.slice(1) + (clause.endsWith('.') ? '' : '.');
}

function profileTypeDoc(type: ProfileType): string {
	const fromField = fieldMeta('type')?.optionDescriptions?.[type];
	if (fromField) return fromField;
	if (type === 'host') return hostClauseFromTypeDoc();
	const protocols = `Legal protocols: ${PROFILE_TYPE_PROTOCOLS[type].join(', ')}.`;
	const pin = PROFILE_GRAPH.find((facet) => facet.id === type && facet.profilePath === type);
	return pin ? `Type-scoped pins live on ${pin.profilePath}. ${protocols}` : protocols;
}

export function unionMembers(union: DocWorthyUnion): readonly { value: string; doc: string }[] {
	const values = UNION_SECTION[union].values;
	if (union === 'PROFILE_TYPES') {
		return values.map((value) => ({ value, doc: profileTypeDoc(value as ProfileType) }));
	}
	const descriptions = optionDescriptionsFor(values);
	return values.map((value) => {
		const doc = descriptions?.[value];
		if (!doc) throw new Error(`${union} member ${value} has no optionDescriptions`);
		return { value, doc };
	});
}
