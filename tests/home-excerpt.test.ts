import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changedRanges, excerptLines, excerptOf } from '../app/lib/home-excerpt.ts';

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
	const shown = excerptOf(SOURCE, 'experience');
	assert.equal(
		shown?.code,
		[
			"registerStructured('itinerary', {",
			"  type: 'object',",
			'});',
			'',
			'defineProfile({',
			'  // ...',
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
	assert.equal(excerptOf(SOURCE, 'showcase'), undefined);
});

test('a change in the source marks the same lines of the excerpt', () => {
	const after = SOURCE.replace("['image/*']", "['image/*', 'text/csv']");
	const shown = excerptOf(after, 'experience');
	const range = changedRanges(SOURCE, after);
	assert.deepEqual(shown && excerptLines(shown, range), [9]);
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

test('experience includes tool permissions and profile safeguards beside the interaction fields', () => {
	const source = [
		'registerTool({',
		"  name: 'get_weather',",
		"  permission: 'always_confirm',",
		'});',
		SOURCE.replace('  maxSteps: 12,', "  tools: { allow: ['get_weather'] },\n  guardrails: { canary: true },\n  maxSteps: 12,"),
	].join('\n');
	const shown = excerptOf(source, 'experience');
	assert.ok(shown?.code.includes("permission: 'always_confirm'"));
	assert.ok(shown?.code.includes("tools: { allow: ['get_weather'] }"));
	assert.ok(shown?.code.includes('guardrails: { canary: true }'));
	const line = source.split('\n').findIndex((text) => text.includes('permission:')) + 1;
	assert.deepEqual(shown && excerptLines(shown, { from: line, to: line }), [3]);
});


test('all separated edits are marked, including inserted lines that repeat existing text', () => {
	const before = 'header\nold tool\nseparator\nold input\nfooter';
	const after = 'header\nnew tool\nseparator\nnew input\nseparator\nfooter';
	assert.deepEqual(changedRanges(before, after), [{ from: 2, to: 2 }, { from: 4, to: 5 }]);
});

test('deletions mark their surviving location and unchanged source has no marks', () => {
	assert.deepEqual(changedRanges('one\ntwo\nthree', 'one\nthree'), [{ from: 2, to: 2 }]);
	assert.deepEqual(changedRanges(SOURCE, SOURCE), []);
});
