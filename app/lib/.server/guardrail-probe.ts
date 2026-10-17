/**
 * The site's probe log: each probed text some guardrail boundary let through, kept as sent, with
 * every boundary's answer, for review, and for `PROBE_RETENTION_DAYS`. The probe itself is the
 * studio package's (`@theoremjs/studio/server`).
 */
import type { ProbeEntry } from '@theoremjs/studio/server';

export type ProbeLog = (entry: ProbeEntry, at: Date) => Promise<void>;

/** How long a kept probe stays: long enough to review, and no visitor's text is held past it. */
export const PROBE_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The probe tables (`migrations/0001_probe_log.sql`): one `probes` row with the
 * kernel version that ran it, and one `probe_answers` row a boundary.
 */
export function d1ProbeLog(db: D1Database, kernel: string): ProbeLog {
	return async (entry, at) => {
		const id = crypto.randomUUID();
		await db.batch([
			db
				.prepare('INSERT INTO probes (id, at, text, guardrails, kernel) VALUES (?, ?, ?, ?, ?)')
				.bind(id, at.toISOString(), entry.text, JSON.stringify(entry.guardrails ?? null), kernel),
			...entry.answers.map((answer) =>
				db
					.prepare(
						'INSERT INTO probe_answers (probe, boundary, status, taint, events, passed) VALUES (?, ?, ?, ?, ?, ?)',
					)
					.bind(
						id,
						answer.boundary,
						answer.status,
						answer.taint ?? null,
						JSON.stringify(answer.guardrails),
						answer.passed ?? null,
					),
			),
		]);
	};
}

/**
 * Takes away every probe kept longer than `PROBE_RETENTION_DAYS`, with its answers. The Worker
 * runs it once a day (`wrangler.jsonc` `triggers`), so a text leaves whether or not another comes.
 */
export async function pruneProbeLog(db: D1Database, now: Date): Promise<void> {
	const expired = new Date(now.getTime() - PROBE_RETENTION_DAYS * DAY_MS).toISOString();
	await db.batch([
		db
			.prepare('DELETE FROM probe_answers WHERE probe IN (SELECT id FROM probes WHERE at < ?)')
			.bind(expired),
		db.prepare('DELETE FROM probes WHERE at < ?').bind(expired),
	]);
}
