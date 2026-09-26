/// <reference types="node" />
/**
 * Pull a fenced snippet from the published README by heading + nth fence.
 * sha256 must match the extracted body or compose throws (README drift).
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export function sha256Hex(text: string): string {
	return createHash('sha256').update(text, 'utf8').digest('hex');
}

function headingLevel(line: string): number {
	const match = /^(#{1,6})\s+/.exec(line);
	return match?.[1]?.length ?? 0;
}

function sectionBody(readme: string, heading: string): string {
	const lines = readme.split(/\r?\n/);
	const start = lines.findIndex((line) => {
		const level = headingLevel(line);
		return level > 0 && line.slice(level).trim() === heading;
	});
	if (start < 0) throw new Error(`README has no heading "${heading}"`);
	const level = headingLevel(lines[start] ?? '');
	let end = lines.length;
	let inFence = false;
	for (let i = start + 1; i < lines.length; i += 1) {
		const line = lines[i] ?? '';
		if (line.startsWith('```')) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		const next = headingLevel(line);
		if (next > 0 && next <= level) {
			end = i;
			break;
		}
	}
	return lines.slice(start + 1, end).join('\n');
}

function nthFence(section: string, nth: number): { lang: string; body: string } {
	const fences = [...section.matchAll(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g)];
	const hit = fences.at(nth);
	if (hit === undefined) {
		throw new Error(
			`README section has no fence index ${String(nth)} (${String(fences.length)} fences, ${String(section.length)} chars)`,
		);
	}
	return { lang: hit[1] || 'text', body: hit[2] };
}

export function readmeSnippet(
	readmePath: string,
	heading: string,
	nth: number,
	expectedSha256: string,
): { lang: 'ts' | 'bash'; code: string } {
	const readme = readFileSync(readmePath, 'utf8');
	const { lang, body } = nthFence(sectionBody(readme, heading), nth);
	const digest = sha256Hex(body);
	if (digest !== expectedSha256) {
		throw new Error(
			`README "${heading}" fence ${String(nth)} sha256 ${digest} !== ${expectedSha256}`,
		);
	}
	if (lang === 'ts' || lang === 'typescript') return { lang: 'ts', code: body.replace(/\n$/, '') };
	if (lang === 'bash' || lang === 'sh' || lang === '') {
		return { lang: 'bash', code: body.replace(/\n$/, '') };
	}
	throw new Error(`README "${heading}" fence ${String(nth)} has unsupported lang ${lang}`);
}
