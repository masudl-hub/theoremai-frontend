import type {
	Profile,
	ProfileDefinition,
	TraceRecord,
	TurnEvent,
	TurnInput,
} from '@theoremai/agents';
import { createProvider, registerTraceDestination, TheoremError, z } from '@theoremai/agents';
import type { GateAnswerRequest } from '@theoremai/agents/kernel';
import { answerGatedCall, type HeldGatedCall, type RegisteredTool } from '@theoremai/agents/kernel';
import {
	createPlaygroundTraceRouter,
	PLAYGROUND_TRACE_DESTINATION,
	type PlaygroundSteerLine,
	type PlaygroundTraceLine,
	type StructuredRegistration,
	type ToolRegistration,
} from '@theoremai/playground';
import type { TheoremInvokeRequest, TheoremReplay } from '@theoremai/react';
import {
	checkRequest,
	checkWalkAway,
	type SteerInbox,
	steerStage,
	type WalkedAwayCall,
	walkAway,
} from '@theoremai/react/server';
import { playgroundScope } from './playground-register';
import { resolveHost } from './resolve-host';

type PlaygroundTurnEnv = {
	GEMINI_API_KEY_FREE_A?: string;
	GEMINI_API_KEY_FREE_B?: string;
	GEMINI_API_KEY_FREE_C?: string;
	OPENROUTER_API_KEY?: string;
};

export type { PlaygroundTurnEnv };

// Profiles that write to the playground destination get their records back on the run's own stream.
export const playgroundTraces = createPlaygroundTraceRouter();
registerTraceDestination(PLAYGROUND_TRACE_DESTINATION, playgroundTraces.sink);

/**
 * Streams one run's events, then the trace records it wrote. The kernel writes
 * a run's records before the run returns or throws, so a failed run still
 * delivers them ahead of its failure.
 */
async function* withRunTraces(
	run: (metadata: Record<string, string>) => AsyncIterable<TurnEvent>,
): AsyncGenerator<TurnEvent | PlaygroundTraceLine> {
	const records: TraceRecord[] = [];
	const traces = playgroundTraces.route((record) => records.push(record));
	let failure: { error: unknown } | undefined;
	try {
		yield* run(traces.metadata);
	} catch (error) {
		failure = { error };
	} finally {
		traces.close();
	}
	for (const record of records) yield { type: 'trace', record };
	if (failure) throw failure.error;
}

function geminiVault(env: PlaygroundTurnEnv) {
	const slotA = env.GEMINI_API_KEY_FREE_A?.trim();
	if (!slotA) return undefined;
	return {
		slotA,
		slotB: env.GEMINI_API_KEY_FREE_B?.trim(),
		slotC: env.GEMINI_API_KEY_FREE_C?.trim(),
		// The playground never spends on a paid key, so a quota refusal has nowhere to overflow.
		paid: undefined,
	};
}

function openRouterVault(env: PlaygroundTurnEnv) {
	const key = env.OPENROUTER_API_KEY?.trim();
	if (!key) return undefined;
	return { apiKey: key };
}

function assertNotLiveProfile(profileType: string, action: string): void {
	if (profileType === 'live') {
		throw new TheoremError('request', `Playground ${action} does not support live profiles.`);
	}
}

function createPlaygroundProvider(profile: Profile, env: PlaygroundTurnEnv) {
	const gemini = geminiVault(env);
	const openAiGateway = openRouterVault(env);
	return createProvider(profile, {
		...(gemini ? { gemini: { vault: gemini } } : {}),
		...(openAiGateway ? { openAiGateway } : {}),
	});
}

