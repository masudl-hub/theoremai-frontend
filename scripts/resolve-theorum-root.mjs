import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} candidate */
function isTheorumRoot(candidate) {
	return existsSync(path.join(candidate, 'mod.ts'));
}

/**
 * Refuse a checkout that still exposes pre-slot vault ids (`freeA`) or
 * Gemini-named slot constants so hosts cannot silently compile against an
 * obsolete kernel.
 *
 * @param {string} candidate
 * @returns {string | null} human-readable reason when stale, else null
 */
export function theorumStaleReason(candidate) {
	const schemaPath = path.join(candidate, 'src/kernel/schema.ts');
	if (!existsSync(schemaPath)) {
		return `missing ${schemaPath}`;
	}
	const schema = readFileSync(schemaPath, 'utf8');
	if (schema.includes("'freeA'") || schema.includes('"freeA"') || schema.includes('GEMINI_FREE_BUCKETS')) {
		return 'schema still defines freeA / GEMINI_FREE_BUCKETS (pre-slot vault vocabulary)';
	}
	const liveMod = path.join(candidate, 'src/providers/google/live/mod.ts');
	if (existsSync(liveMod)) {
		const live = readFileSync(liveMod, 'utf8');
		if (live.includes('createGoogleLiveProvider')) {
			return 'live module still exports createGoogleLiveProvider (expected runSession / openGoogleLiveSession)';
		}
	}
	if (!existsSync(path.join(candidate, 'src/kernel/engine/session/mod.ts'))) {
		return 'missing src/kernel/engine/session/mod.ts (runSession door)';
	}
	if (schema.includes('GEMINI_KEY_SLOTS') || schema.includes('GEMINI_SLOTS') || schema.includes('GeminiKeySlot')) {
		return 'schema still uses Gemini-named slot vocabulary (expected KEY_SLOTS / OverflowKeySlot)';
	}
	if (!schema.includes('KEY_SLOTS') || !schema.includes('OVERFLOW_KEY_SLOTS')) {
		return 'schema missing KEY_SLOTS / OVERFLOW_KEY_SLOTS';
	}
	if (schema.includes('ProfileModelSpec') || schema.includes('interface ModelSpec')) {
		return 'schema still defines ProfileModelSpec / ModelSpec (expected flat models + ModelBinding)';
	}
	if (schema.includes('model: field(') && schema.includes('ProfileModelSpec')) {
		return 'schema catalog still documents nested model block (expected models.*. ModelBinding)';
	}
	return null;
}

/**
 * Resolve the kernel checkout the frontend should use.
 * Requires the sibling clone at ../theorum (side-by-side with theorum-frontend).
 */
export function resolveTheorumRoot(frontendRoot = FRONTEND_ROOT) {
	const sibling = path.resolve(frontendRoot, '../theorum');

	if (!isTheorumRoot(sibling)) {
		throw new Error(
			'Could not find theorum kernel.\n' +
				`  expected sibling: ${sibling}\n` +
				'Clone theorum next to theorum-frontend:\n' +
				'  Development/theorum\n' +
				'  Development/theorum-frontend',
		);
	}

	const stale = theorumStaleReason(sibling);
	if (stale) {
		throw new Error(
			`Sibling theorum at ${sibling} looks stale: ${stale}\n` +
				'Update the sibling checkout before running the frontend.',
		);
	}

	return { root: sibling, source: 'sibling' };
}

export { FRONTEND_ROOT };
