import { readdirSync } from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set(['built', 'node_modules']);

/** Every `.ts`, `.tsx` and `.md` file under `dir`, past generated output: where a still can be named. */
export function* appSources(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (SKIP_DIRS.has(entry.name)) continue;
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* appSources(file);
		else if (/\.(tsx?|md)$/.test(entry.name)) yield file;
	}
}
