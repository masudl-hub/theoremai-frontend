import type { ProfileDefinition, TraceRecord, TurnEvent, TurnInput } from '@theoremai/agents';
import {
	createProvider,
	invokeTool,
	registerTraceDestination,
	runTurn,
	TheoremError,
} from '@theoremai/agents';
import type { InvokeToolRequest } from '@theoremai/agents/kernel';
import {
	createPlaygroundTraceRouter,
	PLAYGROUND_TRACE_DESTINATION,
	type PlaygroundTraceLine,
	type StructuredRegistration,
	type ToolRegistration,
} from '@theoremai/playground';
import { registerPlaygroundProfile } from './playground-register';
import {
	closePlaygroundSteerInbox,
	consumePlaygroundSteerWithRetry,
	openPlaygroundSteerInbox,
} from './playground-steer';
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

function createPlaygroundProvider(
	profile: ReturnType<typeof registerPlaygroundProfile>,
	env: PlaygroundTurnEnv,
) {
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
	turnId?: string;
	signal?: AbortSignal;
	env?: PlaygroundTurnEnv;
}): AsyncGenerator<TurnEvent | PlaygroundTraceLine> {
	const profile = registerPlaygroundProfile(args.profile, args.customTools, args.structured);
	assertNotLiveProfile(profile.type, 'turn runner — use runSession');

	const provider = createPlaygroundProvider(profile, args.env ?? {});
	const turnId = args.turnId;
	if (turnId) await openPlaygroundSteerInbox(turnId);

	try {
		yield* withRunTraces((metadata) =>
			runTurn(
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
					...(turnId
						? {
								onStage: async ({ stage }) => {
									if (stage !== 'pre_turn' && stage !== 'post_tool' && stage !== 'before_end') {
										return;
									}
									const inject = await consumePlaygroundSteerWithRetry(turnId);
									return inject?.length ? { inject } : undefined;
								},
							}
						: {}),
				},
				provider,
			),
		);
	} finally {
		if (turnId) await closePlaygroundSteerInbox(turnId);
	}
}

export async function* streamPlaygroundInvoke(args: {
	profile: ProfileDefinition;
	customTools: ToolRegistration[];
	structured?: StructuredRegistration;
	request: Omit<InvokeToolRequest, 'profile'>;
	env?: PlaygroundTurnEnv;
}): AsyncGenerator<TurnEvent | PlaygroundTraceLine> {
	const profile = registerPlaygroundProfile(args.profile, args.customTools, args.structured);
	assertNotLiveProfile(profile.type, 'invoke');

	yield* withRunTraces((metadata) =>
		invokeTool({
			profile: profile.id,
			...args.request,
			resolveHost,
			metadata: { ...args.request.metadata, ...metadata },
		}),
	);
}
