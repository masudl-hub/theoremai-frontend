/**
 * Fail if a /docs chapter leaves the one story, the research cookbook. A chapter in
 * `docs-story-gaps.json` may keep that many off-story names while its example waits on a design
 * decision; it may not gain one. `--counts` prints the current counts.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const articlesDir = path.join(repoRoot, 'app/lib/docs/articles');
const gaps = JSON.parse(readFileSync(path.join(repoRoot, 'scripts/docs-story-gaps.json'), 'utf8'));

const OFF_STORY =
	/harbou?r|vessel|customs|cargo|freight|berth|quay|maritime|logistics|tariff|shipment|manifest|acme\.|billingaccount|issue_refund|delete_record|transfer_funds|generate_report|run_query|fetch_inventory|charge_card|sync_user_vault|computetrajectory|research\.orchestrator|anthropic\/claude-[\w.-]+/gi;

/** @param {string} dir @returns {string[]} */
function chapters(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return chapters(full);
		return entry.name.endsWith('.md') ? [full] : [];
	});
}

const counts = Object.fromEntries(
	chapters(articlesDir).flatMap((file) => {
		const hits = readFileSync(file, 'utf8').match(OFF_STORY) ?? [];
		return hits.length ? [[path.relative(articlesDir, file), hits]] : [];
	}),
);

if (process.argv.includes('--counts')) {
	const ledger = Object.entries(counts).map(([chapter, hits]) => [chapter, hits.length]);
	console.log(JSON.stringify(Object.fromEntries(ledger), null, '\t'));
	process.exit(0);
}

const problems = [
	...Object.entries(counts).flatMap(([chapter, hits]) => {
		const allowed = gaps[chapter] ?? 0;
		if (hits.length <= allowed) return [];
		return [`${chapter}: ${String(hits.length)} off-story names, ${String(allowed)} allowed: ${[...new Set(hits)].join(', ')}`];
	}),
	...Object.entries(gaps).flatMap(([chapter, allowed]) => {
		const found = counts[chapter]?.length ?? 0;
		return found < allowed ? [`${chapter}: lower its entry in docs-story-gaps.json to ${String(found)}`] : [];
	}),
];

if (problems.length) {
	console.error(`docs story: ${String(problems.length)} problem(s)\n${problems.join('\n')}`);
	process.exit(1);
}
console.log('docs story: ok');
