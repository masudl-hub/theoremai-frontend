import { playgroundPolicyViolation } from '$lib/playground/playground-policy';
import type { CompileResult } from '$lib/playground/types';
import { ensureKernelInitialized } from '$lib/server/kernel-init';
import type { CreateProviderOptions, ProfileDefinition } from '$lib/server/theorum';
import {
	createProvider,
	getProfile,
	pickModel,
	registerProfile,
	registerStructured,
	runTurn,
	standardEgressEnforce,
	type TurnEvent,
} from '$lib/server/theorum';

export type HostEnv = {
	OPENROUTER_API_KEY?: string;
	GEMINI_API_KEY?: string;
	GEMINI_API_KEY_FREE_A?: string;
	GEMINI_API_KEY_FREE_B?: string;
	GEMINI_API_KEY_FREE_C?: string;
	LOCAL_LLM_URL?: string;
};

export type TurnRunInput = {
	text: string;
	/** First key from profile.model.select when omitted. */
	select?: string;
};

export type TurnRunResult =
	| {
			ok: true;
			agentId: string;
			text: string;
			stop: TurnEvent['stop'] | null;
			trace: TurnEvent[];
	  }
	| { ok: false; error: string; status?: number };

/** Single free Gemini key — all vault slots map to the same credential. */
function geminiVaultFromEnv(env: HostEnv) {
	const fallback = env.GEMINI_API_KEY?.trim();
	const key = {
		freeA: env.GEMINI_API_KEY_FREE_A?.trim() || fallback,
		freeB: env.GEMINI_API_KEY_FREE_B?.trim() || fallback,
		freeC: env.GEMINI_API_KEY_FREE_C?.trim() || fallback,
		paid: fallback,
	};
	return key;
}

/** Map compiled profile transport to host credentials — routing follows the profile, not the route. */
export function resolveProviderOptions(
	profile: ReturnType<typeof getProfile>,
	env: HostEnv,
	site?: { url: string; name: string },
): CreateProviderOptions | { error: string } {
	const { protocol, provider } = profile.model;

	if (protocol === 'geminiInteractions' || protocol === 'geminiLive') {
		const vault = geminiVaultFromEnv(env);
		if (!vault.freeA && !vault.freeB && !vault.freeC) {
			return {
				error:
					'GEMINI_API_KEY is not set. Add it to .env.local (local) or Pages secrets (production).',
			};
		}
		return { gemini: { vault } };
	}

	if (provider === 'openrouter') {
		const apiKey = env.OPENROUTER_API_KEY?.trim();
		if (!apiKey) {
			return {
				error:
					'OPENROUTER_API_KEY is not set. Add it to .env.local (local) or Pages secrets (production).',
			};
		}
		return {
			openAiGateway: {
				apiKey,
				siteUrl: site?.url ?? 'https://theorum.masudlewis.com',
				siteName: site?.name ?? 'Theorum Playground',
			},
		};
	}

	if (provider === 'local') {
		return {
			local: {
				baseUrl: env.LOCAL_LLM_URL?.trim() || 'http://127.0.0.1:11434',
			},
		};
	}

	return { error: `Unsupported transport ${protocol}/${provider}.` };
}

function sanitizeProfileInput(profile: Record<string, unknown>): ProfileDefinition {
	const copy = structuredClone(profile) as ProfileDefinition & {
		model: ProfileDefinition['model'] & { key?: string };
		guardrails?: { egress?: { enforce?: unknown } };
	};
	const modelKey = copy.model.key as string | undefined;
	if (!modelKey || modelKey === 'paid') {
		copy.model.key = 'freeA';
	}
	const egress = copy.guardrails?.egress;
	if (egress) {
		if (typeof egress.enforce === 'string' && egress.enforce === '__STANDARD_EGRESS__') {
			egress.enforce = standardEgressEnforce;
		} else if (typeof egress.enforce !== 'function') {
			delete copy.guardrails?.egress;
		}
	}
	return copy;
}

function applyStructuredRegistration(result: Extract<CompileResult, { ok: true }>): void {
	const reg = result.structured;
	if (!reg) return;
	registerStructured(reg.id, reg.spec);
}

/** Gate custom tools (profile.tools.allow) and builtins (selected model builtInTools) for playground turns. */
function turnToolsGate(
	profile: ReturnType<typeof getProfile>,
	select?: string,
): Record<string, true> | undefined {
	const modelId = pickModel(profile, select);
	const modelSpec = profile.model.config[modelId];
	const ids = [...profile.tools.allow, ...modelSpec.builtInTools];
	if (!ids.length) return undefined;
	return Object.fromEntries(ids.map((id) => [id, true as const]));
}

function defaultSelect(profile: ReturnType<typeof getProfile>): string {
	const select = profile.model.select ?? {};
	const keys = Object.keys(select);
	if (!keys.length) {
		throw new Error('Profile has no model.select entries.');
	}
	const first = keys[0];
	return first;
}

function collectTurn(events: TurnEvent[]) {
	let text = '';
	let stop: TurnEvent['stop'];
	const trace: TurnEvent[] = [];

	for (const event of events) {
		trace.push(event);
		if (event.type === 'text' && event.text) {
			text += event.text;
		}
		if (event.type === 'done') {
			stop = event.stop;
		}
		if (event.type === 'error') {
			throw new Error(event.error ?? 'Turn failed.');
		}
	}

	return { text, stop, trace };
}

/** Register a compiled playground agent and run one text turn. Stateless — no session store. */
export async function runCompiledAgentTurn(
	compiled: Extract<CompileResult, { ok: true }>,
	input: TurnRunInput,
	env: HostEnv,
	site?: { url: string; name: string },
): Promise<TurnRunResult> {
	const tierError = playgroundPolicyViolation(
		compiled.profile as Parameters<typeof playgroundPolicyViolation>[0],
	);
	if (tierError) {
		return { ok: false, error: tierError, status: 422 };
	}

	try {
		ensureKernelInitialized();
		applyStructuredRegistration(compiled);
		registerProfile(sanitizeProfileInput(compiled.profile));
		const profile = getProfile(compiled.agentId);

		const options = resolveProviderOptions(profile, env, site);
		if ('error' in options) {
			return { ok: false, error: options.error, status: 503 };
		}

		const provider = createProvider(profile, options);
		const select = input.select?.trim() || defaultSelect(profile);

		const events: TurnEvent[] = [];
		for await (const event of runTurn(
			{
				profile: compiled.agentId,
				select,
				input: { text: input.text.trim() },
				tools: turnToolsGate(profile, select),
			},
			provider,
		)) {
			events.push(event);
		}

		const result = collectTurn(events);
		return {
			ok: true,
			agentId: compiled.agentId,
			text: result.text,
			stop: result.stop ?? null,
			trace: result.trace,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Turn failed.';
		return { ok: false, error: message, status: 500 };
	}
}
