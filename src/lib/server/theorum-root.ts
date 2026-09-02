import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Kernel root — always the nested git submodule at `theorum/`. */
export function resolveTheorumRoot(): string {
	const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
	return path.resolve(frontendRoot, 'theorum');
}
