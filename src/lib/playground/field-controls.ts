/**
 * Playground field widgets derive options from kernel `fieldMeta` and `theorum/schema`
 * exports only. Playground policy (free-tier keys) lives in playground-policy.ts.
 */
import {
	coerceSpeechFormat,
	fieldMeta,
	type Protocol,
	speechFormatsForProtocol,
} from 'theorum/schema';

export type SelectOption = { value: string; label: string };

const DEFAULT_OMIT_LABEL = '(omit — provider default)';

function parseUnionLiterals(type: string): string[] {
	const out: string[] = [];
	const re = /'([^']+)'/g;
	let match = re.exec(type);
	while (match) {
		out.push(match[1]);
		match = re.exec(type);
	}
	return out;
}

function optionsFromMeta(path: string): readonly string[] {
	const meta = fieldMeta(path);
	if (!meta) return [];
	if (meta.options?.length) return meta.options;
	if (meta.type.includes('|')) return parseUnionLiterals(meta.type);
	return [];
}

/** Closed enum options for a catalog path (`fieldMeta.options` or union literals in `type`). */
export function fieldEnumOptions(
	path: string,
	opts?: { allowOmit?: boolean; omitLabel?: string },
): SelectOption[] {
	const values = optionsFromMeta(path);
	if (!values.length) return [];
	const options = values.map((value) => ({ value, label: value }));
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
	if (!meta?.options?.length) return [];
	if (meta.type.includes('|')) return [];
	return meta.options;
}

/** Closed union exported from `theorum/schema` when no `fieldMeta` path exists. */
export function schemaEnumOptions(
	values: readonly string[],
	opts?: { allowOmit?: boolean; omitLabel?: string },
): SelectOption[] {
	const options = values.map((value) => ({ value, label: value }));
	if (opts?.allowOmit) {
		return [{ value: '', label: opts.omitLabel ?? DEFAULT_OMIT_LABEL }, ...options];
	}
	return options;
}

/** `speech.format` options allowed for the hub protocol (kernel `speechFormatsForProtocol`). */
export function speechFormatOptions(protocol: Protocol): SelectOption[] {
	return schemaEnumOptions(speechFormatsForProtocol(protocol));
}

export { coerceSpeechFormat };
