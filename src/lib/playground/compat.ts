/**
 * Protocol/provider pairing and closed unions — re-exported from the kernel
 * schema so playground controls cannot drift from createProvider.
 */
import {
	coerceProtocol,
	coerceProvider,
	EGRESS_ON_BLOCK,
	GEMINI_FREE_BUCKETS,
	PROTOCOLS as PROTOCOL_VALUES,
	PROVIDERS as PROVIDER_VALUES,
	type Protocol,
	type Provider,
	providersFor,
	SCHEMA_ENFORCEMENTS,
	SPEECH_AUDIO_FORMATS,
	TURN_STOP_KINDS as STOP_VALUES,
	STREAM_MODES,
	SUMMARY_MODES,
	THINKING_LEVELS as THINKING_VALUES,
	type ThinkingLevel,
} from '@theorum/schema';

export type { Protocol, Provider };
export type ThinkingLevelValue = ThinkingLevel;

function labeled<T extends string>(values: readonly T[]): { value: T; label: T }[] {
	return values.map((value) => ({ value, label: value }));
}

export const PROTOCOLS = labeled(PROTOCOL_VALUES);
export const PROVIDERS = labeled(PROVIDER_VALUES);
export const THINKING_LEVELS = labeled(THINKING_VALUES);
export const TURN_STOP_KINDS = labeled(STOP_VALUES);
export const SUMMARY_MODE_OPTIONS = labeled(SUMMARY_MODES);
export const STREAM_MODE_OPTIONS = labeled(STREAM_MODES);
export const SCHEMA_ENFORCEMENT_OPTIONS = labeled(SCHEMA_ENFORCEMENTS);
export const SPEECH_FORMAT_OPTIONS = labeled(SPEECH_AUDIO_FORMATS);
export const ON_BLOCK_OPTIONS = labeled(EGRESS_ON_BLOCK);
export const GEMINI_KEY_OPTIONS = [
	{ value: '' as const, label: '(omit)' },
	...labeled(GEMINI_FREE_BUCKETS),
];

export { coerceProtocol, coerceProvider, providersFor };

export function toggleList(list: string[], value: string, on: boolean): string[] {
	if (on) return list.includes(value) ? list : [...list, value];
	return list.filter((v) => v !== value);
}
