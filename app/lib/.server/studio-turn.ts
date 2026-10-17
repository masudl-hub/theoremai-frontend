import type {
	KeyVault,
	ModelBinding,
	Profile,
	ProfileDefinition,
	ProviderHostOptions,
	ProviderRegistry,
} from '@theoremjs/agents';

export { studioTraces } from '@theoremjs/studio/runtime';

type StudioTurnEnv = {
	GEMINI_API_KEY_FREE_A?: string;
	GEMINI_API_KEY_FREE_B?: string;
	GEMINI_API_KEY_FREE_C?: string;
	OPENROUTER_API_KEY?: string;
	/** Jev's key, for decision models on TypeSafe. */
	'theoremai.typesafe_api_key'?: string;
};

export type { StudioTurnEnv };

/**
 * The site's own keys for each provider, in order: free-tier Gemini only, never a paid key. A
 * profile's key slot gets the first; a slot it names only as a fallback gets the second.
 */
function siteKey(env: StudioTurnEnv, provider: string, rank: 0 | 1): string | undefined {
	const keys =
		provider === 'gemini'
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
export function studioDemoVault(
	env: StudioTurnEnv,
	profile: Profile | ProfileDefinition,
	defaults?: Pick<ProviderRegistry, 'get'>,
): KeyVault {
	if (!('models' in profile)) return {};
	const readers = new Map<string, Set<string>>();
	const primary = new Set<string>();
	for (const binding of Object.values<ModelBinding>(profile.models)) {
		const provider = defaults?.get(binding.provider);
		const key = binding.keySlot ?? provider?.keySlot;
		if (key) primary.add(key);
		for (const slot of [key, binding.fallbackKeySlot ?? provider?.fallbackKeySlot]) {
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
export function studioProviders(
	env: StudioTurnEnv,
	profile: Profile,
	defaults?: Pick<ProviderRegistry, 'get'>,
): ProviderHostOptions {
	return { vault: studioDemoVault(env, profile, defaults) };
}
