/**
 * POST /api/studio/decide — one decision on the site's configured provider key.
 *
 * The browser authors the profile and its questions, so the server takes only
 * the fields a studio decision compiles to, caps what it asks, and holds
 * each visitor address, and the site, to a day's decisions before it spends anything.
 */
import { defineProfile, TheoremError, validateDecisionRequest } from '@theoremjs/agents';
import { caughtStatus, clientError } from '@theoremjs/agents/host';
import type { DecisionProfileDefinition } from '@theoremjs/agents/kernel';
import { readBody } from '@theoremjs/react/server';
import {
	decisionQuestionViolation,
	decisionStateViolation,
	modelBindingViolation,
	modelRoute,
	STUDIO_PROVIDERS,
	studioDecisionRequestSchema,
} from '@theoremjs/studio';
import { failedDecisionTraces, runStudioDecision } from '@theoremjs/studio/runtime';
import { spendAllowance } from './studio-allowance';
import { allowanceStore, type StudioDecideAllowance } from './studio-decide-allowance';
import { studioDemoVault } from './studio-turn';

export type StudioDecideEnv = {
	/** The site's decision provider keys, shared by every visitor. */
	'theoremai.typesafe_api_key'?: string;
	OPENROUTER_API_KEY?: string;
	/** Each day's decisions, per visitor address and for the site (`wrangler.jsonc` `durable_objects`). */
	DECIDE_ALLOWANCE?: DurableObjectNamespace<StudioDecideAllowance>;
};

function json(status: number, body: unknown): Response {
	return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export async function studioDecide(request: Request, env: StudioDecideEnv): Promise<Response> {
	let labels: DecisionProfileDefinition['labels'];
	try {
		const body = await readBody(request, studioDecisionRequestSchema);
		const profile = defineProfile(body.profile as DecisionProfileDefinition);
		labels = profile.labels;
		// Counted only once the request is one configured decision model would answer.
		const binding = Object.values(profile.models)[0];
		const selected = {
			...modelRoute(STUDIO_PROVIDERS, 'decision', binding),
			builtInTools: [],
		};
		const modelViolation = modelBindingViolation(selected);
		if (modelViolation)
			throw new TheoremError('request', `studio decide: ${modelViolation.message}`);
		const stateViolation = decisionStateViolation(selected, body.state);
		if (stateViolation) throw new TheoremError('request', `studio decide: ${stateViolation}`);
		for (const question of Object.values(body.questions)) {
			const violation = decisionQuestionViolation(selected, question);
			if (violation) throw new TheoremError('request', `studio decide: ${violation}`);
		}
		const decisionRequest = {
			profile: profile.id,
			state: body.state,
			questions: body.questions,
			signal: request.signal,
		};
		validateDecisionRequest(decisionRequest, profile);
		const vault = studioDemoVault(env, profile);
		if (!Object.values(vault).some(Boolean))
			throw new TheoremError('auth', 'studio decide: provider key is missing'); // labels-exempt: internal diagnostic
		await spendAllowance(
			env.DECIDE_ALLOWANCE && allowanceStore(env.DECIDE_ALLOWANCE),
			'decision',
			request,
		);
		const { result, traces } = await runStudioDecision(
			{
				agentId: profile.id,
				profile: body.profile,
				customTools: [],
				questions: body.questions,
			},
			body.state as Parameters<typeof runStudioDecision>[1],
			{ vault },
			request.signal,
		);
		return json(200, { result, traces });
	} catch (err) {
		// A failed decision is traced too; the page shows what it left.
		const traces = failedDecisionTraces(err);
		return json(caughtStatus(err), {
			...clientError(err, labels),
			...(traces.length > 0 ? { traces } : {}),
		});
	}
}
