import { defineProfile, type ProfileDefinition, TheoremError, z } from '@theoremjs/agents';
import { caughtStatus, clientError } from '@theoremjs/agents/host';
import type { EmbeddingProfileDefinition } from '@theoremjs/agents/kernel';
import { failedDecisionTraces } from '@theoremjs/react/client';
import { readBody } from '@theoremjs/react/server';
import { modelRoute, STUDIO_PROVIDERS } from '@theoremjs/studio';
import { runStudioEmbedding } from '@theoremjs/studio/runtime';
import { SITE_KEYS } from '../studio-keys';
import { type StudioTurnEnv, studioDemoVault } from './studio-turn';

const studioEmbeddingRequestSchema = z.object({
	profile: z.record(z.string(), z.unknown()),
	input: z.unknown(),
	model: z.string().min(1).optional(),
});

export async function studioEmbedding(request: Request, env: StudioTurnEnv): Promise<Response> {
	let labels: EmbeddingProfileDefinition['labels'];
	try {
		const body = await readBody(request, studioEmbeddingRequestSchema);
		const profile = defineProfile(body.profile as ProfileDefinition);
		if (profile.type !== 'embedding')
			throw new TheoremError('request', 'studio embedding requires an embedding profile.');
		labels = profile.labels;
		const binding = Object.values(profile.models)[0];
		const selected = { ...modelRoute(STUDIO_PROVIDERS, 'embedding', binding), builtInTools: [] };
		const violation = SITE_KEYS.violation(selected);
		if (violation) throw new TheoremError('request', `studio embedding: ${violation.message}`);
		const vault = studioDemoVault(env, profile);
		if (!Object.values(vault).some(Boolean))
			throw new TheoremError('auth', 'studio embedding: provider key is missing');
		const { result, traces } = await runStudioEmbedding(
			{
				agentId: profile.id,
				profile: body.profile as EmbeddingProfileDefinition,
				customTools: [],
			},
			{ input: body.input as never, ...(body.model === undefined ? {} : { model: body.model }) },
			{ mode: 'demo', keys: SITE_KEYS, hostOptions: () => ({ vault }) },
		);
		return Response.json({ result, traces }, { headers: { 'cache-control': 'no-store' } });
	} catch (err) {
		console.error('studio embedding error', err);
		const traces = failedDecisionTraces(err);
		return Response.json(
			{ ...clientError(err, labels), ...(traces.length ? { traces } : {}) },
			{ status: caughtStatus(err), headers: { 'cache-control': 'no-store' } },
		);
	}
}
