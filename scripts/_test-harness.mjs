export function ok(label) {
	console.log(`  ✓ ${label}`);
}

export function createTestRunner() {
	let failed = 0;

	function test(label, fn) {
		try {
			fn();
			ok(label);
		} catch (err) {
			failed += 1;
			const message = err instanceof Error ? err.message : String(err);
			console.error(`  ✗ ${label}: ${message}`);
		}
	}

	function exit() {
		if (failed > 0) {
			console.error(`\n${String(failed)} test(s) failed`);
			process.exit(1);
		}
		console.log('\nAll tests passed');
	}

	return { test, get failed() { return failed; }, exit };
}
