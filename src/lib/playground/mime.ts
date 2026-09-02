import { ATTACHMENT_ACCEPT_MIMES, VOICE_ACCEPT_MIMES } from 'theorum/schema';

/** Kernel-known attachment MIME rules (schema catalog + wildcards). */
export const ATTACHMENT_ACCEPT_OPTIONS = ATTACHMENT_ACCEPT_MIMES.map((value) => ({
	value,
	label: value,
}));

/** Kernel-known voice / audio MIME rules. */
export const VOICE_ACCEPT_OPTIONS = VOICE_ACCEPT_MIMES.map((value) => ({
	value,
	label: value,
}));

export function toggleMime(list: string[], value: string, on: boolean): string[] {
	if (on) {
		return list.includes(value) ? list : [...list, value];
	}
	return list.filter((m) => m !== value);
}
