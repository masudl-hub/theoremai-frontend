/**
 * POST /api/studio/probe — one text sent across every guardrail boundary of
 * the draft, each on a scripted model: no key is spent and no host is reached.
 * A text some boundary let through untouched is kept as sent, with every
 * boundary's answer, for review. With `only`, the draft reads with that
 * detector alone and nothing is kept: what the others would catch passes there.
 */
import { errorKind, type ProfileDefinition, publicError, z } from '@theoremjs/agents';
import { caughtStatus } from '@theoremjs/agents/host';
import { readBody } from '@theoremjs/react/server';
import {
	type GuardrailProbeAnswer,
	PROBE_BATTERY,
	PROBE_TEXT_LIMIT,
	runGuardrailProbes,
	type StructuredRegistration,
	type StudioDependency,
	type ToolRegistration,
} from '@theoremjs/studio';

/** A probed text and what each boundary's guardrails did with it. */
export type ProbeEntry = {
	text: string;
	/** The draft's guardrails as written. */
	guardrails: unknown;
	answers: readonly Pick<
		GuardrailProbeAnswer,
		'boundary' | 'status' | 'taint' | 'guardrails' | 'passed'
	>[];
};

export type ProbeLog = (entry: ProbeEntry, at: Date) => Promise<void>;

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

function part<T>() {
	return z.custom<T>((value) => typeof value === 'object' && value !== null);
}

/** The draft as every studio request carries it, and the text to probe with. The kernel checks the draft when it registers it. */
const probeRequestSchema = z.object({
	profile: part<ProfileDefinition>(),
	customTools: z.array(part<ToolRegistration>()).optional(),
	structured: part<StructuredRegistration>().optional(),
	dependencies: z.array(part<StudioDependency>()).optional(),
	text: z.string().min(1).max(PROBE_TEXT_LIMIT),
	only: z.string().min(1).max(200).optional(),
});

function json(status: number, body: unknown): Response {
	return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

/** A battery text is known already: what passes it is no news to a reviewer. */
function isBatteryText(text: string): boolean {
	return PROBE_BATTERY.some((entry) => entry.text === text);
}

/**
 * Runs the text across every boundary and answers with what the guardrails did
 * at each. `log` gets a text some boundary passed through `defer`, after the
 * answer: a log that fails never fails a probe.
 */
export async function studioProbe(
	request: Request,
	log: ProbeLog | undefined,
	defer: (work: Promise<unknown>) => void,
): Promise<Response> {
	let lexicon: ProfileDefinition['lexicon'];
	try {
		const body = await readBody(request, probeRequestSchema);
		lexicon = body.profile.lexicon;
		const answers = await runGuardrailProbes({
			profile: body.profile,
			customTools: body.customTools ?? [],
			structured: body.structured,
			dependencies: body.dependencies,
			text: body.text,
			only: body.only,
			signal: request.signal,
		});
		const isNews =
			body.only === undefined &&
			answers.some((answer) => answer.status === 'passed') &&
			!isBatteryText(body.text);
		if (log && isNews) {
			defer(
				log({ text: body.text, guardrails: body.profile.guardrails, answers }, new Date()).catch(
					(error: unknown) => {
						console.error('probe not logged', error);
					},
				),
			);
		}
		return json(200, { answers });
	} catch (err) {
		return json(caughtStatus(err), { error: publicError(err, lexicon), errorKind: errorKind(err) });
	}
}
