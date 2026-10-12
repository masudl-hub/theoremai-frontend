/**
 * The embedding model behind docs search, and the shape of the vectors made with it. The generator
 * (scripts/docs-vectors.mjs) and the browser both read this, so a question and the docs are always
 * embedded by the same model with the same settings.
 */

export const SEARCH_MODEL = {
	id: 'Snowflake/snowflake-arctic-embed-xs',
	/** A fixed commit of the model repo, so the browser never loads different weights than the vectors. */
	revision: 'd8c86521100d3556476a063fc2342036d45c106f',
	dtype: 'q8',
	pooling: 'cls',
	dims: 384,
	/** Put before a question, never before the docs; this model reads questions and passages differently. */
	queryPrefix: 'Represent this sentence for searching relevant passages: ',
} as const;

/**
 * Where the site serves the model's files from, so searching the docs never reaches another host.
 * The files are the model's own layout (`<id>/config.json`, `<id>/onnx/...`) at `revision`; fetch
 * them with `npm run docs:model`.
 */
export const SEARCH_MODEL_DIR = 'docs-search/model';

/** Where the generator writes, and where the site serves them from. */
export const SEARCH_VECTORS_DIR = 'docs-search';
export const SEARCH_MANIFEST_FILE = 'manifest.json';

export type SearchManifest = {
	model: typeof SEARCH_MODEL;
	/** The vectors file next to the manifest: `entries.length` rows of `model.dims` float32 values. */
	vectors: string;
	/** One per row, in row order: the unit it is for, and the hash of the text it was made from. */
	entries: { key: string; hash: string }[];
};

/** The hash of the text a vector was made from, as 64 hex digits. */
export async function passageHash(passage: string): Promise<string> {
	const digest = await globalThis.crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(passage),
	);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Hashes for every passage: the fresh state of the index, to compare with a manifest. */
export async function passageHashes(
	passages: readonly { key: string; passage: string }[],
): Promise<{ key: string; hash: string }[]> {
	return await Promise.all(
		passages.map(async ({ key, passage }) => ({ key, hash: await passageHash(passage) })),
	);
}

/** What differs between a manifest and the index as it is now; empty when the vectors are fresh. */
export function manifestDrift(
	manifest: SearchManifest,
	fresh: readonly { key: string; hash: string }[],
): string[] {
	const problems: string[] = [];
	if (JSON.stringify(manifest.model) !== JSON.stringify(SEARCH_MODEL)) {
		problems.push('the vectors were made with another model or setting');
	}
	const have = new Map(manifest.entries.map((entry) => [entry.key, entry.hash]));
	const want = new Map(fresh.map((entry) => [entry.key, entry.hash]));
	const changed = fresh.filter(
		(entry) => have.has(entry.key) && have.get(entry.key) !== entry.hash,
	);
	const added = fresh.filter((entry) => !have.has(entry.key));
	const removed = manifest.entries.filter((entry) => !want.has(entry.key));
	if (changed.length > 0) problems.push(`${String(changed.length)} changed: ${sample(changed)}`);
	if (added.length > 0) problems.push(`${String(added.length)} new: ${sample(added)}`);
	if (removed.length > 0) problems.push(`${String(removed.length)} gone: ${sample(removed)}`);
	const sameOrder =
		manifest.entries.length === fresh.length &&
		manifest.entries.every((entry, at) => entry.key === fresh[at]?.key);
	if (problems.length === 0 && !sameOrder) problems.push('the entries are in another order');
	return problems;
}

function sample(entries: readonly { key: string }[]): string {
	const names = entries.slice(0, 3).map((entry) => entry.key);
	return entries.length > 3 ? `${names.join(', ')}, …` : names.join(', ');
}
