/**
 * Hold the claims in /docs prose and tables to the package's own catalogs. Every inline-code
 * config path (`guardrails.egress.onBlock`, `models.<id>.apiId`) must be a field the profile
 * catalog (`PROFILE_FIELDS`, `EXTRA_FIELDS`) declares, and every `labels.<key>` must be a
 * labels key. A renamed or removed field then fails here instead of staying in a chapter.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
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
			'import { PROFILE_FIELDS, EXTRA_FIELDS, LABEL_KEYS } from "./mod.ts"; console.log(JSON.stringify({ fields: Object.keys(PROFILE_FIELDS), meta: PROFILE_FIELDS, extra: Object.keys(EXTRA_FIELDS), labels: LABEL_KEYS }))',
		],
		{ cwd: theoremai.root, encoding: 'utf8' },
	),
);

const paths = [...catalog.fields, ...catalog.extra].map((p) => p.split('.'));
// The tool-spec fields share the catalog; `input`, `output` and `profile` there are not profile paths.
const heads = new Set([...catalog.fields.map((p) => p.split('.')[0]), 'mapping', 'auth', 'studio', 'labels']);
const labels = new Set(catalog.labels);
// A span that ends in a source-file extension (`studio.setup.ts`) names a file, not a field.
const FILE_EXTENSION = /\.(?:[cm]?[jt]sx?|json|md|ya?ml)$/;
// A catalog path that ends in one of those words would be skipped too, so none may.
for (const p of [...catalog.fields, ...catalog.extra, ...catalog.labels]) {
	if (FILE_EXTENSION.test(p)) throw new Error(`docs-check-facts: catalog key \`${p}\` looks like a file name`);
}

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
		if (FILE_EXTENSION.test(span)) continue;
		const claim = span.split('.');
		if (claim[0] === 'labels') {
			read += 1;
			if (!labels.has(claim.slice(1).join('.')) && claim[1] !== '*') {
				problems.push(`${article.slug}: \`${span}\` is not a labels key`);
			}
		} else if (heads.has(claim[0])) {
			read += 1;
			if (!matches(claim)) problems.push(`${article.slug}: \`${span}\` is not a profile field`);
		}
	}
}

// ---- Tables that restate kernel data: parse each, then compare it with the catalog. ----

/** The body rows of a section's table, each cell as `{ code, text }`: its only table, or its first of `count`. */
const tableCells = (slug, id, count = 1) => {
	const article = index.articles.find((a) => a.slug === slug);
	const section = article?.sections.find((entry) => entry.id === id);
	const tables = section ? markdownTables(sectionText(article, section)) : [];
	if (tables.length !== count) {
		problems.push(`${slug}#${id}: need one section with ${String(count)} tables, found ${String(tables.length)}`);
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

// providers/protocols#choose-a-protocol-for-the-profile-type: the protocol / type pairs `registerProfile` accepts
// from a first-party provider, found by trying each one. The section's second table is the providers.
{
	const docPairs = new Set();
	for (const [protocol, types] of tableCells('providers/protocols', 'choose-a-protocol-for-the-profile-type', 2)) {
		for (const type of types.code) docPairs.add(`${protocol.code[0]}/${type}`);
	}
	const kernelPairs = new Set(
		JSON.parse(
			execFileSync('deno', ['run', '-A', path.join(repoRoot, 'scripts/docs-probe-pairs.ts'), theoremai.root], {
				cwd: theoremai.root,
				encoding: 'utf8',
			}),
		),
	);
	sameSet('providers/protocols#choose-a-protocol-for-the-profile-type', docPairs, kernelPairs);
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
		detect: 'guardrails.detect',
		blockedReply: 'guardrails.blockedReply',
		egress: 'guardrails.egress',
		quota: 'guardrails.quota',
		disclosure: 'guardrails.disclosure',
		taint: 'guardrails.taint.afterRemoteRead',
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
	const source = ['src/kernel/tools/execute.ts', 'src/kernel/tools/events.ts']
		.map((file) => readFileSync(path.join(theoremai.root, file), 'utf8'))
		.join('\n');
	const kernelCodes = new Set();
	const tree = ts.createSourceFile('tools.ts', source, ts.ScriptTarget.Latest, true);
	const visit = (node) => {
		if (ts.isObjectLiteralExpression(node)) {
			const properties = node.properties.filter(ts.isPropertyAssignment);
			const failure = properties.some((property) => property.name.getText(tree) === 'kind');
			const code = properties.find((property) => property.name.getText(tree) === 'code');
			if (failure && code && ts.isStringLiteral(code.initializer)) kernelCodes.add(code.initializer.text);
		}
		ts.forEachChild(node, visit);
	};
	visit(tree);
	const docCodes = new Set(tableCells('tools', 'fix-a-failed-call').map((row) => row[0].code[0]));
	sameSet('tools#fix-a-failed-call', docCodes, kernelCodes);
}

// profiles/decision#handle-a-decision-error: the `DecisionError` codes the section lists are the keys the kernel maps to error kinds.
{
	const source = readFileSync(path.join(theoremai.root, 'src/kernel/engine/decision.ts'), 'utf8');
	const block = /DECISION_ERROR_KINDS = \{([^}]*)\}/.exec(source)?.[1] ?? '';
	const kernelCodes = new Set([...block.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]));
	const where = 'profiles/decision#handle-a-decision-error';
	const article = index.articles.find((a) => a.slug === 'profiles/decision');
	const section = article?.sections.find((entry) => entry.id === 'handle-a-decision-error');
	const listed = section ? /Its `code` is one of ([^.]*)\./.exec(sectionText(article, section))?.[1] : undefined;
	if (listed === undefined) problems.push(`${where}: need a section with the sentence "Its \`code\` is one of …."`);
	else sameSet(where, new Set(markdownInlineCode(listed)), kernelCodes);
}

// Every link to a chapter must reach one that exists, and its `#` a section or glossary row there.
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
