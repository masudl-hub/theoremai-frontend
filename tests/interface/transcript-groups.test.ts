/**
 * Unit checks for transcript turn grouping + Seance-style composition.
 *
 * Run: npx vite-node tests/interface/transcript-groups.test.ts
 */
import assert from 'node:assert/strict';
import type { TranscriptBlock } from 'theorum/interface';
import {
	assistantTurnTools,
	composeAssistantTurn,
	formatWorkDuration,
	groupTranscriptBlocks,
	workStatusLabel,
} from '../../../theorum/react/src/client/transcript-groups.ts';

function ok(label: string) {
	console.log(`  ✓ ${label}`);
}

let failed = 0;

function test(label: string, fn: () => void) {
	try {
		fn();
		ok(label);
	} catch (err) {
		failed += 1;
		const message = err instanceof Error ? err.message : String(err);
		console.error(`  ✗ ${label}: ${message}`);
	}
}

test('groupTranscriptBlocks nests tools with assistant text', () => {
	const blocks = [
		{ id: 'user-1', kind: 'user-text', text: 'hi' },
		{
			id: 'tool-1',
			kind: 'tool',
			tool: { name: 'joke', phase: 'complete', output: { a: 1 } },
		},
		{ id: 'turn-1', kind: 'text', text: 'punchline' },
		{ id: 'user-2', kind: 'user-text', text: 'lol' },
	] as TranscriptBlock[];
	const groups = groupTranscriptBlocks(blocks);
	assert.equal(groups.length, 3);
	assert.equal(groups[0]?.kind, 'user');
	assert.equal(groups[1]?.kind, 'assistant');
	assert.equal(groups[1]?.blocks.length, 2);
	assert.equal(groups[2]?.kind, 'user');
	assert.equal(assistantTurnTools(groups[1]!.blocks).length, 1);
});

test('composeAssistantTurn puts mid-turn text in narration and trailing text in body', () => {
	const blocks = [
		{ id: 'thought-1', kind: 'thought', text: 'plan' },
		{ id: 'nar-1', kind: 'text', text: 'looking that up…' },
		{
			id: 'tool-1',
			kind: 'tool',
			tool: { name: 'search', phase: 'complete', output: { ok: true } },
		},
		{ id: 'ans-1', kind: 'text', text: '**Done.**' },
		{
			id: 'g-1',
			kind: 'grounding',
			grounding: { sources: [{ title: 'Example', uri: 'https://example.com', type: 'web' }] },
		},
	] as TranscriptBlock[];
	const composed = composeAssistantTurn(blocks);
	assert.equal(composed.hasTrace, true);
	assert.deepEqual(
		composed.trace.map((item) => item.kind),
		['reasoning', 'narration', 'tool'],
	);
	assert.equal(composed.body.length, 2);
	assert.equal(composed.body[0]?.kind, 'text');
	assert.equal(composed.body[1]?.kind, 'grounding');
});

test('composeAssistantTurn streams text as narration when tools are active', () => {
	const blocks = [
		{
			id: 'tool-1',
			kind: 'tool',
			tool: { name: 'search', phase: 'running' },
		},
		{ id: 'nar-1', kind: 'text', text: 'still working…' },
	] as TranscriptBlock[];
	const composed = composeAssistantTurn(blocks, { streaming: true });
	assert.equal(composed.body.length, 0);
	assert.equal(composed.trace.length, 2);
	assert.equal(composed.trace[0]?.kind, 'tool');
	assert.equal(composed.trace[1]?.kind, 'narration');
});

test('composeAssistantTurn keeps plain streaming replies in the body', () => {
	const blocks = [{ id: 't-1', kind: 'text', text: 'hello **world**' }] as TranscriptBlock[];
	const composed = composeAssistantTurn(blocks, { streaming: true });
	assert.equal(composed.hasTrace, false);
	assert.equal(composed.body.length, 1);
	assert.equal(composed.body[0]?.kind, 'text');
});

test('workStatusLabel uses Working… / Worked for duration', () => {
	assert.equal(workStatusLabel({ streaming: true, hasTrace: false }), 'Working…');
	assert.equal(workStatusLabel({ streaming: true, hasTrace: true }), 'Working…');
	assert.equal(workStatusLabel({ streaming: false, hasTrace: false }), '');
	assert.equal(
		workStatusLabel({ streaming: false, hasTrace: true, elapsedMs: 2300 }),
		'Worked for 2.3s',
	);
	assert.equal(
		workStatusLabel({ streaming: false, hasTrace: false, elapsedMs: 2300 }),
		'Worked for 2.3s',
	);
	assert.equal(workStatusLabel({ streaming: false, hasTrace: true }), 'Worked');
});

test('formatWorkDuration matches Seance tiers', () => {
	assert.equal(formatWorkDuration(420), '420ms');
	assert.equal(formatWorkDuration(2300), '2.3s');
	assert.equal(formatWorkDuration(12_000), '12s');
	assert.equal(formatWorkDuration(125_000), '2m 5s');
});

if (failed > 0) {
	console.error(`\n${String(failed)} failed`);
	process.exit(1);
}

console.log('\nAll transcript-groups checks passed.');
