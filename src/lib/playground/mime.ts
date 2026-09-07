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

function isWildcard(rule: string): boolean {
	return rule.endsWith('/*');
}

function mimeMatchesWildcard(mime: string, wildcard: string): boolean {
	if (!isWildcard(wildcard)) return mime === wildcard;
	if (mime === wildcard) return true;
	return mime.startsWith(wildcard.slice(0, -1));
}

/** Whether a MIME rule is active — direct entry or covered by a wildcard in the list. */
export function isMimeSelected(list: string[], value: string): boolean {
	if (list.includes(value)) return true;
	return list.some((rule) => isWildcard(rule) && mimeMatchesWildcard(value, rule));
}

function stripCoveredByWildcard(list: string[], wildcard: string): string[] {
	return list.filter((m) => m === wildcard || !mimeMatchesWildcard(m, wildcard));
}

export function toggleMime(
	list: string[],
	value: string,
	on: boolean,
	catalog: readonly string[],
): string[] {
	if (on) {
		if (isWildcard(value)) {
			const stripped = stripCoveredByWildcard(list, value);
			return stripped.includes(value) ? stripped : [...stripped, value];
		}
		if (isMimeSelected(list, value)) return list;
		return [...list, value];
	}

	if (isWildcard(value)) {
		return list.filter((m) => m !== value);
	}

	const covering = list.find((rule) => isWildcard(rule) && mimeMatchesWildcard(value, rule));
	if (covering) {
		const specifics = catalog.filter((m) => mimeMatchesWildcard(m, covering) && !isWildcard(m));
		const next = list.filter((m) => m !== covering && m !== value);
		for (const mime of specifics) {
			if (mime !== value) next.push(mime);
		}
		return [...new Set(next)];
	}

	return list.filter((m) => m !== value);
}
