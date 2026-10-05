/**
 * Fail if a chapter file changed since main without bumping its `updated` day.
 * Compares the working tree with the merge-base of HEAD and origin/main; new chapters pass.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const articlesRel = 'app/lib/docs/articles';
const UPDATED = /^updated: (\d{4}-\d{2}-\d{2})$/m;

function git(args) {
	return execFileSync('git', ['-C', repoRoot, ...args], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore'],
	});
}

function baseRef() {
	try {
		return git(['merge-base', 'HEAD', 'origin/main']).trim();
	} catch {
		return 'HEAD';
	}
}

function localDay() {
	const now = new Date();
	const pad = (value) => String(value).padStart(2, '0');
	return `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const base = baseRef();
const today = localDay();
const stale = [];
for (const name of readdirSync(path.join(repoRoot, articlesRel))) {
	if (!name.endsWith('.md')) continue;
	const rel = `${articlesRel}/${name}`;
	const current = readFileSync(path.join(repoRoot, rel), 'utf8');
	const updated = UPDATED.exec(current)?.[1];
	if (updated === undefined) {
		stale.push(`${rel}: no \`updated: YYYY-MM-DD\` line in its front matter`);
		continue;
	}
	let before;
	try {
		before = git(['show', `${base}:${rel}`]);
	} catch {
		continue;
	}
	if (before === current) continue;
	const was = UPDATED.exec(before)?.[1] ?? '';
	if (updated !== today && updated <= was) {
		stale.push(`${rel}: changed since ${base.slice(0, 7)} but updated is still ${updated}; set it to ${today}`);
	}
}

if (stale.length > 0) {
	console.error(`docs-lint-dates: ${String(stale.length)} chapter(s) need a fresh date:\n  ${stale.join('\n  ')}`);
	process.exit(1);
}
console.log('docs-lint-dates: chapter dates match their edits');
