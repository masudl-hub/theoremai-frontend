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
import { loadDocs } from './docs-index-plugin.mjs';
import { failOn } from './docs-report.mjs';
import { resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const theoremai = resolveTheoremaiRoot(repoRoot);

const { index, markdownInlineCode, markdownLinks, markdownTables, sectionText } = await loadDocs({
	repoRoot,
	theoremai,
});

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

const problems = [];
let read = 0;
for (const article of index.articles) {
	for (const code of new Set(markdownInlineCode(article.body))) {
		const span = code.trim().replace(/\(\)$/, '').replace(/<[^>]*>/g, '*');
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

// ---- Tables that restate kernel data: parse each, then compare it with the catalog. ----

/** The body rows of the one table in a section, each cell as `{ code, text }`. */
const tableCells = (slug, id) => {
	const article = index.articles.find((a) => a.slug === slug);
	const section = article?.sections.find((entry) => entry.id === id);
	const tables = section ? markdownTables(sectionText(article, section)) : [];
	if (tables.length !== 1) {
		problems.push(`${slug}#${id}: need one section with one table, found ${String(tables.length)} tables`);
		return [];
	}
	return tables[0];
};
const sameSet = (what, docSet, kernelSet) => {
	const missing = [...kernelSet].filter((x) => !docSet.has(x));
	const extra = [...docSet].filter((x) => !kernelSet.has(x));
	if (missing.length > 0) problems.push(`${what}: the kernel has ${missing.join(', ')}, the chapter does not`);
	if (extra.length > 0) problems.push(`${what}: the chapter has ${extra.join(', ')}, the kernel does not`);
};

// models#choose-a-legal-pair: the triples `defineProfile` accepts, found by trying each one.
{
	const docTriples = new Set();
	for (const [protocol, provider, types] of tableCells('models', 'choose-a-legal-pair')) {
		for (const pr of provider.code) {
			for (const type of types.code) docTriples.add(`${protocol.code[0]}/${pr}/${type}`);
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
	sameSet('models#choose-a-legal-pair', docTriples, kernelTriples);
}

// guardrails#which-profiles-take-which-guardrail: each cell against the `profileTypes` of the guardrail's field.
{
	const columns = [['text', 'image'], ['live'], ['speech'], ['host'], ['decision']];
	for (const row of tableCells('guardrails', 'which-profiles-take-which-guardrail')) {
		for (const name of row[0].code) {
			const allowed = catalog.meta[`guardrails.${name}`]?.profileTypes;
			if (!allowed) {
				problems.push(`guardrails#which-profiles-take-which-guardrail: \`${name}\` has no profileTypes in the catalog`);
				continue;
			}
			columns.forEach((types, i) => {
				for (const type of types) {
					const says = row[i + 1].text;
					if ((says === 'Yes') !== allowed.includes(type)) {
						problems.push(`guardrails#which-profiles-take-which-guardrail: \`${name}\` on ${type} says "${says}", the catalog ${allowed.includes(type) ? 'allows' : 'refuses'} it`);
					}
				}
			});
		}
	}
}

// guardrails#know-the-defaults: the "Without a setting" cell against the field's `unset`.
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
	for (const row of tableCells('guardrails', 'know-the-defaults')) {
		const name = row[0].code[0];
		const doc = row[1].text.toLowerCase();
		if (name === 'promptEcho') continue;
		if (name === 'network') {
			const unset = catalog.meta['guardrails.network.allowedSchemes'].unset;
			if (!(doc.startsWith('https') && unset.startsWith('https'))) problems.push('guardrails#know-the-defaults: network default differs from the catalog');
			continue;
		}
		const unset = (catalog.meta[unsetOf[name]]?.unset ?? '').toLowerCase();
		if (!unset || !doc.startsWith(unset)) {
			problems.push(`guardrails#know-the-defaults: \`${name}\` says "${doc}", the catalog says "${unset}"`);
		}
	}
}

// tools#fix-a-failed-call: a failure code is a free string, so read each site that sets one.
{
	const source = readFileSync(path.join(theoremai.root, 'src/kernel/tools/execute.ts'), 'utf8');
	const kernelCodes = new Set([...source.matchAll(/code: '(\w+)'/g)].map((m) => m[1]));
	const docCodes = new Set(tableCells('tools', 'fix-a-failed-call').map((row) => row[0].code[0]));
	sameSet('tools#fix-a-failed-call', docCodes, kernelCodes);
}

// runner: the `DecisionError` codes the chapter lists are the keys the kernel maps to error kinds.
{
	const source = readFileSync(path.join(theoremai.root, 'src/kernel/engine/decision.ts'), 'utf8');
	const block = /DECISION_ERROR_KINDS = \{([^}]*)\}/.exec(source)?.[1] ?? '';
	const kernelCodes = new Set([...block.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]));
	const runner = index.articles.find((a) => a.slug === 'runner');
	const listed = runner?.body.match(/Its `code` is one of ([^.]*)\./)?.[1] ?? '';
	sameSet('runner/decision-error-codes', new Set(markdownInlineCode(listed)), kernelCodes);
}

// Every link to a chapter must reach one that exists, and its `#` a section or dictionary entry there.
{
	for (const article of index.articles) {
		for (const url of markdownLinks(article.body)) {
			const [, slug, , hash] = /^\/docs\/([^#]*)(#(.*))?$/.exec(url) ?? [];
			if (slug === undefined) continue;
			const target = index.bySlug[slug];
			if (!target) problems.push(`${article.slug}: link to /docs/${slug} reaches no chapter`);
			else if (hash && !target.sections.some((s) => s.id === hash) && !target.symbols.some((s) => s.id === hash)) {
				problems.push(`${article.slug}: link to ${url} reaches no section`);
			}
		}
	}
}

failOn(problems);
console.log(`docs-check-facts ok (${String(read)} field paths)`);
