import { catalogPathFor, fieldMeta } from '@theorum/schema';
import { GOOGLE_SPEECH_VOICES } from '@theorum/presets/google/speech-voices';
import { renderAsciiCard } from '$lib/ascii/tip-card';

function escapeHtml(s: string): string {
	return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function wrapKey(path: string, text: string): string {
	return `<button type="button" class="node" data-type-path="${escapeHtml(path)}">${escapeHtml(text)}</button>`;
}

const KEY_LINE = /^(\s*)(["']?[A-Za-z_][\w.-]*["']?)(\s*:)(\s*)(.*)$/;

/** Preset vocabularies for open kernel fields — sourced from preset packs, not schema. */
const PRESET_REFERENCE: Record<string, readonly string[]> = {
	'outputs.speech.voice': GOOGLE_SPEECH_VOICES
};

/**
 * Annotate `defineProfile` source — only keys hover; values stay plain text.
 */
export function annotateProfileCode(source: string): string {
	const stack: string[] = [];
	const lines = source.split('\n');
	const out: string[] = [];

	for (const line of lines) {
		const commentAt = findCommentIndex(line);
		const code = commentAt === -1 ? line : line.slice(0, commentAt);
		const comment = commentAt === -1 ? '' : line.slice(commentAt);

		const trimmed = code.trim();
		if (!trimmed) {
			out.push(escapeHtml(code) + commentHtml(comment));
			continue;
		}

		const match = code.match(KEY_LINE);
		if (!match) {
			const delta = braceDelta(code);
			if (delta < 0) {
				for (let i = 0; i < -delta && stack.length > 0; i++) {
					stack.pop();
				}
			}
			out.push(escapeHtml(code) + commentHtml(comment));
			continue;
		}

		const [, indent, rawKey, colon, space, restRaw] = match;
		const rest = restRaw ?? '';
		const cleanKey = rawKey!.replace(/^['"]|['"]$/g, '');
		const path = catalogPathFor([...stack, cleanKey]);
		const meta = fieldMeta(path);
		const keyHtml = meta ? wrapKey(path, rawKey!) : escapeHtml(rawKey!);

		const delta = braceDelta(rest);
		if (delta > 0) {
			for (let i = 0; i < delta; i++) {
				stack.push(cleanKey);
			}
		} else if (delta < 0) {
			for (let i = 0; i < -delta && stack.length > 0; i++) {
				stack.pop();
			}
		}

		out.push(`${indent}${keyHtml}${escapeHtml(colon!)}${space}${escapeHtml(rest)}${commentHtml(comment)}`);
	}

	return out.join('\n');
}

function commentHtml(comment: string): string {
	if (!comment) return '';
	return `<span class="code-comment">${escapeHtml(comment)}</span>`;
}

function findCommentIndex(line: string): number {
	let inString: '"' | "'" | null = null;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i]!;
		if (inString) {
			if (ch === inString && line[i - 1] !== '\\') inString = null;
			continue;
		}
		if (ch === '"' || ch === "'") {
			inString = ch;
			continue;
		}
		if (ch === '/' && line[i + 1] === '/') return i;
	}
	return -1;
}

function braceDelta(s: string): number {
	let n = 0;
	for (const ch of s) {
		if (ch === '{' || ch === '[') n += 1;
		if (ch === '}' || ch === ']') n -= 1;
	}
	return n;
}

export function fieldTipArt(path: string): string | null {
	const meta = fieldMeta(path);
	if (!meta) return null;

	const preset = PRESET_REFERENCE[path];
	const options = meta.options?.length ? meta.options : preset;
	const listLabel = preset && !meta.options?.length ? 'preset' : 'options';

	let specs: Array<{ label: string; value: string }> | undefined;
	let list: readonly string[] | undefined;
	let labelW: number | undefined;

	if (meta.optionDescriptions) {
		const entries = Object.entries(meta.optionDescriptions);
		const maxK = Math.max(...entries.map(([k]) => k.length));
		labelW = Math.max(8, maxK + 2);
		specs = entries.map(([label, value]) => ({ label, value }));
	} else if (options?.length) {
		list = options;
	} else {
		specs = [{ label: 'type', value: meta.type }];
	}

	return renderAsciiCard({
		title: path.toUpperCase(),
		body: meta.doc,
		specs,
		list,
		listLabel,
		labelW,
		footer: preset && !meta.options?.length
			? 'Google preset vocabulary; kernel accepts any string.'
			: meta.optionNote
	});
}
