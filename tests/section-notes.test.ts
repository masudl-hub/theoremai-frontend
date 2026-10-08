import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const ROOT = new URL('../app/', import.meta.url).pathname;

function sources(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sources(path);
		return entry.name.endsWith('.tsx') ? [path] : [];
	});
}

/** The expression inside the braces that open at `start`. */
function braced(text: string, start: number): string {
	let depth = 0;
	for (let at = start; at < text.length; at++) {
		if (text[at] === '{') depth++;
		else if (text[at] === '}' && --depth === 0) return text.slice(start + 1, at);
	}
	return text.slice(start + 1);
}

test('a section note comes from the catalog or the studio package, never a string in the UI', () => {
	const written: string[] = [];
	for (const file of sources(ROOT)) {
		const text = readFileSync(file, 'utf8');
		for (const match of text.matchAll(/\bnote=(["{])/g)) {
			const at = match.index + 'note='.length;
			const line = text.slice(0, at).split('\n').length;
			const value = match[1] === '"' ? '"' : braced(text, at).replace(/sectionNote\('[\w.]+'|[!=]==\s*'[^']*'/g, '');
			if (/["'`]/.test(value)) written.push(`${file.slice(ROOT.length)}:${line}`);
		}
	}
	assert.deepEqual(written, []);
});
