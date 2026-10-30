/**
 * Fail if authored /docs copy uses a banned AI-ism, or spells out a type signature in prose.
 * Kernel catalog strings are not scanned. Allow-list spans win over hits.
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const articlesDir = path.join(repoRoot, 'app/lib/docs/articles');
const bannedPath = path.join(repoRoot, 'scripts/docs-banned-voice.json');

/** @typedef {{ allow: string[], words: string[], phrases: string[] }} BannedVoice */

/** @returns {BannedVoice} */
function loadBanned() {
	return JSON.parse(readFileSync(bannedPath, 'utf8'));
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The authored copy of a chapter file: its front-matter title, summary and cover text, then its
 * prose. Fenced `ts`, `bash` and `text` blocks are code, not copy.
 *
 * @param {string} source
 * @returns {{ key: string, text: string }[]}
 */
function extractAuthored(source) {
	const [, head = '', body = ''] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source) ?? [];
	const chunks = [];
	for (const match of head.matchAll(/^(title|summary|coverAlt): (.*)$/gm)) {
		chunks.push({ key: match[1], text: match[2] });
	}
	const prose = body.replace(/^(`{3,})(?:ts|bash|text)\b[^\n]*\n[\s\S]*?\n\1$/gm, '');
	chunks.push({ key: 'body', text: prose });
	return chunks;
}

/**
 * @param {string} haystack
 * @param {string} needle
 */
function spansOf(haystack, needle) {
	const pattern = new RegExp(
		`(?<![\\p{L}\\p{N}])${escapeRegExp(needle)}(?![\\p{L}\\p{N}])`,
		'giu',
	);
	return [...haystack.matchAll(pattern)].map((match) => ({
		start: match.index ?? 0,
		end: (match.index ?? 0) + match[0].length,
		matched: match[0],
	}));
}

/**
 * @param {{ start: number, end: number }} hit
 * @param {{ start: number, end: number }[]} allowed
 */
function coveredByAllow(hit, allowed) {
	return allowed.some((span) => hit.start >= span.start && hit.end <= span.end);
}

/**
 * @param {string} text
 * @param {BannedVoice} banned
 */
function hitsIn(text, banned) {
	const allowed = banned.allow.flatMap((phrase) => spansOf(text, phrase));
	const needles = [...banned.phrases, ...banned.words].toSorted((a, b) => b.length - a.length);
	/** @type {{ phrase: string, matched: string, excerpt: string }[]} */
	const hits = [];
	for (const needle of needles) {
		for (const span of spansOf(text, needle)) {
			if (coveredByAllow(span, allowed)) continue;
			const excerpt = text.slice(Math.max(0, span.start - 24), span.end + 24).replace(/\s+/g, ' ');
			hits.push({ phrase: needle, matched: span.matched, excerpt });
		}
	}
	return hits;
}

/** An inline code span that is a signature: an arrow, or a promise or stream type. */
const SIGNATURE = /=>|\b(?:Promise|AsyncGenerator|AsyncIterable)</;

/**
 * The type signatures in a chapter's prose. Snippets and table rows (a reference table's
 * Signature column) may hold them; prose names the type alone.
 *
 * @param {string} source
 */
function signaturesIn(source) {
	const [, , body = ''] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source) ?? [];
	const prose = body.replace(/^(`{3,})[^\n]*\n[\s\S]*?\n\1$/gm, '');
	return prose
		.split('\n')
		.filter((line) => !/^\s*\|/.test(line))
		.flatMap((line) => [...line.matchAll(/`([^`\n]+)`/g)].map((match) => match[1] ?? ''))
		.filter((code) => SIGNATURE.test(code));
}

function articleFiles() {
	return readdirSync(articlesDir, { recursive: true })
		.map(String)
		.filter((name) => name.endsWith('.md'))
		.map((name) => path.join(articlesDir, name));
}

const banned = loadBanned();
/** @type {string[]} */
const failures = [];

for (const file of articleFiles()) {
	const source = readFileSync(file, 'utf8');
	const rel = path.relative(repoRoot, file);
	for (const chunk of extractAuthored(source)) {
		for (const hit of hitsIn(chunk.text, banned)) {
			failures.push(
				`${rel} ${chunk.key}: "${hit.phrase}" in “${hit.excerpt}”`,
			);
		}
	}
	for (const code of signaturesIn(source)) {
		failures.push(`${rel} body: type signature \`${code}\` in prose; name the type, or move it to a snippet or table`);
	}
}

if (failures.length > 0) {
	console.error(`docs-lint-voice: ${String(failures.length)} hit(s)\n`);
	for (const line of failures) console.error(`  ${line}`);
	console.error('\nBanned list: scripts/docs-banned-voice.json. Signatures: docs/DOCS_CONTRACT.md#snippets');
	process.exit(1);
}

console.log('docs-lint-voice ok');
