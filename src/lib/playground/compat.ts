/**
 * Protocol/provider pairing and closed unions — re-exported from the kernel
 * schema so playground controls cannot drift from createProvider.
 */
import {
	EGRESS_ON_BLOCK,
	isValidProfileProtocol,
	OVERFLOW_KEY_SLOTS,
	PROFILE_TYPES,
	PROTOCOLS as PROTOCOL_VALUES,
	PROVIDERS as PROVIDER_VALUES,
	type ProfileType,
	type Protocol,
	protocolsForProfileType,
	SCHEMA_ENFORCEMENTS,
	SPEECH_AUDIO_FORMATS,
	TURN_STOP_KINDS as STOP_VALUES,
	STREAM_MODES,
	SUMMARY_MODES,
	THINKING_LEVELS as THINKING_VALUES,
	type ThinkingLevel,
	TOOL_ACCESS,
	TOOL_LOAD_TIERS as TOOL_LOAD_VALUES,
	TOOL_PERMISSION,
	type TurnStopKind,
} from 'theorum';

export type ThinkingLevelValue = ThinkingLevel;

function labeled<T extends string>(values: readonly T[]): { value: T; label: T }[] {
	return values.map((value) => ({ value, label: value }));
}

export function protocolsForModality(
	type?: ProfileType | '',
): { value: Protocol; label: Protocol }[] {
	if (!type) return PLAYGROUND_PROTOCOLS;
	return labeled(protocolsForProfileType(type));
}

export { isValidProfileProtocol, protocolsForProfileType };

const MODALITY_DESCRIPTIONS: Record<ProfileType, { label: string; desc: string }> = {
	text: { label: 'Text', desc: 'Chat & tool execution' },
	image: { label: 'Image', desc: 'Image generation' },
	speech: { label: 'Speech', desc: 'Unary text-to-speech' },
	live: { label: 'Live', desc: 'Bidirectional streaming' },
};

export const MODALITY_OPTIONS: Array<{
	value: ProfileType;
	label: string;
	desc: string;
}> = PROFILE_TYPES.map((type) => ({
	value: type,
	label: MODALITY_DESCRIPTIONS[type].label,
	desc: MODALITY_DESCRIPTIONS[type].desc,
}));

export const PLAYGROUND_PROTOCOLS = labeled(PROTOCOL_VALUES);
export const PLAYGROUND_PROVIDERS = labeled(PROVIDER_VALUES);
export const PLAYGROUND_THINKING_LEVELS = labeled(THINKING_VALUES);
export const PLAYGROUND_TURN_STOP_KINDS: { value: TurnStopKind; label: TurnStopKind }[] =
	labeled(STOP_VALUES);
export const SUMMARY_MODE_OPTIONS = labeled(SUMMARY_MODES);
export const STREAM_MODE_OPTIONS = labeled(STREAM_MODES);
export const SCHEMA_ENFORCEMENT_OPTIONS = labeled(SCHEMA_ENFORCEMENTS);
export const SPEECH_FORMAT_OPTIONS = labeled(SPEECH_AUDIO_FORMATS);
export const ON_BLOCK_OPTIONS = labeled(EGRESS_ON_BLOCK);
export const TOOL_LOAD_TIER_OPTIONS = labeled(TOOL_LOAD_VALUES);
export const TOOL_ACCESS_OPTIONS = labeled(TOOL_ACCESS);
export const TOOL_PERMISSION_OPTIONS = labeled(TOOL_PERMISSION);
/** Overflow vault slots for `model.key` (Google required; OpenRouter optional). */
export const KEY_SLOT_OPTIONS = [
	{ value: '' as const, label: '(omit)' },
	...labeled(OVERFLOW_KEY_SLOTS),
];

export function toggleList<T extends string>(list: T[], value: T, on: boolean): T[] {
	if (on) return list.includes(value) ? list : [...list, value];
	return list.filter((v) => v !== value);
}
