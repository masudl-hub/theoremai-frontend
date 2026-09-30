import {
	type CreateProviderOptions,
	createProvider,
	type KeyVault,
	type Profile,
	type ProfileDefinition,
} from '@theoremjs/agents';
import {
	streamPlaygroundCall as sharedCall,
	streamPlaygroundInvoke as sharedInvoke,
	streamPlaygroundTurn as sharedTurn,
} from '@theoremjs/playground/runtime';

export { playgroundTraces } from '@theoremjs/playground/runtime';

import { resolveHost } from './resolve-host';

type PlaygroundTurnEnv = {
	GEMINI_API_KEY_FREE_A?: string;
	GEMINI_API_KEY_FREE_B?: string;
	GEMINI_API_KEY_FREE_C?: string;
	OPENROUTER_API_KEY?: string;
	/** Jev's key, for decision models on TypeSafe. */
	'theoremai.typesafe_api_key'?: string;
};

export type { PlaygroundTurnEnv };

/** The site's own key for each provider: free-tier Gemini only, never a paid key. */
function siteKey(env: PlaygroundTurnEnv, provider: string): string | undefined {
	if (provider === 'google') {
		return [env.GEMINI_API_KEY_FREE_A, env.GEMINI_API_KEY_FREE_B, env.GEMINI_API_KEY_FREE_C]
			.map((key) => key?.trim())
			.find(Boolean);
	}
	if (provider === 'openrouter') return env.OPENROUTER_API_KEY?.trim() || undefined;
	if (provider === 'typesafe') return env['theoremai.typesafe_api_key']?.trim() || undefined;
	return undefined;
}

/**
 * The demo fills each slot the profile names with the site's key for the provider that reads it. A
 * slot two providers share gets no key, so a key never reaches a provider it isn't for.
 */
export function playgroundDemoVault(
	env: PlaygroundTurnEnv,
	profile: Profile | ProfileDefinition,
): KeyVault {
	if (!('models' in profile)) return {};
	const top = profile as { key?: string; fallbackKey?: string };
	const readers = new Map<string, Set<string>>();
	for (const binding of Object.values(profile.models) as {
		provider: string;
		key?: string;
		fallbackKey?: string;
	}[]) {
		for (const slot of [binding.key ?? top.key, binding.fallbackKey ?? top.fallbackKey]) {
			if (slot) readers.set(slot, (readers.get(slot) ?? new Set()).add(binding.provider));
		}
	}
	return Object.fromEntries(
		[...readers].map(([slot, providers]) => [
			slot,
			providers.size === 1 ? siteKey(env, [...providers][0]) : undefined,
		]),
	);
}

/** The demo's provider options: one vault holding the site's keys, by the slots the profile names. */
export function playgroundProviders(
	env: PlaygroundTurnEnv,
	profile: Profile,
): CreateProviderOptions {
	return { vault: playgroundDemoVault(env, profile) };
}

function runtime(env: PlaygroundTurnEnv = {}) {
	return {
		mode: 'demo' as const,
		resolveHost,
		provider: (profile: Profile, model?: string) =>
			createProvider(profile, playgroundProviders(env, profile), model),
	};
}

export function streamPlaygroundTurn(
	args: Omit<Parameters<typeof sharedTurn>[0], 'runtime'> & { env?: PlaygroundTurnEnv },
) {
	return sharedTurn({ ...args, runtime: runtime(args.env) });
}
export function streamPlaygroundInvoke(
	args: Omit<Parameters<typeof sharedInvoke>[0], 'runtime'> & { env?: PlaygroundTurnEnv },
) {
	return sharedInvoke({ ...args, runtime: runtime(args.env) });
}
export function streamPlaygroundCall(args: Omit<Parameters<typeof sharedCall>[0], 'runtime'>) {
	return sharedCall({ ...args, runtime: runtime() });
}
