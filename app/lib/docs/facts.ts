/**
 * Resolve authored DocFact rows from kernel catalogs. No invented copy.
 */

import {
	fieldMeta,
	PROFILE_TYPE_PROTOCOLS,
	PROTOCOL_PROVIDERS,
	type ProfileType,
	type Protocol,
} from '@theoremai/agents/schema';
import { isDocWorthyUnion, worthyUnionValues } from './placement';
import type { DocFact, ResolvedFact } from './schema';
import { unionMemberDoc } from './union-docs';

function pairValue(table: 'PROFILE_TYPE_PROTOCOLS' | 'PROTOCOL_PROVIDERS', key: string): string {
	if (table === 'PROFILE_TYPE_PROTOCOLS') {
		if (!(key in PROFILE_TYPE_PROTOCOLS)) {
			throw new Error(`PROFILE_TYPE_PROTOCOLS has no key ${key}`);
		}
		const protocols = PROFILE_TYPE_PROTOCOLS[key as ProfileType];
		return protocols.length ? protocols.join(', ') : 'none';
	}
	if (!(key in PROTOCOL_PROVIDERS)) {
		throw new Error(`PROTOCOL_PROVIDERS has no key ${key}`);
	}
	return PROTOCOL_PROVIDERS[key as Protocol].join(', ');
}

export function resolveFact(fact: DocFact): ResolvedFact {
	if (fact.from === 'field') {
		const meta = fieldMeta(fact.path);
		if (!meta) throw new Error(`fieldMeta(${fact.path}) is undefined`);
		if (fact.show === 'unset') {
			if (meta.unset === undefined) {
				throw new Error(`fieldMeta(${fact.path}) has no unset`);
			}
			return { id: fact.id, label: fact.label, value: `${meta.unset} (default)` };
		}
		if (fact.show === 'required') {
			if (meta.required === undefined) {
				throw new Error(`fieldMeta(${fact.path}) has no required`);
			}
			return {
				id: fact.id,
				label: fact.label,
				value: meta.required === true ? 'required' : meta.required,
			};
		}
		if (fact.show === 'type') {
			return { id: fact.id, label: fact.label, value: meta.type };
		}
		const types = meta.profileTypes;
		if (!types?.length) {
			throw new Error(`fieldMeta(${fact.path}) has no profileTypes`);
		}
		return { id: fact.id, label: fact.label, value: types.join(', ') };
	}

	if (fact.from === 'union') {
		if (!isDocWorthyUnion(fact.union)) {
			throw new Error(`${fact.union} is not a worthy union`);
		}
		const values = worthyUnionValues(fact.union);
		if (!values.includes(fact.member)) {
			throw new Error(`${fact.union} has no member ${fact.member}`);
		}
		return { id: fact.id, label: fact.label, value: fact.member };
	}

	return { id: fact.id, label: fact.label, value: pairValue(fact.table, fact.key) };
}

export function resolveFacts(items: readonly DocFact[]): ResolvedFact[] {
	return items.map(resolveFact);
}

/** Used when a union fact wants the member sentence, not just the token. */
export function unionFactDoc(union: string, member: string): string {
	if (!isDocWorthyUnion(union)) throw new Error(`${union} is not a worthy union`);
	return unionMemberDoc(union, member);
}
