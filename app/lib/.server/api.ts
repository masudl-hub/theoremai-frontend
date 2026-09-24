/**
 * Site API handlers — plain `Request` in, `Response` out, no framework imports.
 * Route files only resolve the Cloudflare env and delegate here.
 */
import type {
	ProfileDefinition,
	TurnHistoryMessage,
	TurnInput,
	TurnRequest,
} from '@theoremai/agents';
import type { TurnToolSnapshot } from '@theoremai/agents/kernel';
import type { StructuredRegistration, ToolRegistration } from '@theoremai/playground';
import { badRequestJson, errorMessage, ndjsonEventStream } from './ndjson-stream';
import { registerPlaygroundProfile } from './playground-register';
import { enqueuePlaygroundSteer, openPlaygroundSteerInbox } from './playground-steer';
import {
	type PlaygroundTurnEnv,
	streamPlaygroundInvoke,
	streamPlaygroundTurn,
} from './playground-turn';
import { getKernelPackageVersion, getSubmoduleHead } from './theoremai';

type TurnBody = {
	profile: ProfileDefinition;
	customTools?: ToolRegistration[];
	structured?: StructuredRegistration;
	previousInteractionId?: string;
	sessionPermissions?: string[];
	model?: string;
	effort?: string;
	turnId?: string;
	input: TurnInput;
};

type InvokeBody = {
	profile: ProfileDefinition;
	customTools?: ToolRegistration[];
	structured?: StructuredRegistration;
	name: string;
	input: unknown;
	resume?: { value?: unknown; granted?: boolean };
	sessionPermissions?: string[];
	credentials?: TurnRequest['credentials'];
	turnInput?: TurnInput;
	snapshot?: TurnToolSnapshot;
	promoted?: string[];
	model?: string;
	path?: string;
};

type RegisterBody = {
	profile: ProfileDefinition;
	customTools?: ToolRegistration[];
};

type SteerBody = {
	/** Text turn id. */
	turnId?: string;
	/** Live session id (same inbox as turnId). */
	sessionId?: string;
	inject?: TurnHistoryMessage[];
};

/** GET /api/kernel — package version and kernel checkout head. */
export function kernelInfo(): Response {
	return Response.json({
		version: getKernelPackageVersion(),
		submoduleHead: getSubmoduleHead(),
	});
}

/** POST /api/playground/turn — NDJSON turn events. */
export async function playgroundTurn(request: Request, env: PlaygroundTurnEnv): Promise<Response> {
	try {
		const body = await request.json<TurnBody>();
		return ndjsonEventStream(
			streamPlaygroundTurn({
				profile: body.profile,
				customTools: body.customTools ?? [],
				structured: body.structured,
				input: body.input,
				previousInteractionId: body.previousInteractionId,
				sessionPermissions: body.sessionPermissions,
				model: body.model,
				effort: body.effort,
				turnId: body.turnId,
				signal: request.signal,
				env,
			}),
		);
	} catch (err) {
		return badRequestJson(err);
	}
}

/** POST /api/playground/invoke — NDJSON events for one tool call. */
export async function playgroundInvoke(
	request: Request,
	env: PlaygroundTurnEnv,
): Promise<Response> {
	try {
		const body = await request.json<InvokeBody>();
		return ndjsonEventStream(
			streamPlaygroundInvoke({
				profile: body.profile,
				customTools: body.customTools ?? [],
				structured: body.structured,
				request: {
					name: body.name,
					input: body.input,
					resume: body.resume,
					sessionPermissions: body.sessionPermissions,
					credentials: body.credentials,
					turnInput: body.turnInput,
					model: body.model,
					snapshot: body.snapshot,
					promoted: body.promoted,
					path: body.path,
				},
				env,
			}),
		);
	} catch (err) {
		return badRequestJson(err);
	}
}

/** POST /api/playground/live/register — register a live draft before the relay opens. */
export async function playgroundLiveRegister(request: Request): Promise<Response> {
	try {
		const body = await request.json<RegisterBody>();
		if (body.profile.type !== 'live') {
			return Response.json({ error: 'Profile is not type live' }, { status: 400 });
		}
		const profile = registerPlaygroundProfile(body.profile, body.customTools ?? []);
		return Response.json({ profileId: profile.id });
	} catch (err) {
		return badRequestJson(err);
	}
}

/** POST /api/playground/turn/steer — queue a mid-turn inject for a turn or live session. */
export async function playgroundSteer(request: Request): Promise<Response> {
	try {
		const body = await request.json<SteerBody>();
		const inboxId = body.sessionId?.trim() || body.turnId?.trim();
		if (!inboxId) {
			return Response.json({ error: 'turnId or sessionId is required' }, { status: 400 });
		}
		if (!Array.isArray(body.inject) || body.inject.length === 0) {
			return Response.json({ error: 'inject must be a non-empty array' }, { status: 400 });
		}
		await openPlaygroundSteerInbox(inboxId);
		await enqueuePlaygroundSteer(inboxId, body.inject);
		return Response.json({ ok: true });
	} catch (err) {
		return Response.json({ error: errorMessage(err) }, { status: 400 });
	}
}
