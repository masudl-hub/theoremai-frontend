import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} candidate */
function isTheorumRoot(candidate) {
	return existsSync(path.join(candidate, 'mod.ts'));
}

/**
 * Nested submodule copies go stale. Refuse them when they still expose
 * pre-slot vault ids (`freeA`) or Gemini-named slot constants so hosts cannot
 * silently compile against an obsolete kernel while a sibling checkout exists.
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
 * Prefers the sibling clone at ../theorum (local side-by-side layout),
 * then falls back to the nested git submodule at ./theorum — but only when
 * that submodule is not detectably stale.
 */
export function resolveTheorumRoot(frontendRoot = FRONTEND_ROOT) {
	const sibling = path.resolve(frontendRoot, '../theorum');
	const nested = path.resolve(frontendRoot, 'theorum');

	if (isTheorumRoot(sibling)) {
		const stale = theorumStaleReason(sibling);
		if (stale) {
			throw new Error(
				`Sibling theorum at ${sibling} looks stale: ${stale}\n` +
					'Update the sibling checkout before running the frontend.',
			);
		}
		return { root: sibling, source: 'sibling' };
	}

	if (isTheorumRoot(nested)) {
		const stale = theorumStaleReason(nested);
		if (stale) {
			throw new Error(
				`Nested theorum submodule at ${nested} is not authoritative and is stale: ${stale}\n` +
					`Clone or update the sibling kernel at ${sibling} (preferred), or bump the submodule to a revision with slotA/slotB/slotC vault ids.\n` +
					'See README.md § Kernel checkout.',
			);
		}
		return { root: nested, source: 'submodule' };
	}

	throw new Error(
		'Could not find theorum kernel.\n' +
			`  checked sibling: ${sibling}\n` +
			`  checked submodule: ${nested}\n` +
			'Clone theorum next to theorum-frontend, or run: npm run theorum:sync',
	);
}

export { FRONTEND_ROOT };
