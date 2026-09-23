/**
 * Transport pairing helpers — re-exported from kernel schema.
 * Profile field enums: `$lib/playground/field-controls` (`fieldMeta`).
 */
import {
	isValidProfileProtocol,
	PROTOCOLS as PROTOCOL_VALUES,
	PROVIDERS as PROVIDER_VALUES,
	type ProfileType,
	type Protocol,
	protocolsForProfileType,
} from '@theoremai/agents/schema';
import { fieldEnumOptions } from './field-controls';

export { isValidProfileProtocol, protocolsForProfileType };

function labeled<T extends string>(values: readonly T[]): { value: T; label: T }[] {
	return values.map((value) => ({ value, label: value }));
}

export function protocolsForModality(
	type?: ProfileType | '',
): { value: Protocol; label: Protocol }[] {
	if (!type) return labeled(PROTOCOL_VALUES);
	return labeled(protocolsForProfileType(type));
}

export const PLAYGROUND_PROVIDERS = labeled(PROVIDER_VALUES);

/**
 * Profile archetype cards — labels from kernel profile `type` field catalog.
 * `host` is left out: it has no model to run, so there is nothing to chat with.
 */
export const MODALITY_OPTIONS = fieldEnumOptions('type')
	.filter((opt) => opt.value !== 'host')
	.map((opt) => ({
		value: opt.value as ProfileType,
		label: opt.label,
	}));

/** Custom tool discriminants available in the playground (excludes provider builtins). */
export const PLAYGROUND_TOOL_TYPE_OPTIONS = fieldEnumOptions('registerTool.type').filter(
	(opt) => opt.value !== 'builtin',
);

export const HTTP_METHOD_OPTIONS = fieldEnumOptions('method');

export const TOOL_AUTH_TYPE_OPTIONS = fieldEnumOptions('playground.authType');

export const AUTH_UNAUTHENTICATED_OPTIONS = fieldEnumOptions('auth.onUnauthenticated');

export function toggleList<T extends string>(list: T[], value: T, on: boolean): T[] {
	if (on) return list.includes(value) ? list : [...list, value];
	return list.filter((v) => v !== value);
}
