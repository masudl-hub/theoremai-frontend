import assert from 'node:assert/strict';
import { test } from 'node:test';
import { d1ProbeLog, PROBE_RETENTION_DAYS, pruneProbeLog } from '../app/lib/.server/guardrail-probe.ts';

test('the D1 log writes the probe and one row a boundary, in one batch', async () => {
	const batches: unknown[][][] = [];
	const db = {
		prepare: (sql: string) => ({ bind: (...values: unknown[]) => [sql, ...values] }),
		batch: (statements: unknown[][]) => {
			batches.push(statements);
			return Promise.resolve([]);
		},
	} as unknown as D1Database;
	await d1ProbeLog(db, '1.2.3')(
		{
			text: 'hello',
			guardrails: undefined,
			answers: [
				{ boundary: 'reply', status: 'passed', guardrails: [], passed: 'hello' },
				{ boundary: 'tool_result_remote', status: 'flagged', taint: 'steered', guardrails: [] },
			],
		},
		new Date('2026-10-05T12:00:00Z'),
	);
	const id = batches[0]?.[0]?.[1];
	assert.equal(typeof id, 'string');
	assert.deepEqual(batches, [
		[
			[
				'INSERT INTO probes (id, at, text, guardrails, kernel) VALUES (?, ?, ?, ?, ?)',
				id,
				'2026-10-05T12:00:00.000Z',
				'hello',
				'null',
				'1.2.3',
			],
			[
				'INSERT INTO probe_answers (probe, boundary, status, taint, events, passed) VALUES (?, ?, ?, ?, ?, ?)',
				id,
				'reply',
				'passed',
				null,
				'[]',
				'hello',
			],
			[
				'INSERT INTO probe_answers (probe, boundary, status, taint, events, passed) VALUES (?, ?, ?, ?, ?, ?)',
				id,
				'tool_result_remote',
				'flagged',
				'steered',
				'[]',
				null,
			],
		],
	]);
});

test('the daily prune takes away the probes kept past their days, answers first', async () => {
	const batches: unknown[][][] = [];
	const db = {
		prepare: (sql: string) => ({ bind: (...values: unknown[]) => [sql, ...values] }),
		batch: (statements: unknown[][]) => {
			batches.push(statements);
			return Promise.resolve([]);
		},
	} as unknown as D1Database;
	await pruneProbeLog(db, new Date('2026-10-05T12:00:00Z'));
	assert.equal(PROBE_RETENTION_DAYS, 30);
	assert.deepEqual(batches, [
		[
			[
				'DELETE FROM probe_answers WHERE probe IN (SELECT id FROM probes WHERE at < ?)',
				'2026-09-05T12:00:00.000Z',
			],
			['DELETE FROM probes WHERE at < ?', '2026-09-05T12:00:00.000Z'],
		],
	]);
});
