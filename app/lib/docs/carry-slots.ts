import type { CodeSlot } from './schema';

/** The slots as they sit once `before` became `after`: one changed stretch, found from both ends. A string changed in place keeps its slot. */
export function carrySlots(
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
