import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOUNDARIES, DETECT_DEFAULTS, DETECTORS } from '@theoremjs/agents/guardrails';
import { BOUNDARY_TOTAL, CHECKS_BY_DEFAULT, DEFAULT_READS } from '../app/lib/home-guardrail-checks.ts';

const reads = (detector: (typeof DETECTORS)[number]) =>
	BOUNDARIES.filter((boundary) => DETECT_DEFAULTS[detector][boundary] !== 'ignore').length;

test('the costs screen counts the checks the package runs by default', () => {
	assert.deepEqual(
		DEFAULT_READS.map(({ detector, count }) => [detector, count]),
		DETECTORS.map((detector) => [detector, reads(detector)]),
	);
	assert.equal(CHECKS_BY_DEFAULT, DETECTORS.reduce((sum, detector) => sum + reads(detector), 0));
	assert.equal(BOUNDARY_TOTAL, BOUNDARIES.length);
});
