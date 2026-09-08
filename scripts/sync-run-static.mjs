/**
 * Copy the React run SPA into `static/playground/run` for SvelteKit / Pages serve.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(repoRoot, 'apps/run/dist');
const dest = path.join(repoRoot, 'static/playground/run');

if (!existsSync(dist)) {
	console.error(`Missing ${dist} — run apps/run build first`);
	process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(path.dirname(dest), { recursive: true });
cpSync(dist, dest, { recursive: true });
console.log(`synced run SPA → ${path.relative(repoRoot, dest)}`);
