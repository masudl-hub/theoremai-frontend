/**
 * Site API handlers — plain `Request` in, `Response` out, no framework imports.
 * Route files only resolve the Cloudflare env and delegate here.
 */
import { errorKind, type ProfileDefinition, publicError, TheoremError, z } from '@theoremjs/agents';
import { caughtStatus } from '@theoremjs/agents/host';
import type {
	PlaygroundDependency,
	StructuredRegistration,
	ToolRegistration,
} from '@theoremjs/playground';
import type { TheoremReplay, TheoremTurnRequest } from '@theoremjs/react';
import {
	checkRequest,
	steerUnitOf,
	theoremHostCallRequestSchema,
	theoremInvokeRequestSchema,
	theoremSteerRequestSchema,
	theoremTurnRequestSchema,
} from '@theoremjs/react/server';
import type { SiteEnv } from '../../cloudflare';
import { badRequestJson, errorMessage, ndjsonEventStream } from './ndjson-stream';
import { takeAllowance, visitorAddress } from './playground-allowance';
import { allowanceStore } from './playground-decide-allowance';
import { playgroundSteerInbox } from './playground-steer';
import {
	streamPlaygroundCall,
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
	/** The agents this one's agent tools and compaction name, registered before it. */
	dependencies?: PlaygroundDependency[];
};

/**
 * Each agent tool call runs a real model turn, so it spends one of today's
 * requests for this address before its agent runs. Once they are spent, the
 * calling model reads the refusal and the turn goes on without it.
 */
function agentCallAllowance(request: Request, env: SiteEnv) {
	return async () => {
		if (!env.DECIDE_ALLOWANCE) return { refuse: 'This agent is not available here.' };
		const store = allowanceStore(env.DECIDE_ALLOWANCE);
		const cap = await takeAllowance(store, 'request', visitorAddress(request));
		return cap === null ? undefined : { refuse: "Today's playground requests are spent." };
	};
}

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
				dependencies: draft.dependencies,
				input: turn.input,
				providerState: turn.providerState,
				sessionPermissions: turn.replay?.sessionPermissions,
				abandon: walkedAwayCalls(turn),
				model: turn.model,
				effort: turn.effort,
				signal: request.signal,
				env,
				onAgentCall: agentCallAllowance(request, env),
				steer: playgroundSteerInbox(env.STEER_INBOX),
			}),
			draft.profile.lexicon,
		);
	} catch (err) {
		return badRequestJson(err);
	}
}

/** POST /api/playground/invoke — NDJSON events for the user's answer to a paused call. */
export async function playgroundInvoke(request: Request, env: SiteEnv): Promise<Response> {
	try {
		const draft = await request.json<PlaygroundDraft>();
		const answer = checkRequest(theoremInvokeRequestSchema, draft, 'request body');
		return ndjsonEventStream(
			streamPlaygroundInvoke({
				profile: draft.profile,
				customTools: draft.customTools ?? [],
				structured: draft.structured,
				dependencies: draft.dependencies,
				answer,
				env,
				onAgentCall: agentCallAllowance(request, env),
			}),
			draft.profile.lexicon,
		);
	} catch (err) {
		return badRequestJson(err);
	}
}

/** The tools a page allowed for the rest of its visit, as the browser holds them. */
const pagePermissions = z.array(z.string().min(1).max(128)).max(256).optional();

/** Spends one of today's calls for this address; with no binding, nothing runs at all. */
async function takeCall(request: Request, env: SiteEnv): Promise<void> {
	if (!env.DECIDE_ALLOWANCE) {
		// lexicon-exempt: developer contract error
		throw new TheoremError('config', 'playground call: no DECIDE_ALLOWANCE binding');
	}
	const cap = await takeAllowance(
		allowanceStore(env.DECIDE_ALLOWANCE),
		'call',
		visitorAddress(request),
	);
	if (cap !== null) {
		// lexicon-exempt: internal diagnostic; the user reads quota.exhausted
		throw new TheoremError('rate_limit', "playground call: today's calls are spent", {
			copy: { key: 'quota.exhausted', params: { perDay: cap } },
		});
	}
}

/**
 * POST /api/playground/call — NDJSON events for one call of a host draft's
 * tool. Each visitor address, and the site, gets a day's calls: the tools run
 * on the site's own network.
 */
export async function playgroundCall(request: Request, env: SiteEnv): Promise<Response> {
	let draft: (PlaygroundDraft & { sessionPermissions?: unknown }) | undefined;
	try {
		draft = await request.json<PlaygroundDraft & { sessionPermissions?: unknown }>();
		const call = checkRequest(theoremHostCallRequestSchema, draft, 'request body');
		const sessionPermissions = checkRequest(
			pagePermissions,
			draft.sessionPermissions,
			'session permissions',
		);
		// Counted only once the request is one a host would run.
		await takeCall(request, env);
		return ndjsonEventStream(
			streamPlaygroundCall({
				profile: draft.profile,
				customTools: draft.customTools ?? [],
				dependencies: draft.dependencies,
				call,
				sessionPermissions,
				signal: request.signal,
				env,
				onAgentCall: agentCallAllowance(request, env),
			}),
			draft.profile.lexicon,
		);
	} catch (err) {
		if (!(err instanceof TheoremError) || err.kind === 'request') return badRequestJson(err);
		return Response.json(
			{ error: publicError(err, draft?.profile.lexicon), errorKind: errorKind(err) },
			{ status: caughtStatus(err), headers: { 'cache-control': 'no-store' } },
		);
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
