/**
 * Playground field widgets derive options from kernel `fieldMeta` only.
 * Playground policy (free-tier keys) lives in playground-policy.ts — not here.
 */
import { fieldMeta } from 'theorum/schema';

export type SelectOption = { value: string; label: string };

const DEFAULT_OMIT_LABEL = '(omit — provider default)';

/** Closed enum: kernel `fieldMeta.type` is a union and `options` is set. */
export function isClosedEnumField(path: string): boolean {
	const meta = fieldMeta(path);
	if (!meta?.options?.length) return false;
	return meta.type.includes('|');
}

/** Select options for closed enum profile fields. */
export function fieldSelectOptions(
	path: string,
	opts?: { allowOmit?: boolean; omitLabel?: string },
): SelectOption[] {
	const meta = fieldMeta(path);
	if (!meta?.options?.length || !isClosedEnumField(path)) return [];
	const options = meta.options.map((value) => ({ value, label: value }));
	if (opts?.allowOmit) {
		return [{ value: '', label: opts.omitLabel ?? DEFAULT_OMIT_LABEL }, ...options];
	}
	return options;
}

/**
 * Suggested vocabulary for open `string` fields (e.g. live.voice).
 * Kernel still accepts any string — use with `<datalist>`, not a closed select.
 */
export function fieldVocabulary(path: string): readonly string[] {
	const meta = fieldMeta(path);
	if (!meta?.options?.length || isClosedEnumField(path)) return [];
	return meta.options;
}
