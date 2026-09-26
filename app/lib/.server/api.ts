/**
 * Site API handlers — plain `Request` in, `Response` out, no framework imports.
 * Route files only resolve the Cloudflare env and delegate here.
 */
import {
	type ProfileDefinition,
	TheoremError,
	type TurnInput,
	type TurnRequest,
} from '@theoremai/agents';
import { credentialFromTypedSecret, type TurnToolSnapshot } from '@theoremai/agents/kernel';
import type { StructuredRegistration, ToolRegistration } from '@theoremai/playground';
import { parseSteerUnit } from '@theoremai/react/server';
import { badRequestJson, errorMessage, ndjsonEventStream } from './ndjson-stream';
import { playgroundSteerInbox } from './playground-steer';
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
	input: TurnInput;
};

type InvokeBody = {
	profile: ProfileDefinition;
	customTools?: ToolRegistration[];
	structured?: StructuredRegistration;
	/** The paused call this approval runs, so its result settles that call. */
	callId?: string;
	name: string;
	input: unknown;
	resume?: { value?: unknown; granted?: boolean };
	sessionPermissions?: string[];
	/** A key typed at a bearer or API-key sign-in gate; the server makes the credential. */
	secret?: string;
	turnInput?: TurnInput;
	snapshot?: TurnToolSnapshot;
	promoted?: string[];
	model?: string;
	path?: string;
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
				signal: request.signal,
				env,
			}),
			body.profile.lexicon,
		);
	} catch (err) {
		return badRequestJson(err);
	}
}

/**
 * The typed key as the credential its tool's auth slot waits for. The tool's
 * own auth config decides the kind; the request only carries the text.
 */
function typedCredentials(body: InvokeBody): TurnRequest['credentials'] {
	if (body.secret === undefined) return undefined;
	const tool = body.customTools?.find((registration) => registration.name === body.name);
	const auth = tool && tool.type !== 'function' ? tool.auth : undefined;
	if (!auth) throw new Error(`Tool "${body.name}" takes no typed credential`);
	return { [auth.slot]: credentialFromTypedSecret(auth.type, body.secret) };
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
					callId: body.callId,
					name: body.name,
					input: body.input,
					resume: body.resume,
					sessionPermissions: body.sessionPermissions,
					credentials: typedCredentials(body),
					turnInput: body.turnInput,
					model: body.model,
					snapshot: body.snapshot,
					promoted: body.promoted,
					path: body.path,
				},
				env,
			}),
			body.profile.lexicon,
		);
	} catch (err) {
		return badRequestJson(err);
	}
}

/** POST /api/playground/turn/steer — queue a mid-turn inject for a turn or live session. */
export async function playgroundSteer(request: Request): Promise<Response> {
	try {
		const body: unknown = await request.json();
		const inboxId =
			typeof body === 'object' && body !== null && 'inbox' in body && typeof body.inbox === 'string'
				? body.inbox.trim()
				: '';
		if (!inboxId) {
			return Response.json({ error: 'inbox is required' }, { status: 400 });
		}
		if (!(await playgroundSteerInbox.enqueue(inboxId, parseSteerUnit(body)))) {
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
