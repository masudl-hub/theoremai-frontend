/**
 * Write the WebP renditions of every PNG still the site draws (see app/lib/stills.ts). Run after
 * adding or changing a still; `npm run lint:stills` and the docs compose fail while one is missing.
 *
 *   npm run stills                 write the missing ones
 *   npm run stills -- --all        write them all again
 *   npm run stills -- --check      fail when one is missing
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { stillRenditions, TILE_WIDTH } from '../app/lib/stills.ts';
import { appSources } from './app-sources.mjs';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicRoot = path.join(repoRoot, 'public');
const STILL = /\/imagery\/[A-Za-z0-9_.-]+\.png/g;
// Not shown to anyone: the still the exposure match measures the others against.
const SKIP_FILES = new Set(['app/lib/docs/exposure.ts']);
const all = process.argv.includes('--all');
const check = process.argv.includes('--check');

const stills = new Set();
for (const file of appSources(path.join(repoRoot, 'app'))) {
	if (SKIP_FILES.has(path.relative(repoRoot, file))) continue;
	for (const [src] of readFileSync(file, 'utf8').matchAll(STILL)) stills.add(src);
}

const missing = [];
let written = 0;
for (const src of [...stills].sort()) {
	const { full, tile } = stillRenditions(src);
	for (const [out, width] of [
		[full, undefined],
		[tile, TILE_WIDTH],
	]) {
		const file = path.join(publicRoot, out);
		if (!all && existsSync(file)) continue;
		if (check) {
			missing.push(out);
			continue;
		}
		// why: Near-lossless keeps every still indistinguishable from its PNG; lossy WebP softened the detailed ones.
		await sharp(path.join(publicRoot, src))
			.resize({ width, withoutEnlargement: true })
			.webp({ nearLossless: true, quality: 60, effort: 6 })
			.toFile(file);
		written++;
	}
}
if (missing.length > 0) {
	console.error(`stills: missing renditions, run npm run stills:\n${missing.map((m) => `  ${m}`).join('\n')}`);
	process.exit(1);
}
console.log(`stills: ${String(stills.size)} stills, ${String(written)} renditions written`);
