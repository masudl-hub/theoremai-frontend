import type { ProfileDefinition, TurnEvent, TurnInput } from 'theorum';
import { createProvider, invokeTool, runTurn } from 'theorum';
import type { InvokeToolRequest } from 'theorum/kernel';
import type { StructuredRegistration, ToolRegistration } from '$lib/playground/types';
import { registerPlaygroundProfile } from './playground-register';

type PlaygroundTurnEnv = {
	GEMINI_API_KEY?: string;
	GEMINI_API_KEY_FREE_A?: string;
	GEMINI_API_KEY_FREE_B?: string;
	GEMINI_API_KEY_FREE_C?: string;
	OPENROUTER_API_KEY?: string;
};

export type { PlaygroundTurnEnv };

function geminiVault(env: PlaygroundTurnEnv) {
	const slotA = env.GEMINI_API_KEY_FREE_A?.trim() ?? env.GEMINI_API_KEY?.trim();
	if (!slotA) return undefined;
	return {
		slotA,
		slotB: env.GEMINI_API_KEY_FREE_B?.trim(),
		slotC: env.GEMINI_API_KEY_FREE_C?.trim(),
		paid: env.GEMINI_API_KEY?.trim(),
	};
}

function openRouterVault(env: PlaygroundTurnEnv) {
	const key = env.OPENROUTER_API_KEY?.trim();
	if (!key) return undefined;
	return { apiKey: key };
}

function assertNotLiveProfile(profileType: string, action: string): void {
	if (profileType === 'live') {
		throw new Error(`Playground ${action} does not support live profiles.`);
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
	env?: PlaygroundTurnEnv;
}): AsyncGenerator<TurnEvent> {
	const profile = registerPlaygroundProfile(args.profile, args.customTools, args.structured);
	assertNotLiveProfile(profile.type, 'turn runner — use runSession');

	const provider = createPlaygroundProvider(profile, args.env ?? {});

	for await (const event of runTurn(
		{
			profile: profile.id,
			input: args.input,
			previousInteractionId: args.previousInteractionId,
			sessionPermissions: args.sessionPermissions,
			...(args.model ? { model: args.model } : {}),
			...(args.effort ? { effort: args.effort } : {}),
		},
		provider,
	)) {
		yield event;
	}
}

export async function* streamPlaygroundInvoke(args: {
	profile: ProfileDefinition;
	customTools: ToolRegistration[];
	structured?: StructuredRegistration;
	request: Omit<InvokeToolRequest, 'profile'>;
	env?: PlaygroundTurnEnv;
}): AsyncGenerator<TurnEvent> {
	const profile = registerPlaygroundProfile(args.profile, args.customTools, args.structured);
	assertNotLiveProfile(profile.type, 'invoke');

	for await (const event of invokeTool({
		profile: profile.id,
		...args.request,
	})) {
		yield event;
	}
}
