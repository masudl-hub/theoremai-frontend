/**
 * Compose-time gate. The Vite plugin runs the same function during build.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docsIndexPlugin } from './docs-index-plugin.mjs';
import { resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const theoremai = resolveTheoremaiRoot(repoRoot);
const plugin = docsIndexPlugin({ repoRoot, theoremai });
const loaded = await plugin.load('\0virtual:docs/index');
if (typeof loaded !== 'string' || !loaded.includes('export const docIndex')) {
	throw new Error('docs:compose did not emit virtual:docs/index');
}
console.log('docs:compose ok');
