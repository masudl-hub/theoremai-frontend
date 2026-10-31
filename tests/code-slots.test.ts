import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carrySlots } from '../app/lib/docs/carry-slots.ts';
import { sampleProgram } from '../app/lib/docs/sample-program.ts';

const names = { root: ['defineProfile'], host: ['base'] };
const choices = [{ value: 'before' }, { value: 'after' }];

test('a framed sample maps each program line back to its own line, past hoisted imports', () => {
	const code = "import { z } from 'zod';\nmodels: {\n\t// ...\n},";
	const program = sampleProgram(code, 'models', names);
	const lines = program.text.split('\n');
	assert.equal(lines[program.firstLine], 'models: {');
	assert.equal(lines[program.firstLine + 1], '\t...baseBinding,');
	assert.deepEqual(program.sourceLines, [1, 2, 3]);
});

test('a whole program stays as written, after its heads', () => {
	const code = "import { x } from 'y';\nx();";
	const program = sampleProgram(code, undefined, names);
	assert.equal(program.text.split('\n')[program.firstLine], code.split('\n')[0]);
	assert.deepEqual(program.sourceLines, [0, 1]);
});

test('a swapped string keeps its slot, and a slot after it moves', () => {
	const before = "timing: 'before', mode: 'sse'";
	const after = "timing: 'after', mode: 'sse'";
	const slots = [
		{ start: 8, end: 16, choices },
		{ start: 24, end: 29, choices },
	];
	assert.deepEqual(
		carrySlots(before, after, slots).map(({ start, end }) => after.slice(start, end)),
		["'after'", "'sse'"],
	);
});

test('a row added or removed elsewhere moves the slots after it, and leaves those before', () => {
	const before = "a: 'x',\nb: 'y',";
	const after = "a: 'x',\nnew: 1,\nb: 'y',";
	const slots = [
		{ start: 3, end: 6, choices },
		{ start: 11, end: 14, choices },
	];
	assert.deepEqual(
		carrySlots(before, after, slots).map(({ start, end }) => after.slice(start, end)),
		["'x'", "'y'"],
	);
	assert.deepEqual(carrySlots(after, before, carrySlots(before, after, slots)), slots);
});

test('a slot whose string went away goes with it', () => {
	const slots = [{ start: 3, end: 6, choices }];
	assert.deepEqual(carrySlots("a: 'x',", 'a: 1,', slots), []);
});
