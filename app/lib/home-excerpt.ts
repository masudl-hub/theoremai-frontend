/**
 * A goal's slice of the agent's file: the profile fields the goal is about, cut out of the whole
 * source with the number of each line it came from. Pure text, so the screen can show it in a
 * plain code block.
 */

export type Lines = { from: number; to: number };

/** How many unchanged lines may sit inside one change: the brackets that close a new block. */
const CHANGE_GAP = 3;

/**
 * The lines of `after` that are not in `before`, as a 1-based range. A change can write in more
 * than one place, an import and the profile for one, and the last place is the profile's. A
 * removal is one line.
 */
export function changedLines(before: string, after: string): Lines | undefined {
	if (before === after) return undefined;
	const was = before.split('\n');
	const now = after.split('\n');
	let top = 0;
	while (top < was.length && top < now.length && was[top] === now[top]) top += 1;
	let tail = 0;
	while (
		tail < was.length - top &&
		tail < now.length - top &&
		was[was.length - 1 - tail] === now[now.length - 1 - tail]
	)
		tail += 1;
	const end = now.length - tail;
	const old = new Set(was);
	const fresh: number[] = [];
	for (let line = top; line < end; line += 1) if (!old.has(now[line])) fresh.push(line);
	const last = fresh.at(-1);
	if (last === undefined) return { from: top + 1, to: Math.max(top + 1, end) };
	let first = last;
	for (const line of fresh.toReversed()) {
		if (first - line > CHANGE_GAP) break;
		first = line;
	}
	return { from: first + 1, to: (end - 1 - last <= CHANGE_GAP ? end - 1 : last) + 1 };
}

/** The profile fields each goal shows. A goal without an entry shows the whole file. */
const EXCERPT_FIELDS: Readonly<Partial<Record<string, readonly string[]>>> = {
	'source-of-truth': ['inputs', 'outputs'],
	experiment: ['type', 'models', 'defaultModel', 'allowModelSelect'],
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
	const registered = names.includes('outputs') ? statementLines(lines, 'registerStructured(') : [];
	for (const at of registered) add(lines[at], at + 1);
	if (registered.length) add('');
	add('defineProfile({', define + 1);
	let last: number | undefined;
	for (const name of names) {
		const field = fieldLines(lines, define, name);
		if (!field.length) continue;
		const first = field[0];
		if (last !== undefined && first !== last + 1) add('  // ...');
		for (const at of field) add(lines[at], at + 1);
		last = field.at(-1);
	}
	add('});');
	return { code: shown.map(({ text }) => text).join('\n'), from: shown.map(({ at }) => at) };
}

/** The lines of an excerpt that a range of the source covers, as 1-based line numbers of it. */
export function excerptLines({ from }: Excerpt, range: Lines | undefined): number[] {
	if (!range) return [];
	return from.flatMap((at, index) => (at && at >= range.from && at <= range.to ? [index + 1] : []));
}
