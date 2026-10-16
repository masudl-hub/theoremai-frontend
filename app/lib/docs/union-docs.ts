/**
 * Member docs for worthy unions, from fieldMeta.optionDescriptions.
 * Do not invent product copy.
 */

import {
	EXTRA_FIELDS,
	fieldMeta,
	PROFILE_FIELDS,
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

function profileTypeDoc(type: ProfileType): string {
	const doc = fieldMeta('profile.type')?.optionDescriptions?.[type];
	if (!doc) throw new Error(`fieldMeta('profile.type') does not describe '${type}'`);
	return doc;
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
