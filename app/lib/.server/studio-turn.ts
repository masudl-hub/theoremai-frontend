import type {
	KeyVault,
	ModelBinding,
	Profile,
	ProfileDefinition,
	ProviderHostOptions,
	ProviderRegistry,
} from '@theoremjs/agents';
import {
	rewindStudio,
	type StudioRuntime,
	streamStudioCall as sharedCall,
	streamStudioHostInvoke as sharedHostInvoke,
	streamStudioInvoke as sharedInvoke,
	streamStudioTurn as sharedTurn,
	startStudioConversation,
	studioConversation,
} from '@theoremjs/studio/runtime';

export { studioTraces } from '@theoremjs/studio/runtime';

import { ON_SITE } from '../studio-supplies';
import { resolveHost } from './resolve-host';

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

/** What a run needs beside its request: the site's keys, and the check each agent call passes first. */
export type RunHost = {
	env?: StudioTurnEnv;
	onAgentCall?: StudioRuntime['onAgentCall'];
	execution?: StudioRuntime['execution'];
	pageExecution?: StudioRuntime['pageExecution'];
};

function runtime({ env = {}, onAgentCall, execution, pageExecution }: RunHost): StudioRuntime {
	return {
		...ON_SITE,
		resolveHost,
		hostOptions: (profile) => studioProviders(env, profile),
		onAgentCall,
		execution,
		pageExecution,
	};
}

export function streamStudioTurn({
	env,
	onAgentCall,
	execution,
	pageExecution,
	...args
}: Omit<Parameters<typeof sharedTurn>[0], 'runtime'> & RunHost) {
	return sharedTurn({ ...args, runtime: runtime({ env, onAgentCall, execution, pageExecution }) });
}
export function streamStudioInvoke({
	env,
	onAgentCall,
	execution,
	pageExecution,
	...args
}: Omit<Parameters<typeof sharedInvoke>[0], 'runtime'> & RunHost) {
	return sharedInvoke({
		...args,
		runtime: runtime({ env, onAgentCall, execution, pageExecution }),
	});
}
export function streamStudioCall({
	env,
	onAgentCall,
	execution,
	pageExecution,
	...args
}: Omit<Parameters<typeof sharedCall>[0], 'runtime'> & RunHost) {
	return sharedCall({ ...args, runtime: runtime({ env, onAgentCall, execution, pageExecution }) });
}
export function streamStudioHostInvoke({
	env,
	onAgentCall,
	execution,
	pageExecution,
	...args
}: Omit<Parameters<typeof sharedHostInvoke>[0], 'runtime'> & RunHost) {
	return sharedHostInvoke({
		...args,
		runtime: runtime({ env, onAgentCall, execution, pageExecution }),
	});
}

/** A draft as the conversation reads take it: the run's host in place of its runtime. */
type DraftRun = Omit<Parameters<typeof studioConversation>[0], 'runtime'> & RunHost;

function withRuntime({ env, onAgentCall, execution, pageExecution, ...draft }: DraftRun) {
	return { ...draft, runtime: runtime({ env, onAgentCall, execution, pageExecution }) };
}

/** The conversation under a ref, as the page draws it. */
export function readStudioConversation(
	draft: DraftRun,
	conversations: Parameters<typeof studioConversation>[1],
	request: Parameters<typeof studioConversation>[2],
) {
	return studioConversation(withRuntime(draft), conversations, request);
}

/** The conversation cut after one block. */
export function rewindStudioConversation(
	draft: DraftRun,
	conversations: Parameters<typeof rewindStudio>[1],
	request: Parameters<typeof rewindStudio>[2],
	signal: AbortSignal,
) {
	return rewindStudio(withRuntime(draft), conversations, request, signal);
}

/** A conversation that opens on blocks the page wrote, read first by the draft's guardrails. */
export function startStudioChat(
	draft: DraftRun,
	conversations: Parameters<typeof startStudioConversation>[1],
	blocks: Parameters<typeof startStudioConversation>[2],
) {
	return startStudioConversation(withRuntime(draft), conversations, blocks);
}
