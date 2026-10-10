import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOUNDARIES, DETECTOR_BOUNDARIES, DETECTORS } from '@theoremjs/agents/guardrails';
import { BOUNDARY_NAMES, DETECTOR_CHECKS } from '../app/lib/home-guardrail-checks.ts';

test('the costs screen reads the package for every check', () => {
	assert.deepEqual([...BOUNDARY_NAMES], [...BOUNDARIES]);
	assert.deepEqual(
		DETECTOR_CHECKS.map(({ detector, at }) => [detector, [...at]]),
		DETECTORS.map((detector) => [detector, [...DETECTOR_BOUNDARIES[detector]]]),
	);
});
