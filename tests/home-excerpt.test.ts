import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changedLines, excerptLines, excerptOf } from '../app/lib/home-excerpt.ts';

const SOURCE = [
	"import { defineProfile } from '@theoremjs/agents';",
	'',
	"registerStructured('itinerary', {",
	"  type: 'object',",
	'});',
	'',
	'const profile = defineProfile({',
	"  type: 'text',",
	'  inputs: {',
	'    attachments: {',
	"      accept: ['image/*'],",
	'    },',
	'  },',
	'  models: {',
	'    smart: {},',
	'  },',
	'  outputs: {',
	"    mode: 'structured',",
	'  },',
	'  maxSteps: 12,',
	'});',
	'',
	'registerProfile(profile);',
].join('\n');

test('a goal shows only its fields, the registered schema and the call that holds them', () => {
	const shown = excerptOf(SOURCE, 'source-of-truth');
	assert.equal(
		shown?.code,
		[
			"registerStructured('itinerary', {",
			"  type: 'object',",
			'});',
			'',
			'defineProfile({',
			'  inputs: {',
			'    attachments: {',
			"      accept: ['image/*'],",
			'    },',
			'  },',
			'  // ...',
			'  outputs: {',
			"    mode: 'structured',",
			'  },',
			'});',
		].join('\n'),
	);
});

test('a goal with no fields has no excerpt', () => {
	assert.equal(excerptOf(SOURCE, 'boundaries'), undefined);
});

test('a change in the source marks the same lines of the excerpt', () => {
	const after = SOURCE.replace("['image/*']", "['image/*', 'text/csv']");
	const shown = excerptOf(after, 'source-of-truth');
	const range = changedLines(SOURCE, after);
	assert.deepEqual(shown && excerptLines(shown, range), [8]);
});

test('the model goal shows what runs and what it makes, with no schema above it', () => {
	assert.equal(
		excerptOf(SOURCE, 'experiment')?.code,
		[
			'defineProfile({',
			"  type: 'text',",
			'  // ...',
			'  models: {',
			'    smart: {},',
			'  },',
			'});',
		].join('\n'),
	);
});
