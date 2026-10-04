import {
	type CreateProviderOptions,
	createProvider,
	type KeyVault,
	type Profile,
	type ProfileDefinition,
} from '@theoremjs/agents';
import {
	type PlaygroundRuntime,
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

/**
 * The site's own keys for each provider, in order: free-tier Gemini only, never a paid key. A
 * profile's key slot gets the first; a slot it names only as a fallback gets the second.
 */
function siteKey(env: PlaygroundTurnEnv, provider: string, rank: 0 | 1): string | undefined {
	const keys =
		provider === 'google'
			? [env.GEMINI_API_KEY_FREE_A, env.GEMINI_API_KEY_FREE_B, env.GEMINI_API_KEY_FREE_C]
			: provider === 'openrouter'
				? [env.OPENROUTER_API_KEY]
				: provider === 'typesafe'
					? [env['theoremai.typesafe_api_key']]
					: [];
	return keys.map((key) => key?.trim()).filter(Boolean)[rank];
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
	const primary = new Set<string>();
	for (const binding of Object.values(profile.models) as {
		provider: string;
		key?: string;
		fallbackKey?: string;
	}[]) {
		const key = binding.key ?? top.key;
		if (key) primary.add(key);
		for (const slot of [key, binding.fallbackKey ?? top.fallbackKey]) {
			if (slot) readers.set(slot, (readers.get(slot) ?? new Set()).add(binding.provider));
		}
	}
	return Object.fromEntries(
		[...readers].map(([slot, providers]) => [
			slot,
			providers.size === 1 ? siteKey(env, [...providers][0], primary.has(slot) ? 0 : 1) : undefined,
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

/** What a run needs beside its request: the site's keys, and the check each agent call passes first. */
export type RunHost = { env?: PlaygroundTurnEnv; onAgentCall?: PlaygroundRuntime['onAgentCall'] };

function runtime({ env = {}, onAgentCall }: RunHost): PlaygroundRuntime {
	return {
		mode: 'demo',
		resolveHost,
		provider: (profile: Profile, model?: string) =>
			createProvider(profile, playgroundProviders(env, profile), model),
		onAgentCall,
	};
}

export function streamPlaygroundTurn({
	env,
	onAgentCall,
	...args
}: Omit<Parameters<typeof sharedTurn>[0], 'runtime'> & RunHost) {
	return sharedTurn({ ...args, runtime: runtime({ env, onAgentCall }) });
}
export function streamPlaygroundInvoke({
	env,
	onAgentCall,
	...args
}: Omit<Parameters<typeof sharedInvoke>[0], 'runtime'> & RunHost) {
	return sharedInvoke({ ...args, runtime: runtime({ env, onAgentCall }) });
}
export function streamPlaygroundCall({
	env,
	onAgentCall,
	...args
}: Omit<Parameters<typeof sharedCall>[0], 'runtime'> & RunHost) {
	return sharedCall({ ...args, runtime: runtime({ env, onAgentCall }) });
}