export async function* streamPlaygroundTurn(args: {
	profile: ProfileDefinition;
	customTools: ToolRegistration[];
	structured?: StructuredRegistration;
	input: TurnInput;
	previousInteractionId?: string;
	sessionPermissions?: string[];
	model?: string;
	effort?: string;
	signal?: AbortSignal;
	env?: PlaygroundTurnEnv;
	/** Where the turn's mid-turn steers queue. */
	steer: SteerInbox;
	/** The paused calls the message walks away from, each as the browser replays it. */
	abandon?: { callId: string; replay: TheoremReplay }[];
}): AsyncGenerator<TurnEvent | PlaygroundTraceLine | PlaygroundSteerLine> {
	const { scope, profile } = playgroundScope(args.profile, args.customTools, args.structured);
	assertNotLiveProfile(profile.type, 'turn runner — use runSession');
	const abandon = args.abandon ?? [];
	if (abandon.length) {
		checkWalkAway(
			args.input,
			abandon.map(({ callId }) => callId),
		);
	}
	// Answered up front, so a refused call starts nothing.
	const walked = abandon.map(({ callId, replay }) => ({
		callId,
		invoke: answerReplayed(scope, profile.id, { callId, decision: 'abandon' }, replay),
	}));

	const provider = createPlaygroundProvider(profile, args.env ?? {});
	// Random and picked here, so only the run's own browser can steer it.
	const inbox = globalThis.crypto.randomUUID();
	await args.steer.open(inbox);
	const steerLine: PlaygroundSteerLine = { type: 'steer_inbox', inbox };
	yield steerLine;

	try {
		yield* withRunTraces(async function* (metadata) {
			const calls: WalkedAwayCall[] = walked.map(({ callId, invoke }) => ({
				callId,
				events: scope.invokeTool({ ...invoke, metadata }),
			}));
			const input = calls.length ? yield* walkAway(args.input, calls) : args.input;
			if (!input) return;
			yield* scope.runTurn(
				{
					profile: profile.id,
					metadata,
					input,
					previousInteractionId: args.previousInteractionId,
					sessionPermissions: args.sessionPermissions,
					resolveHost,
					signal: args.signal,
					...(args.model ? { model: args.model } : {}),
					...(args.effort ? { effort: args.effort } : {}),
					onStage: steerStage(args.steer, inbox),
				},
				provider,
			);
		});
	} finally {
		await args.steer.close(inbox);
	}
}

/** The model's input to the paused call, as the browser replays it. */
const modelArguments = z.record(z.string(), z.unknown());

/** The gate a tool waits on: its permission tier, and the slot a sign-in gate fills. */
function heldGate(tool: RegisteredTool): Pick<HeldGatedCall, 'permission' | 'auth'> {
	const auth = tool.type === 'http' || tool.type === 'mcp' ? tool.auth : undefined;
	return {
		permission: tool.permission,
		...(auth ? { auth: { slot: auth.slot, authType: auth.type } } : {}),
	};
}

type PlaygroundScope = ReturnType<typeof playgroundScope>['scope'];

/**
 * The user's answer to a paused call. The playground keeps no session, so the
 * browser replays the call; its gate comes from the draft's registered tool,
 * and the answer settles it by the rule every Theorem host uses. Returns the
 * run that settles it, less its trace metadata.
 */
function answerReplayed(
	scope: PlaygroundScope,
	profile: string,
	request: GateAnswerRequest,
	replay: TheoremReplay,
): Omit<Parameters<PlaygroundScope['invokeTool']>[0], 'metadata'> {
	const tool = replay.name === undefined ? undefined : scope.tools.get(replay.name);
	if (!tool) {
		// lexicon-exempt: internal diagnostic; the user reads error.request
		throw new TheoremError('request', 'invoke: the paused call names no tool in this draft');
	}
	const answered = answerGatedCall(
		request,
		{
			name: tool.name,
			arguments: checkRequest(modelArguments, replay.input, 'replayed call input'),
			...heldGate(tool),
		},
		replay.sessionPermissions ?? [],
	);
	return {
		profile,
		name: tool.name,
		callId: request.callId,
		input: answered.input,
		resume: answered.resume,
		sessionPermissions: answered.sessionPermissions,
		...(answered.typed
			? { credentials: { [answered.typed.slot]: answered.typed.credential } }
			: {}),
		turnInput: replay.turnInput,
		snapshot: replay.snapshot,
		promoted: replay.promoted,
		model: replay.model,
		path: replay.path,
		resolveHost,
	};
}

/** The user's answer to a paused call, streamed. */
export async function* streamPlaygroundInvoke(args: {
	profile: ProfileDefinition;
	customTools: ToolRegistration[];
	structured?: StructuredRegistration;
	answer: TheoremInvokeRequest;
	env?: PlaygroundTurnEnv;
}): AsyncGenerator<TurnEvent | PlaygroundTraceLine> {
	const { scope, profile } = playgroundScope(args.profile, args.customTools, args.structured);
	assertNotLiveProfile(profile.type, 'invoke');
	const { gateId, decision, input, secret, replay = {} } = args.answer;
	const invoke = answerReplayed(
		scope,
		profile.id,
		{ callId: gateId, decision, input, secret },
		replay,
	);
	yield* withRunTraces((metadata) => scope.invokeTool({ ...invoke, metadata }));
}
