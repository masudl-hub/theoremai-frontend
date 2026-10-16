/**
 * Site API handlers — plain `Request` in, `Response` out, no framework imports.
 * Route files only resolve the Cloudflare env and delegate here.
 */
import { type ProfileDefinition, TheoremError, z } from '@theoremjs/agents';
import {
	checkRequest,
	createSealedConversationStore,
	pageToolResultSchema,
	readBody,
	steerUnitOf,
	type TheoremSessionBoundary,
	theoremConversationRequestSchema,
	theoremHostCallRequestSchema,
	theoremInvokeRequestSchema,
	theoremRewindRequestSchema,
	theoremSteerRequestSchema,
	theoremTurnRequestSchema,
} from '@theoremjs/react/server';
import type { StructuredRegistration, StudioDependency, ToolRegistration } from '@theoremjs/studio';
import { newConversationKey } from '@theoremjs/studio/runtime';
import type { SiteEnv } from '../../cloudflare';
import { HOME_EXCHANGE } from '../home-agent-chat';
import { errorJson, ndjsonEventStream } from './ndjson-stream';
import { spendAllowance } from './studio-allowance';
import { allowanceStore } from './studio-decide-allowance';
import { recordStudioSession, sessionResponse, studioSession } from './studio-session';
import { studioSteerInbox } from './studio-steer';
import {
	readStudioConversation,
	rewindStudioConversation,
	startStudioChat,
	streamStudioCall,
	streamStudioHostInvoke,
	streamStudioInvoke,
	streamStudioTurn,
} from './studio-turn';
import { getKernelPackageVersion, getSubmoduleHead } from './theoremai';

/**
 * The draft every studio request carries beside its Theorem request: the
 * browser authors the profile, so the server compiles it per request.
 */
type StudioDraft = {
	profile: ProfileDefinition;
	customTools?: ToolRegistration[];
	structured?: StructuredRegistration;
	/** The agents this one's agent tools and compaction name, registered before it. */
	dependencies?: StudioDependency[];
};

/**
 * Each agent tool call runs a real model turn, so it spends one of today's
 * requests for this address before its agent runs. Once they are spent, the
 * calling model reads the refusal and the turn goes on without it.
 */
function agentCallAllowance(request: Request, env: SiteEnv) {
	return async () => {
		try {
			await spendAllowance(
				env.DECIDE_ALLOWANCE && allowanceStore(env.DECIDE_ALLOWANCE),
				'request',
				request,
			);
			return undefined;
		} catch (err) {
			const spent = err instanceof TheoremError && err.kind === 'rate_limit';
			return {
				refuse: spent ? "Today's studio requests are spent." : 'This agent is not available here.',
			};
		}
	};
}

/** GET /api/kernel — package version and kernel checkout head. */
export function kernelInfo(): Response {
	return Response.json({
		version: getKernelPackageVersion(),
		submoduleHead: getSubmoduleHead(),
	});
}

/**
 * Where the demo's chats keep their conversations: sealed into the ref the page holds, with a key
 * this server instance makes. Its sessions are held in memory, so they end with it, and a key of
 * the same lifetime opens every ref they can still use.
 */
const conversationStore = createSealedConversationStore({
	keys: { 1: newConversationKey() },
	keyVersion: 1,
});

/** The conversations of the session `boundary` holds. */
function conversationsOf(boundary: TheoremSessionBoundary) {
	return { sessionId: boundary.sessionId, store: conversationStore };
}

/** The labels a failed request's reply is worded with: its draft's, once the body is read. */
function draftLabels(draft: StudioDraft | undefined): ProfileDefinition['labels'] {
	// The body is unchecked when most failures are caught, so the draft may hold anything.
	return (draft as { profile?: Partial<ProfileDefinition> } | null | undefined)?.profile?.labels;
}

/** A studio request: its draft read, its session opened, and a failure worded with the draft's labels. */
async function draftRequest(
	request: Request,
	handle: (draft: StudioDraft, boundary: TheoremSessionBoundary) => Response | Promise<Response>,
): Promise<Response> {
	let draft: StudioDraft | undefined;
	try {
		draft = (await readBody(request, z.unknown())) as StudioDraft;
		return await handle(draft, await studioSession(request));
	} catch (err) {
		return errorJson(err, draftLabels(draft));
	}
}

/** POST /api/studio/turn — NDJSON turn events. */
export async function studioTurn(request: Request, env: SiteEnv): Promise<Response> {
	return draftRequest(request, (draft, boundary) => {
		const turn = checkRequest(theoremTurnRequestSchema, draft, 'request body');
		return sessionResponse(
			boundary,
			ndjsonEventStream(
				recordStudioSession(
					boundary,
					streamStudioTurn({
						...draftRun(draft, boundary, request, env),
						request: turn,
						conversations: conversationsOf(boundary),
						signal: request.signal,
						steer: studioSteerInbox(env.STEER_INBOX),
					}),
				),
				draft.profile.labels,
			),
		);
	});
}

