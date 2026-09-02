import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} candidate */
function isTheorumRoot(candidate) {
	return existsSync(path.join(candidate, 'mod.ts'));
}

/**
 * Resolve the kernel checkout the frontend should use.
 * Prefers the sibling clone at ../theorum (local side-by-side layout),
 * then falls back to the nested git submodule at ./theorum.
 */
export function resolveTheorumRoot(frontendRoot = FRONTEND_ROOT) {
	const sibling = path.resolve(frontendRoot, '../theorum');
	const nested = path.resolve(frontendRoot, 'theorum');

	if (isTheorumRoot(sibling)) {
		return { root: sibling, source: 'sibling' };
	}
	if (isTheorumRoot(nested)) {
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
