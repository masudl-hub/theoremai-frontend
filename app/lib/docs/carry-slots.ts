import type { CodeSlot } from './schema';

/** One changed stretch, found from both ends. A string changed in place keeps its slot. */
function carryStretch(
	before: string,
	after: string,
	slots: readonly CodeSlot[],
): readonly CodeSlot[] {
	const shortest = Math.min(before.length, after.length);
	let head = 0;
	while (head < shortest && before[head] === after[head]) head += 1;
	let tail = 0;
	while (
		tail < shortest - head &&
		before[before.length - 1 - tail] === after[after.length - 1 - tail]
	) {
		tail += 1;
	}
	const changedEnd = before.length - tail;
	const delta = after.length - before.length;
	return slots.flatMap((slot) => {
		if (slot.end <= head) return [slot];
		if (slot.start >= changedEnd) {
			return [{ ...slot, start: slot.start + delta, end: slot.end + delta }];
		}
		const literal = /^(?:'[^']*'|"[^"]*")/.exec(after.slice(slot.start))?.[0];
		const end = slot.start + (literal?.length ?? 0);
		return literal && slot.start <= head && end >= after.length - tail ? [{ ...slot, end }] : [];
	});
}

/** Each line that `after` keeps from `before`, in order: `[line in before, line in after]`. */
function keptLines(before: readonly string[], after: readonly string[]): [number, number][] {
	const runs = before.map(() => new Array<number>(after.length + 1).fill(0));
	runs.push(new Array<number>(after.length + 1).fill(0));
	for (let i = before.length - 1; i >= 0; i -= 1) {
		for (let j = after.length - 1; j >= 0; j -= 1) {
			runs[i][j] =
				before[i] === after[j] ? runs[i + 1][j + 1] + 1 : Math.max(runs[i + 1][j], runs[i][j + 1]);
		}
	}
	const kept: [number, number][] = [];
	let i = 0;
	let j = 0;
	while (i < before.length && j < after.length) {
		if (before[i] === after[j]) {
			kept.push([i, j]);
			i += 1;
			j += 1;
		} else if (runs[i + 1][j] >= runs[i][j + 1]) {
			i += 1;
		} else {
			j += 1;
		}
	}
	return kept;
}

/** Where each line starts, and one past the end of the text. */
function lineOffsets(lines: readonly string[]): readonly number[] {
	const offsets = [0];
	for (const line of lines) offsets.push(offsets[offsets.length - 1] + line.length + 1);
	return offsets;
}

/** The slots as they sit once `before` became `after`. A kept line keeps its slots, and each change between kept lines is carried on its own. */
export function carrySlots(
	before: string,
	after: string,
	slots: readonly CodeSlot[],
): readonly CodeSlot[] {
	const from = before.split('\n');
	const to = after.split('\n');
	const fromAt = lineOffsets(from);
	const toAt = lineOffsets(to);
	const within = (start: number, end: number) =>
		slots.filter((slot) => slot.start >= start && slot.start < end);
	const moved = (list: readonly CodeSlot[], by: number) =>
		list.map((slot) => ({ ...slot, start: slot.start + by, end: slot.end + by }));

	const carried: CodeSlot[] = [];
	const carry = (fromLine: number, fromEnd: number, toLine: number, toEnd: number) => {
		const start = fromAt[fromLine];
		const changed = carryStretch(
			before.slice(start, fromAt[fromEnd]),
			after.slice(toAt[toLine], toAt[toEnd]),
			moved(within(start, fromAt[fromEnd]), -start),
		);
		carried.push(...moved(changed, toAt[toLine]));
	};

	let i = 0;
	let j = 0;
	for (const [keptFrom, keptTo] of [...keptLines(from, to), [from.length, to.length]]) {
		if (keptFrom - i === keptTo - j) {
			for (let line = 0; line < keptFrom - i; line += 1) {
				carry(i + line, i + line + 1, j + line, j + line + 1);
			}
		} else {
			carry(i, keptFrom, j, keptTo);
		}
		if (keptFrom < from.length) {
			const kept = within(fromAt[keptFrom], fromAt[keptFrom + 1]);
			carried.push(...moved(kept, toAt[keptTo] - fromAt[keptFrom]));
		}
		i = keptFrom + 1;
		j = keptTo + 1;
	}
	return carried;
}
