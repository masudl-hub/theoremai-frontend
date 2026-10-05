/** End a docs check: print every problem and exit 1, or do nothing when there are none. */
export function failOn(problems) {
	if (problems.length === 0) return;
	console.error(problems.join('\n'));
	process.exit(1);
}
