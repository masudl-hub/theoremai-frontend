/**
 * Site API handlers — plain `Request` in, `Response` out, no framework imports.
 * Route files only resolve the Cloudflare env and delegate here.
 */
import { type ProfileDefinition, TheoremError } from '@theoremjs/agents';
import type { StructuredRegistration, ToolRegistration } from '@theoremjs/playground';
import type { TheoremReplay, TheoremTurnRequest } from '@theoremjs/react';
import {
	checkRequest,
	steerUnitOf,
	theoremInvokeRequestSchema,
	theoremSteerRequestSchema,
	theoremTurnRequestSchema,
} from '@theoremjs/react/server';
import type { SiteEnv } from '../../cloudflare';
import { badRequestJson, errorMessage, ndjsonEventStream } from './ndjson-stream';
import { playgroundSteerInbox } from './playground-steer';
import {
	type PlaygroundTurnEnv,
	streamPlaygroundInvoke,
	streamPlaygroundTurn,
} from './playground-turn';
import { getKernelPackageVersion, getSubmoduleHead } from './theoremai';

/**
 * The draft every playground request carries beside its Theorem request: the
 * browser authors the profile, so the server compiles it per request.
 */
type PlaygroundDraft = {
	profile: ProfileDefinition;
	customTools?: ToolRegistration[];
	structured?: StructuredRegistration;
};

/** GET /api/kernel — package version and kernel checkout head. */
export function kernelInfo(): Response {
	return Response.json({
		version: getKernelPackageVersion(),
		submoduleHead: getSubmoduleHead(),
	});
}

/** The paused calls a turn walks away from, each with the replay the browser sent for it. */
function walkedAwayCalls(turn: TheoremTurnRequest): { callId: string; replay: TheoremReplay }[] {
	return (turn.abandon ?? []).map((callId) => {
		const replay = turn.replay?.abandon?.[callId];
		if (!replay) {
			// lexicon-exempt: internal diagnostic; the user reads error.request
			throw new TheoremError('request', `turn: no replay for walked-away call ${callId}`);
		}
		return { callId, replay };
	});
}

/** POST /api/playground/turn — NDJSON turn events. */
export async function playgroundTurn(request: Request, env: SiteEnv): Promise<Response> {
	try {
		const draft = await request.json<PlaygroundDraft>();
		const turn = checkRequest(theoremTurnRequestSchema, draft, 'request body');
		return ndjsonEventStream(
			streamPlaygroundTurn({
				profile: draft.profile,
				customTools: draft.customTools ?? [],
				structured: draft.structured,
				input: turn.input,
				previousInteractionId: turn.previousInteractionId,
				sessionPermissions: turn.replay?.sessionPermissions,
				abandon: walkedAwayCalls(turn),
				model: turn.model,
				effort: turn.effort,
				signal: request.signal,
				env,
				steer: playgroundSteerInbox(env.STEER_INBOX),
			}),
			draft.profile.lexicon,
		);
	} catch (err) {
		return badRequestJson(err);
	}
}

/** POST /api/playground/invoke — NDJSON events for the user's answer to a paused call. */
export async function playgroundInvoke(
	request: Request,
	env: PlaygroundTurnEnv,
): Promise<Response> {
	try {
		const draft = await request.json<PlaygroundDraft>();
		const answer = checkRequest(theoremInvokeRequestSchema, draft, 'request body');
		return ndjsonEventStream(
			streamPlaygroundInvoke({
				profile: draft.profile,
				customTools: draft.customTools ?? [],
				structured: draft.structured,
				answer,
				env,
			}),
			draft.profile.lexicon,
		);
	} catch (err) {
		return badRequestJson(err);
	}
}

/** POST /api/playground/turn/steer — queue a mid-turn inject for a running text turn. */
export async function playgroundSteer(request: Request, env: SiteEnv): Promise<Response> {
	try {
		// The inbox the server opened for the turn is the turn id the browser steers.
		const steer = checkRequest(theoremSteerRequestSchema, await request.json(), 'request body');
		if (!(await playgroundSteerInbox(env.STEER_INBOX).enqueue(steer.turnId, steerUnitOf(steer)))) {
			// lexicon-exempt: internal diagnostic; the user reads session.turn_ended
			throw new TheoremError('request', 'steer: no open run has this inbox', {
				copy: { key: 'session.turn_ended' },
			});
		}
		return Response.json({ ok: true });
	} catch (err) {
		return Response.json({ error: errorMessage(err) }, { status: 400 });
	}
}
