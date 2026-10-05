/**
 * Compose-time gate. The Vite plugin runs the same function during build.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDocs } from './docs-index-plugin.mjs';
import { resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { index } = await loadDocs({ repoRoot, theoremai: resolveTheoremaiRoot(repoRoot) });
console.log(`docs:compose ok (${String(index.articles.length)} chapters)`);
