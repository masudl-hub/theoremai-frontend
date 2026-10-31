/**
 * A `ts` sample as the whole file the type checker reads. The checks compile it, and the code view
 * asks it which of the sample's strings are choices, so both see the same program.
 */

import type { SnippetFrame } from './schema';

/** The names a sample may use unimported: the package root's, and the snippet host's. */
export type SampleNames = { root: readonly string[]; host: readonly string[] };

export type SampleProgram = {
	text: string;
	/** Which of the sample's lines each line of `text` from `firstLine` on is. */
	firstLine: number;
	sourceLines: readonly number[];
};

/** Where each row of the code starts. */
export function rowStarts(rows: readonly string[]): number[] {
	let next = 0;
	return rows.map((row) => {
		const start = next;
		next += row.length + 1;
		return start;
	});
}

const words = (code: string) => new Set(code.match(/[A-Za-z_$][\w$]*/g) ?? []);

const IMPORT_LINE = /^import\s/;

/** What goes around a sample with this frame, on lines of their own. */
function frameAround(frame: SnippetFrame): [open: string, close: string] {
	if (frame === 'statements') return ['async function snippet() {', '}\nvoid snippet;'];
	if (frame === 'request') return ["void runTurn({ profile: 'snippet',", '}, hostOptions);'];
	if (frame === 'request-object') {
		return [
			"const turn: Parameters<typeof runTurn>[0] = { profile: 'snippet', ...",
			'};\nvoid turn;',
		];
	}
	if (frame === 'guardrails') return ['void defineProfile({ ...base.text, guardrails: {', '} });'];
	if (frame === 'models') return ['void defineProfile({ ...base.text,', '});'];
	if (frame.startsWith('tool:')) {
		return [`void registerTool({ ...baseTool.${frame.slice('tool:'.length)},`, '});'];
	}
	return [`void defineProfile({ ...base.${frame.slice('profile:'.length)},`, '});'];
}

/** The sample's own names, which the host's and the root's do not shadow. */
function ownNames(code: string): Set<string> {
	const own = new Set(
		[...code.matchAll(/(?:\b(?:const|let|var|function|class)\s+|import\s*\{[^}]*?)(\w+)/g)].flatMap(
			(match) => match[1] ?? [],
		),
	);
	for (const match of code.matchAll(/import\s*\{([^}]*)\}/g)) {
		for (const name of match[1]?.split(',') ?? []) {
			const local = name
				.trim()
				.split(/\s+as\s+/)
				.pop();
			if (local) own.add(local);
		}
	}
	return own;
}

/** The sample as a program: a whole program as written, any other completed by its frame. */
export function sampleProgram(
	code: string,
	frame: SnippetFrame | undefined,
	names: SampleNames,
): SampleProgram {
	const rows = code.split('\n');
	const kept = frame
		? rows.flatMap((row, at) => (IMPORT_LINE.test(row) ? [] : [at]))
		: [...rows.keys()];
	const imports = frame ? rows.filter((row) => IMPORT_LINE.test(row)) : [];
	const [open, close] = frame ? frameAround(frame) : [undefined, undefined];
	const lines = kept.map((at) => rows[at] ?? '');
	// In `models`, an indented `// ...` stands for the binding's other fields.
	const shown =
		frame === 'models'
			? lines.map((line) => line.replace(/^(\s+)\/\/ \.\.\.$/, '$1...baseBinding,'))
			: lines;
	const body = [...imports, ...(open ? [open] : []), ...shown, ...(close ? [close] : [])].join(
		'\n',
	);

	const own = ownNames(code);
	const all = words(body);
	const heads: string[] = [];
	if (frame) {
		const root = names.root.filter((name) => all.has(name) && !own.has(name));
		if (root.length > 0) heads.push(`import { ${root.join(', ')} } from '@theoremjs/agents';`);
	}
	const host = names.host.filter((name) => all.has(name) && !own.has(name));
	if (host.length > 0) {
		heads.push(`import { ${host.join(', ')} } from '../../scripts/docs-snippet-host.ts';`);
	}
	// Each file is its own module, so two samples that declare the same name do not collide.
	if (heads.length === 0 && !/^\s*(?:import|export)\s/m.test(body)) heads.push('export {};');
	return {
		text: `${heads.join('\n')}\n${body}\n`,
		firstLine: heads.length + imports.length + (open ? 1 : 0) + (heads.length === 0 ? 1 : 0),
		sourceLines: kept,
	};
}
