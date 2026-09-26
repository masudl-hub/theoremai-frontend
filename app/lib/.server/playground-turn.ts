import type {
	Profile,
	ProfileDefinition,
	TraceRecord,
	TurnEvent,
	TurnInput,
} from '@theoremai/agents';
import { createProvider, registerTraceDestination, TheoremError, z } from '@theoremai/agents';
import { answerGatedCall, type HeldGatedCall, type RegisteredTool } from '@theoremai/agents/kernel';
import {
	createPlaygroundTraceRouter,
	PLAYGROUND_TRACE_DESTINATION,
	type PlaygroundSteerLine,
	type PlaygroundTraceLine,
	type StructuredRegistration,
	type ToolRegistration,
} from '@theoremai/playground';
import type { TheoremInvokeRequest } from '@theoremai/react';
import { checkRequest, type SteerInbox, steerStage } from '@theoremai/react/server';
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
}): AsyncGenerator<TurnEvent | PlaygroundTraceLine | PlaygroundSteerLine> {
	const { scope, profile } = playgroundScope(args.profile, args.customTools, args.structured);
	assertNotLiveProfile(profile.type, 'turn runner — use runSession');

	const provider = createPlaygroundProvider(profile, args.env ?? {});
	// Random and picked here, so only the run's own browser can steer it.
	const inbox = globalThis.crypto.randomUUID();
	await args.steer.open(inbox);
	const steerLine: PlaygroundSteerLine = { type: 'steer_inbox', inbox };
	yield steerLine;

	try {
		yield* withRunTraces((metadata) =>
			scope.runTurn(
				{
					profile: profile.id,
					metadata,
					input: args.input,
					previousInteractionId: args.previousInteractionId,
					sessionPermissions: args.sessionPermissions,
					resolveHost,
					signal: args.signal,
					...(args.model ? { model: args.model } : {}),
					...(args.effort ? { effort: args.effort } : {}),
					onStage: steerStage(args.steer, inbox),
				},
				provider,
			),
		);
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

/**
 * The user's answer to a paused call. The playground keeps no session, so the
 * browser replays the call; its gate comes from the draft's registered tool,
 * and the answer settles it by the rule every Theorem host uses.
 */
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
	const tool = replay.name === undefined ? undefined : scope.tools.get(replay.name);
	if (!tool) {
		// lexicon-exempt: internal diagnostic; the user reads error.request
		throw new TheoremError('request', 'invoke: the paused call names no tool in this draft');
	}
	const answered = answerGatedCall(
		{ callId: gateId, decision, input, secret },
		{
			name: tool.name,
			arguments: checkRequest(modelArguments, replay.input, 'replayed call input'),
			...heldGate(tool),
		},
		replay.sessionPermissions ?? [],
	);
	yield* withRunTraces((metadata) =>
		scope.invokeTool({
			profile: profile.id,
			name: tool.name,
			callId: gateId,
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
			metadata,
		}),
	);
}
