// A still lives in one place. A place is one source file, or one docs chapter: a chapter may
// repeat its own still (cover, figure steps), but no still may appear on two pages or components.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const APP = join(ROOT, 'app');
const SKIP_DIRS = new Set(['built', 'node_modules']);
// Not shown to anyone: the still the exposure match measures the others against.
const SKIP_FILES = new Set(['app/lib/docs/exposure.ts']);
// Related pages may share one still, and only the pairs named here: the overview's "Built-in
// boundaries" and the Guardrails chapter are about the same thing.
const RELATED = [['th30_obsidianshores.png', ['app/components/home-stage.tsx', 'docs chapter "guardrails"']]];
const CHAPTER = /^app\/lib\/docs\/articles\/([^/]+)\.md$/;
const STILL = /\/imagery\/([A-Za-z0-9_.-]+\.(?:png|jpe?g|webp|avif))/g;

function* sources(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (SKIP_DIRS.has(entry.name)) continue;
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* sources(path);
		else if (/\.(tsx?|md)$/.test(entry.name)) yield path;
	}
}

/** still → the places that use it */
const used = new Map();
for (const file of sources(APP)) {
	const rel = relative(ROOT, file);
	if (SKIP_FILES.has(rel)) continue;
	const place = CHAPTER.exec(rel)?.[1];
	const name = place === undefined ? rel : `docs chapter "${place}"`;
	for (const [, still] of readFileSync(file, 'utf8').matchAll(STILL)) {
		if (!used.has(still)) used.set(still, new Set());
		used.get(still).add(name);
	}
}

const related = new Map(RELATED.map(([still, places]) => [still, [...places].sort().join('\0')]));
const shared = [...used].filter(
	([still, places]) => places.size > 1 && related.get(still) !== [...places].sort().join('\0'),
);
if (shared.length > 0) {
	console.error('A still may be used in one place only. These are used in several:\n');
	for (const [still, places] of shared.sort()) {
		console.error(`  ${still}\n${[...places].map((place) => `    - ${place}`).join('\n')}`);
	}
	process.exit(1);
}
console.log(`stills: ${String(used.size)} stills, each in one place`);
