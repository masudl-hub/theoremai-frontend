/**
 * POST /api/playground/decide — one decision on the site's configured provider key.
 *
 * The browser authors the profile and its questions, so the server takes only
 * the fields a playground decision compiles to, caps what it asks, and holds
 * each visitor address, and the site, to a day's decisions before it spends anything.
 */
import {
	createKernelScope,
	defineProfile,
	errorKind,
	publicError,
	resolveObservabilityPolicy,
	TheoremError,
	type TraceRecord,
	validateDecisionRequest,
} from '@theoremjs/agents';
import { caughtStatus } from '@theoremjs/agents/host';
import type { DecisionProfileDefinition } from '@theoremjs/agents/kernel';
import {
	decisionQuestionViolation,
	decisionStateViolation,
	modelBindingViolation,
	playgroundDecisionRequestSchema,
} from '@theoremjs/playground';
import { readBody } from '@theoremjs/react/server';
import { type PlaygroundDecideAllowance, takeAllowance } from './playground-decide-allowance';

export type PlaygroundDecideEnv = {
	/** The site's decision provider keys, shared by every visitor. */
	'theoremai.typesafe_api_key'?: string;
	OPENROUTER_API_KEY?: string;
	/** Each day's decisions, per visitor address and for the site (`wrangler.jsonc` `durable_objects`). */
	DECIDE_ALLOWANCE?: DurableObjectNamespace<PlaygroundDecideAllowance>;
};

function json(status: number, body: unknown): Response {
	return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

/** Spends one of today's decisions for this address; the spent day's cap, or `null` when there was room. With no binding, the house key isn't spent at all. */
function spentCap(
	request: Request,
	allowance: DurableObjectNamespace<PlaygroundDecideAllowance> | undefined,
): Promise<number | null> {
	if (!allowance) {
		// lexicon-exempt: developer contract error
		throw new TheoremError('config', 'playground decide: no DECIDE_ALLOWANCE binding');
	}
	return takeAllowance(allowance, 'decision', request.headers.get('CF-Connecting-IP') ?? 'local');
}

export async function playgroundDecide(
	request: Request,
	env: PlaygroundDecideEnv,
): Promise<Response> {
	let lexicon: DecisionProfileDefinition['lexicon'];
	try {
		const body = await readBody(request, playgroundDecisionRequestSchema);
		const profile = defineProfile(body.profile as DecisionProfileDefinition);
		lexicon = profile.lexicon;
		// Counted only once the request is one configured decision model would answer.
		const binding = Object.values(profile.models)[0];
		const modelViolation = modelBindingViolation({ ...binding, builtInTools: [] });
		if (modelViolation)
			throw new TheoremError('request', `playground decide: ${modelViolation.message}`);
		const stateViolation = decisionStateViolation(binding, body.state);
		if (stateViolation) throw new TheoremError('request', `playground decide: ${stateViolation}`);
		for (const question of Object.values(body.questions)) {
			const violation = decisionQuestionViolation(binding, question);
			if (violation) throw new TheoremError('request', `playground decide: ${violation}`);
		}
		const scope = createKernelScope();
		scope.profiles.register(profile);
		const decisionRequest = {
			profile: profile.id,
			state: body.state,
			questions: body.questions,
			signal: request.signal,
		};
		validateDecisionRequest(decisionRequest, profile);
		const apiKey = (
			binding.provider === 'typesafe' ? env['theoremai.typesafe_api_key'] : env.OPENROUTER_API_KEY
		)?.trim();
		if (!apiKey) throw new TheoremError('auth', 'playground decide: provider key is missing'); // lexicon-exempt: internal diagnostic
		const cap = await spentCap(request, env.DECIDE_ALLOWANCE);
		if (cap !== null) {
			// lexicon-exempt: internal diagnostic; the user reads quota.exhausted
			throw new TheoremError('rate_limit', "playground decide: today's decisions are spent", {
				copy: { key: 'quota.exhausted', params: { perDay: cap } },
			});
		}
		// A recorded decision's trace goes back in the reply; the server writes it nowhere else.
		const traces: TraceRecord[] = [];
		const records = profile.observability
			? resolveObservabilityPolicy(profile.observability).record
			: false;
		const result = await scope.runDecision(decisionRequest, {
			apiKey,
			...(records
				? {
						sink: {
							write: (record) => {
								traces.push(record);
								return Promise.resolve();
							},
						},
					}
				: {}),
		});
		return json(200, { result, traces });
	} catch (err) {
		return json(caughtStatus(err), { error: publicError(err, lexicon), errorKind: errorKind(err) });
	}
}
