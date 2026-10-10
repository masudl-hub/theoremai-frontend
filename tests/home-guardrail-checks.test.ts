import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DETECTOR_BOUNDARIES, DETECTORS } from '@theoremjs/agents/guardrails';
import { BOUNDARIES_CHECKED, DETECTOR_BOUNDARY_COUNTS } from '../app/lib/home-guardrail-checks.ts';

test('the costs screen counts the package own checks', () => {
	assert.deepEqual(
		DETECTOR_BOUNDARY_COUNTS.map(({ detector, count }) => [detector, count]),
		DETECTORS.map((detector) => [detector, DETECTOR_BOUNDARIES[detector].length]),
	);
	assert.equal(
		BOUNDARIES_CHECKED,
		DETECTORS.reduce((sum, detector) => sum + DETECTOR_BOUNDARIES[detector].length, 0),
	);
});
