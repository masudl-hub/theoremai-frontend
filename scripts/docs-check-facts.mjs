/**
 * Hold the claims in /docs prose and tables to the package's own catalogs. Every inline-code
 * config path (`guardrails.egress.onBlock`, `models.<id>.apiId`) must be a field the profile
 * catalog (`PROFILE_FIELDS`, `EXTRA_FIELDS`) declares, and every `lexicon.<key>` must be a
 * lexicon key. A renamed or removed field then fails here instead of staying in a chapter.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docsIndexPlugin } from './docs-index-plugin.mjs';
import { resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const theoremai = resolveTheoremaiRoot(repoRoot);

const loaded = await docsIndexPlugin({ repoRoot, theoremai }).load('\0virtual:docs/index');
const prefix = 'export const docIndex = ';
if (typeof loaded !== 'string' || !loaded.startsWith(prefix)) {
	throw new Error('docs-check-facts: virtual:docs/index did not load');
}
const index = JSON.parse(loaded.slice(prefix.length).replace(/;\s*$/, ''));

const catalog = JSON.parse(
	execFileSync(
		'deno',
		[
			'eval',
			'import { PROFILE_FIELDS, EXTRA_FIELDS, LEXICON_KEYS } from "./mod.ts"; console.log(JSON.stringify({ fields: Object.keys(PROFILE_FIELDS), meta: PROFILE_FIELDS, extra: Object.keys(EXTRA_FIELDS), lexicon: LEXICON_KEYS }))',
		],
		{ cwd: theoremai.root, encoding: 'utf8' },
	),
);

const paths = [...catalog.fields, ...catalog.extra].map((p) => p.split('.'));
// The tool-spec fields share the catalog; `input`, `output` and `profile` there are not profile paths.
const heads = new Set([...catalog.fields.map((p) => p.split('.')[0]), 'mapping', 'auth', 'playground', 'labels']);
const lexicon = new Set(catalog.lexicon);

/** A segment pattern matches when each segment is equal or either side is a wildcard. */
const matches = (claim) =>
	paths.some(
		(p) =>
			p.length === claim.length &&
			p.every((seg, i) => seg === '*' || claim[i] === '*' || seg === claim[i]),
	);

const textOf = (block) => {
	if (block.kind === 'lede' || block.kind === 'prose' || block.kind === 'table') return block.text;
	if (block.kind === 'callout') return block.text;
	return '';
};

