/**
 * Write the WebP renditions of every PNG still the docs chapters use (see app/lib/docs/stills.ts).
 * Run after adding or changing a still; compose fails while one is missing.
 *
 *   npm run docs:stills            write the missing ones
 *   npm run docs:stills -- --all   write them all again
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { stillRenditions, TILE_WIDTH } from '../app/lib/docs/stills.ts';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const articles = path.join(repoRoot, 'app/lib/docs/articles');
const publicRoot = path.join(repoRoot, 'public');
const STILL = /\/imagery\/[A-Za-z0-9_.-]+\.png/g;
const all = process.argv.includes('--all');

const stills = new Set();
for (const name of readdirSync(articles).filter((file) => file.endsWith('.md'))) {
	for (const [src] of readFileSync(path.join(articles, name), 'utf8').matchAll(STILL)) stills.add(src);
}

let written = 0;
for (const src of [...stills].sort()) {
	const { full, tile } = stillRenditions(src);
	for (const [out, width] of [
		[full, undefined],
		[tile, TILE_WIDTH],
	]) {
		const file = path.join(publicRoot, out);
		if (!all && existsSync(file)) continue;
		await sharp(path.join(publicRoot, src))
			.resize({ width, withoutEnlargement: true })
			.webp({ quality: 80, effort: 6 })
			.toFile(file);
		written++;
	}
}
console.log(`docs-stills: ${String(stills.size)} stills, ${String(written)} renditions written`);
