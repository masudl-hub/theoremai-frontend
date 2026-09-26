/**
 * Member docs for worthy unions. Prefer fieldMeta.optionDescriptions.
 * PROFILE_TYPES has no optionDescriptions in the kernel yet — compose the
 * member sentence from PROFILE_TYPE_PROTOCOLS + PROFILE_GRAPH pins + the
 * host clause already on fieldMeta('type').doc. Do not invent product copy.
 */

import {
	EXTRA_FIELDS,
	type FieldMeta,
	fieldMeta,
	PROFILE_FIELDS,
	PROFILE_GRAPH,
	PROFILE_TYPE_PROTOCOLS,
	type ProfileType,
} from '@theoremai/agents/schema';
import { type DocWorthyUnion, worthyUnionValues } from './placement';

function allFieldMeta(): FieldMeta[] {
	return [...Object.values(PROFILE_FIELDS), ...Object.values(EXTRA_FIELDS)];
}

function optionDescriptionsFor(values: readonly string[]): Record<string, string> | undefined {
	for (const meta of allFieldMeta()) {
		if (!meta.options || !meta.optionDescriptions) continue;
		if (meta.options.length !== values.length) continue;
		if (values.every((value) => meta.options?.includes(value))) {
			return meta.optionDescriptions;
		}
	}
	return undefined;
}

function hostClauseFromTypeDoc(): string {
	const doc = fieldMeta('type')?.doc;
	if (!doc) throw new Error("fieldMeta('type') is missing");
	const host = /host\s*=\s*([^.]+\.)/i.exec(doc);
	if (!host?.[1]) {
		throw new Error("fieldMeta('type').doc has no host = … clause to project");
	}
	return host[1].trim();
}

function profileTypeDoc(type: ProfileType): string {
	if (type === 'host') return hostClauseFromTypeDoc();
	const protocols = PROFILE_TYPE_PROTOCOLS[type];
	const protocolFact =
		protocols.length === 0 ? 'Binds no protocol.' : `Legal protocols: ${protocols.join(', ')}.`;
	const pin = PROFILE_GRAPH.find((facet) => facet.id === type && facet.profilePath === type);
	if (pin) return `Type-scoped pins live on ${pin.profilePath}. ${protocolFact}`;
	if (type === 'text') return `No type-scoped pin facet. ${protocolFact}`;
	throw new Error(`Cannot derive a catalog sentence for PROFILE_TYPES member ${type}`);
}

export function unionMemberDoc(union: DocWorthyUnion, member: string): string {
	const values = worthyUnionValues(union);
	if (!values.includes(member)) {
		throw new Error(`${union} has no member ${member}`);
	}
	if (union === 'PROFILE_TYPES') {
		const fromField = fieldMeta('type')?.optionDescriptions?.[member];
		if (fromField) return fromField;
		return profileTypeDoc(member as ProfileType);
	}
	const descriptions = optionDescriptionsFor(values);
	const doc = descriptions?.[member];
	if (!doc) {
		throw new Error(`${union} member ${member} has no optionDescriptions`);
	}
	return doc;
}

export function unionMembers(union: DocWorthyUnion): readonly { value: string; doc: string }[] {
	return worthyUnionValues(union).map((value) => ({
		value,
		doc: unionMemberDoc(union, value),
	}));
}