const problems = [];
let read = 0;
for (const article of index.articles) {
	const seen = new Set();
	for (const block of article.blocks) {
		for (const m of textOf(block).matchAll(/(?<!`)`([^`\n]+)`(?!`)/g)) {
			const span = m[1].trim().replace(/\(\)$/, '').replace(/<[^>]*>/g, '*');
			if (seen.has(span)) continue;
			seen.add(span);
			if (!/^[A-Za-z][\w]*(\.[\w*-]+)+$/.test(span)) continue;
			const claim = span.split('.');
			if (claim[0] === 'lexicon') {
				read += 1;
				if (!lexicon.has(claim.slice(1).join('.')) && claim[1] !== '*') {
					problems.push(`${article.slug}: \`${span}\` is not a lexicon key`);
				}
			} else if (heads.has(claim[0])) {
				read += 1;
				if (!matches(claim)) problems.push(`${article.slug}: \`${span}\` is not a profile field`);
			}
		}
	}
}

// ---- Tables that restate kernel data: parse each, then compare it with the catalog. ----

const tableCells = (article, id) => {
	const block = index.articles.find((a) => a.slug === article)?.blocks.find((b) => b.id === id);
	if (!block) {
		problems.push(`${article}/${id}: table not found`);
		return [];
	}
	return block.text
		.split('\n')
		.slice(2)
		.map((line) => line.split(' | ').map((cell) => cell.trim()));
};
const ticks = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const sameSet = (what, docSet, kernelSet) => {
	const missing = [...kernelSet].filter((x) => !docSet.has(x));
	const extra = [...docSet].filter((x) => !kernelSet.has(x));
	if (missing.length > 0) problems.push(`${what}: the kernel has ${missing.join(', ')}, the chapter does not`);
	if (extra.length > 0) problems.push(`${what}: the chapter has ${extra.join(', ')}, the kernel does not`);
};

// models/legal-pairs: the triples `defineProfile` accepts, found by trying each one.
{
	const docTriples = new Set();
	for (const [protocol, provider, types] of tableCells('models', 'legal-pairs')) {
		for (const pr of ticks(provider)) {
			for (const type of ticks(types)) docTriples.add(`${ticks(protocol)[0]}/${pr}/${type}`);
		}
	}
	const kernelTriples = new Set(
		JSON.parse(
			execFileSync('deno', ['run', '-A', path.join(repoRoot, 'scripts/docs-probe-pairs.ts'), theoremai.root], {
				cwd: theoremai.root,
				encoding: 'utf8',
			}),
		),
	);
	sameSet('models/legal-pairs', docTriples, kernelTriples);
}

// guardrails/which-profiles: each cell against the `profileTypes` of the guardrail's field.
{
	const columns = [['text', 'image'], ['live'], ['speech'], ['host'], ['decision']];
	for (const row of tableCells('guardrails', 'which-profiles')) {
		for (const name of ticks(row[0])) {
			const allowed = catalog.meta[`guardrails.${name}`]?.profileTypes;
			if (!allowed) {
				problems.push(`guardrails/which-profiles: \`${name}\` has no profileTypes in the catalog`);
				continue;
			}
			columns.forEach((types, i) => {
				for (const type of types) {
					const says = row[i + 1];
					if ((says === 'Yes') !== allowed.includes(type)) {
						problems.push(`guardrails/which-profiles: \`${name}\` on ${type} says "${says}", the catalog ${allowed.includes(type) ? 'allows' : 'refuses'} it`);
					}
				}
			});
		}
	}
}

// guardrails/defaults-table: the "Without a setting" cell against the field's `unset`.
{
	const unsetOf = {
		sanitizeInput: 'guardrails.sanitizeInput',
		canary: 'guardrails.canary',
		egress: 'guardrails.egress',
		quota: 'guardrails.quota',
		disclosure: 'guardrails.disclosure',
		taint: 'guardrails.taint.afterRemoteRead',
		redactSensitive: 'guardrails.redactSensitive',
	};
	for (const row of tableCells('guardrails', 'defaults-table')) {
		const name = ticks(row[0])[0];
		const doc = row[1].replace(/`/g, '').toLowerCase();
		if (name === 'promptEcho') continue;
		if (name === 'network') {
			const unset = catalog.meta['guardrails.network.allowedSchemes'].unset;
			if (!(doc.startsWith('https') && unset.startsWith('https'))) problems.push('guardrails/defaults-table: network default differs from the catalog');
			continue;
		}
		const unset = (catalog.meta[unsetOf[name]]?.unset ?? '').toLowerCase();
		if (!unset || !doc.startsWith(unset)) {
			problems.push(`guardrails/defaults-table: \`${name}\` says "${doc}", the catalog says "${unset}"`);
		}
	}
}

// tools/failure-codes: a failure code is a free string, so read each site that sets one.
{
	const source = readFileSync(path.join(theoremai.root, 'src/kernel/tools/execute.ts'), 'utf8');
	const kernelCodes = new Set([...source.matchAll(/code: '(\w+)'/g)].map((m) => m[1]));
	const docCodes = new Set(tableCells('tools', 'failure-codes').map((row) => ticks(row[0])[0]));
	sameSet('tools/failure-codes', docCodes, kernelCodes);
}

if (problems.length > 0) {
	console.error(problems.join('\n'));
	process.exit(1);
}
console.log(`docs-check-facts ok (${String(read)} field paths)`);