/** POST /api/studio/invoke — NDJSON events for the user's answer to a paused call. */
export async function studioInvoke(request: Request, env: SiteEnv): Promise<Response> {
	return draftRequest(request, (draft, boundary) => {
		const answer = checkRequest(theoremInvokeRequestSchema, draft, 'request body');
		const run = draftRun(draft, boundary, request, env);
		return sessionResponse(
			boundary,
			ndjsonEventStream(
				recordStudioSession(
					boundary,
					draft.profile.type === 'host'
						? streamStudioHostInvoke({ ...run, answer, signal: request.signal })
						: streamStudioInvoke({
								...run,
								answer,
								conversations: conversationsOf(boundary),
								signal: request.signal,
							}),
				),
				draft.profile.labels,
			),
		);
	});
}

/** POST /api/studio/conversation — the conversation under a ref, as the page draws it. */
export async function studioConversation(request: Request, env: SiteEnv): Promise<Response> {
	return draftRequest(request, async (draft, boundary) => {
		const read = checkRequest(theoremConversationRequestSchema, draft, 'request body');
		const view = await readStudioConversation(
			draftRun(draft, boundary, request, env),
			conversationsOf(boundary),
			read,
		);
		return sessionResponse(boundary, Response.json(view));
	});
}

/** POST /api/home/start — the goals screen's opening exchange, as a conversation of this session's. */
export async function homeStart(request: Request, env: SiteEnv): Promise<Response> {
	return draftRequest(request, async (draft, boundary) => {
		const started = await startStudioChat(
			draftRun(draft, boundary, request, env),
			conversationsOf(boundary),
			HOME_EXCHANGE,
		);
		return sessionResponse(boundary, Response.json(started));
	});
}

/** POST /api/studio/rewind — the conversation cut after one block, under a new ref. */
export async function studioRewind(request: Request, env: SiteEnv): Promise<Response> {
	return draftRequest(request, async (draft, boundary) => {
		const rewind = checkRequest(theoremRewindRequestSchema, draft, 'request body');
		const rewound = await rewindStudioConversation(
			draftRun(draft, boundary, request, env),
			conversationsOf(boundary),
			rewind,
			request.signal,
		);
		return sessionResponse(boundary, Response.json(rewound));
	});
}

/** A draft as a run takes it, on this session's tool execution and the site's keys. */
function draftRun(
	draft: StudioDraft,
	boundary: TheoremSessionBoundary,
	request: Request,
	env: SiteEnv,
) {
	return {
		profile: draft.profile,
		customTools: draft.customTools ?? [],
		structured: draft.structured,
		dependencies: draft.dependencies,
		execution: boundary.toolExecution,
		pageExecution: boundary.pageExecution,
		env,
		onAgentCall: agentCallAllowance(request, env),
	};
}

/** The tools a page allowed for the rest of its visit, as the browser holds them. */
const pagePermissions = z.array(z.string().min(1).max(128)).max(256).optional();

/**
 * POST /api/studio/call — NDJSON events for one call of a host draft's
 * tool. Each visitor address, and the site, gets a day's calls: the tools run
 * on the site's own network.
 */
export async function studioCall(request: Request, env: SiteEnv): Promise<Response> {
	let draft: (StudioDraft & { sessionPermissions?: unknown }) | undefined;
	try {
		draft = (await readBody(request, z.unknown())) as StudioDraft & {
			sessionPermissions?: unknown;
		};
		const boundary = await studioSession(request);
		const call = checkRequest(theoremHostCallRequestSchema, draft, 'request body');
		const sessionPermissions = checkRequest(
			pagePermissions,
			draft.sessionPermissions,
			'session permissions',
		);
		// Counted only once the request is one a host would run.
		await spendAllowance(
			env.DECIDE_ALLOWANCE && allowanceStore(env.DECIDE_ALLOWANCE),
			'call',
			request,
		);
		return sessionResponse(
			boundary,
			ndjsonEventStream(
				recordStudioSession(
					boundary,
					streamStudioCall({
						profile: draft.profile,
						customTools: draft.customTools ?? [],
						dependencies: draft.dependencies,
						call,
						execution: boundary.toolExecution,
						pageExecution: boundary.pageExecution,
						sessionPermissions,
						signal: request.signal,
						env,
						onAgentCall: agentCallAllowance(request, env),
					}),
				),
				draft.profile.labels,
			),
		);
	} catch (err) {
		return errorJson(err, draftLabels(draft));
	}
}

/** POST /api/studio/turn/steer — queue a mid-turn inject for a running text turn. */
export async function studioSteer(request: Request, env: SiteEnv): Promise<Response> {
	try {
		// The inbox the server opened for the turn is the turn id the browser steers.
		const steer = checkRequest(
			theoremSteerRequestSchema,
			await readBody(request, z.unknown()),
			'request body',
		);
		if (!(await studioSteerInbox(env.STEER_INBOX).enqueue(steer.turnId, steerUnitOf(steer)))) {
			// labels-exempt: internal diagnostic; the user reads session.turn_ended
			throw new TheoremError('request', 'steer: no open run has this inbox', {
				copy: { key: 'session.turn_ended' },
			});
		}
		return Response.json({ ok: true });
	} catch (err) {
		return errorJson(err);
	}
}

export async function studioPageResult(request: Request): Promise<Response> {
	try {
		const boundary = await studioSession(request);
		const result = await readBody(request, pageToolResultSchema);
		await boundary.answerPageResult(result);
		return sessionResponse(boundary, Response.json({ accepted: true }));
	} catch (error) {
		return errorJson(error);
	}
}
