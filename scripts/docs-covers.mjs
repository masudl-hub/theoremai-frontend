/**
 * Make a chapter's review follow the code it describes.
 *
 *   node scripts/docs-covers.mjs check          fail when covered code changed since the review
 *   node scripts/docs-covers.mjs ack <slug>...  record that the chapter was re-read (or --all)
 *
 * Each chapter lists the package files it `covers`. `docs-review.json` holds, per chapter, the
 * committed blob id of every covered file at its last review. A chapter is stale when any of
 * them differs. Fixing the chapter is not enough: the person who re-read it runs `ack`, which
 * is the record that a human compared the page with the new code.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docsIndexPlugin } from './docs-index-plugin.mjs';
import { resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const lockPath = path.join(repoRoot, 'docs-review.json');
const theoremai = resolveTheoremaiRoot(repoRoot);

const loaded = await docsIndexPlugin({ repoRoot, theoremai }).load('\0virtual:docs/index');
const prefix = 'export const docIndex = ';
if (typeof loaded !== 'string' || !loaded.startsWith(prefix)) {
	throw new Error('docs-covers: virtual:docs/index did not load');
}
const { articles } = JSON.parse(loaded.slice(prefix.length).replace(/;\s*$/, ''));

/** The committed blob id of every file under `covers`, keyed by path. */
function blobs(covers) {
	const out = execFileSync('git', ['ls-tree', '-r', 'HEAD', '--', ...covers], {
		cwd: theoremai.root,
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
	});
	const files = {};
	for (const line of out.split('\n')) {
		const m = /^\d+ blob (\w+)\t(.+)$/.exec(line);
		if (m) files[m[2]] = m[1];
	}
	return files;
}

const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : {};
const [command, ...rest] = process.argv.slice(2);

if (command === 'ack') {
	const slugs = rest.includes('--all') ? articles.map((a) => a.slug) : rest;
	if (slugs.length === 0) {
		console.error('usage: docs-covers.mjs ack <slug>... | --all');
		process.exit(2);
	}
	for (const slug of slugs) {
		const article = articles.find((a) => a.slug === slug);
		if (!article) {
			console.error(`docs-covers: no chapter named ${slug}`);
			process.exit(2);
		}
		lock[slug] = { reviewed: new Date().toISOString().slice(0, 10), files: blobs(article.covers) };
	}
	const sorted = Object.fromEntries(Object.entries(lock).sort(([a], [b]) => a.localeCompare(b)));
	writeFileSync(lockPath, `${JSON.stringify(sorted, null, '\t')}\n`);
	console.log(`docs-covers: recorded ${slugs.join(', ')}`);
	process.exit(0);
}

if (command !== 'check') {
	console.error('usage: docs-covers.mjs check | ack <slug>... | --all');
	process.exit(2);
}

const problems = [];
for (const article of articles) {
	const reviewed = lock[article.slug];
	if (!reviewed) {
		problems.push(`${article.slug}: never reviewed. Read it against its code, then run: npm run docs:ack -- ${article.slug}`);
		continue;
	}
	const now = blobs(article.covers);
	const changed = [
		...Object.keys(now).filter((f) => reviewed.files[f] !== now[f]),
		...Object.keys(reviewed.files).filter((f) => !(f in now)),
	].sort();
	if (changed.length > 0) {
		const shown = changed.slice(0, 6).join(', ');
		const more = changed.length > 6 ? ` and ${String(changed.length - 6)} more` : '';
		problems.push(
			`${article.slug}: reviewed ${reviewed.reviewed}; code it covers changed (${shown}${more}). Re-read the chapter, fix it, then run: npm run docs:ack -- ${article.slug}`,
		);
	}
}
if (problems.length > 0) {
	console.error(problems.join('\n'));
	process.exit(1);
}
console.log(`docs-covers ok (${String(articles.length)} chapters reviewed against current code)`);
