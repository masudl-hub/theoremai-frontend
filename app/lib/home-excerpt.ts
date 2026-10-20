/**
 * A goal's slice of the agent's file: the profile fields the goal is about, cut out of the whole
 * source with the number of each line it came from. Pure text, so the screen can show it in a
 * plain code block.
 */

export type Lines = { from: number; to: number };

/** `lengths[i][j]`: the longest run of lines `was[i..]` and `now[j..]` share, in order. */
function commonLengths(was: readonly string[], now: readonly string[]): Uint32Array[] {
	const lengths = Array.from({ length: was.length + 1 }, () => new Uint32Array(now.length + 1));
	for (let i = was.length - 1; i >= 0; i -= 1) {
		for (let j = now.length - 1; j >= 0; j -= 1) {
			lengths[i][j] =
				was[i] === now[j]
					? 1 + lengths[i + 1][j + 1]
					: Math.max(lengths[i + 1][j], lengths[i][j + 1]);
		}
	}
	return lengths;
}

/** Where a change that starts at `was[i]` and `now[j]` ends: the next line both share, or the ends. */
function changeEnd(
	was: readonly string[],
	now: readonly string[],
	lengths: readonly Uint32Array[],
	at: { i: number; j: number },
): { i: number; j: number } {
	let { i, j } = at;
	while (i < was.length || j < now.length) {
		if (i < was.length && j < now.length && was[i] === now[j]) break;
		if (j < now.length && (i === was.length || lengths[i][j + 1] > lengths[i + 1][j])) j += 1;
		else i += 1;
	}
	return { i, j };
}

export function changedRanges(before: string, after: string): Lines[] {
	if (before === after) return [];
	const was = before.split('\n');
	const now = after.split('\n');
	const lengths = commonLengths(was, now);
	const ranges: Lines[] = [];
	let at = { i: 0, j: 0 };
	while (at.i < was.length || at.j < now.length) {
		if (at.i < was.length && at.j < now.length && was[at.i] === now[at.j]) {
			at = { i: at.i + 1, j: at.j + 1 };
			continue;
		}
		const start = at.j;
		at = changeEnd(was, now, lengths, at);
		const from = Math.min(start + 1, now.length);
		ranges.push({ from, to: Math.max(from, at.j) });
	}
	return ranges;
}

/** The profile fields each goal shows. A goal without an entry shows the whole file. */
const EXCERPT_FIELDS: Readonly<Partial<Record<string, readonly string[]>>> = {
	experience: ['inputs', 'outputs', 'tools', 'guardrails'],
	boundaries: ['guardrails'],
	experiment: [
		'type',
		'models',
		'defaultModel',
		'allowModelSelect',
		'live',
		'speech',
		'decision',
		'tools',
	],
};

export type Excerpt = {
	code: string;
	/** For each line of `code`, the 1-based line of the source it was cut from. Absent for added lines. */
	from: (number | undefined)[];
};

/** The statement at the top of the file that starts with `start`, up to its closing line. */
function statementLines(lines: string[], start: string): number[] {
	const first = lines.findIndex((line) => line.startsWith(start));
	if (first < 0) return [];
	const last = lines.findIndex((line, at) => at >= first && /^[)}\]]+;?$/.test(line));
	const end = last < 0 ? first : last;
	return Array.from({ length: end - first + 1 }, (_, at) => first + at);
}

/** The lines of the profile's top-level field `name`: from its key to the line before the next. */
function fieldLines(lines: string[], from: number, name: string): number[] {
	const first = lines.findIndex((line, at) => at > from && line.startsWith(`  ${name}:`));
	if (first < 0) return [];
	let end = first + 1;
	while (end < lines.length && !/^( {2}\w+:|\S)/.test(lines[end])) end += 1;
	return Array.from({ length: end - first }, (_, at) => first + at);
}

/**
 * The fields of the profile that `goal` is about, wrapped in the call that defines them, with the
 * schema the outputs register above it. Fields that sit side by side in the file sit side by side here. The whole file when the goal has no fields.
 */
export function excerptOf(source: string, goal: string): Excerpt | undefined {
	const names = EXCERPT_FIELDS[goal];
	if (!names) return undefined;
	const lines = source.split('\n');
	const define = lines.findIndex((line) => line.startsWith('const profile = defineProfile('));
	if (define < 0) return undefined;
	const shown: { text: string; at: number | undefined }[] = [];
	const add = (text: string, at?: number) => shown.push({ text, at });
	const registered = [
		...(names.includes('tools') ? statementLines(lines, 'registerTool(') : []),
		...(names.includes('outputs') ? statementLines(lines, 'registerStructured(') : []),
	];
	for (const at of registered) add(lines[at], at + 1);
	if (registered.length) add('');
	add('defineProfile({', define + 1);
	let last: number | undefined;
	for (const name of names) {
		const field = fieldLines(lines, define, name);
		if (!field.length) continue;
		const first = field[0];
		if (first !== (last ?? define) + 1) add('  // ...');
		for (const at of field) add(lines[at], at + 1);
		last = field.at(-1);
	}
	add('});');
	return { code: shown.map(({ text }) => text).join('\n'), from: shown.map(({ at }) => at) };
}

/** How many lines the longest goal's excerpt of `source` has: the height the excerpt's pane is set to. */
export function longestExcerpt(source: string): number {
	return Math.max(
		...Object.keys(EXCERPT_FIELDS).map((goal) => excerptOf(source, goal)?.from.length ?? 0),
	);
}

/** The lines of an excerpt that a range of the source covers, as 1-based line numbers of it. */
export function excerptLines(
	{ from }: Excerpt,
	range: Lines | readonly Lines[] | undefined,
): number[] {
	if (!range) return [];
	const ranges = 'from' in range ? [range] : range;
	return from.flatMap((at, index) =>
		at && ranges.some((part) => at >= part.from && at <= part.to) ? [index + 1] : [],
	);
}
