/**
 * POST /api/playground/probe — one text sent across one guardrail boundary of
 * the draft, on a scripted model: no key is spent and no host is reached. A
 * probe no guardrail acted on is kept as sent, for review.
 */
import { errorKind, type ProfileDefinition, publicError, z } from '@theoremjs/agents';
import { caughtStatus } from '@theoremjs/agents/host';
import {
	type GuardrailProbeResult,
	type PlaygroundDependency,
	PROBE_BOUNDARIES,
	PROBE_TEXT_LIMIT,
	type ProbeBoundary,
	runGuardrailProbe,
	type StructuredRegistration,
	type ToolRegistration,
} from '@theoremjs/playground';
import { readBody } from '@theoremjs/react/server';

/** A probe no guardrail acted on. */
export type ProbeMiss = {
	boundary: ProbeBoundary;
	text: string;
	/** The draft's guardrails as written. */
	guardrails: unknown;
	events: GuardrailProbeResult['guardrails'];
	passed?: string;
};

export type ProbeMissLog = (miss: ProbeMiss, at: Date) => Promise<void>;

/** The misses table (`migrations/0001_probe_misses.sql`), each row with the kernel version that ran it. */
export function d1MissLog(db: D1Database, kernel: string): ProbeMissLog {
	return async (miss, at) => {
		await db
			.prepare(
				'INSERT INTO probe_misses (at, boundary, text, guardrails, events, passed, kernel) VALUES (?, ?, ?, ?, ?, ?, ?)',
			)
			.bind(
				at.toISOString(),
				miss.boundary,
				miss.text,
				JSON.stringify(miss.guardrails ?? null),
				JSON.stringify(miss.events),
				miss.passed ?? null,
				kernel,
			)
			.run();
	};
}

function part<T>() {
	return z.custom<T>((value) => typeof value === 'object' && value !== null);
}

/** The draft as every playground request carries it, and the probe. The kernel checks the draft when it registers it. */
const probeRequestSchema = z.object({
	profile: part<ProfileDefinition>(),
	customTools: z.array(part<ToolRegistration>()).optional(),
	structured: part<StructuredRegistration>().optional(),
	dependencies: z.array(part<PlaygroundDependency>()).optional(),
	probe: z.object({
		boundary: z.enum(PROBE_BOUNDARIES),
		text: z.string().min(1).max(PROBE_TEXT_LIMIT),
	}),
});

function json(status: number, body: unknown): Response {
	return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

/**
 * Runs the probe and answers with what the guardrails did. `log` gets a miss
 * through `defer`, after the answer: a log that fails never fails a probe.
 */
export async function playgroundProbe(
	request: Request,
	log: ProbeMissLog | undefined,
	defer: (work: Promise<unknown>) => void,
): Promise<Response> {
	let lexicon: ProfileDefinition['lexicon'];
	try {
		const body = await readBody(request, probeRequestSchema);
		lexicon = body.profile.lexicon;
		const result = await runGuardrailProbe({
			profile: body.profile,
			customTools: body.customTools ?? [],
			structured: body.structured,
			dependencies: body.dependencies,
			probe: body.probe,
			signal: request.signal,
		});
		if (!result.hit && log) {
			const miss: ProbeMiss = {
				boundary: body.probe.boundary,
				text: body.probe.text,
				guardrails: body.profile.guardrails,
				events: result.guardrails,
				passed: result.passed,
			};
			defer(
				log(miss, new Date()).catch((error: unknown) => {
					console.error('probe miss not logged', error);
				}),
			);
		}
		return json(200, result);
	} catch (err) {
		return json(caughtStatus(err), { error: publicError(err, lexicon), errorKind: errorKind(err) });
	}
}
