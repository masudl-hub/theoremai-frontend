/**
 * Playground-only policy shim — not kernel truth.
 * Reflects free-tier key limits from Google AI Studio / OpenRouter guardrails.
 *
 * Grounding columns in AI Studio (Sep 2026):
 * - Search grounding bucket: Gemini 2 / 2.5 → 1.5K; Gemini 3 → 0.
 * - Map grounding (Tools): per-model 0/500 or 0/0 (see mapGrounding flags below).
 */

import { GOOGLE_BUILTIN_TOOLS } from '@theoremai/agents/presets/google';

export const OPENROUTER_PLAYGROUND_API_ID = 'openrouter/free';

/** Default Gemini wire id for geminiInteractions — highest free RPD in quota table. */
export const GEMINI_PLAYGROUND_DEFAULT_API_ID = 'gemini-3.1-flash-lite';

/**
 * Trace destination the playground server registers for `observability.writeTo`.
 * It keeps nothing yet; turn traces will be delivered to the run tab's inspector.
 */
export const PLAYGROUND_TRACE_DESTINATION = 'playground';

/** Default wire id for geminiLive on free tier. */
export const GEMINI_PLAYGROUND_LIVE_DEFAULT_API_ID = 'gemini-3.1-flash-live-preview';

/**
 * Live sessions fix function declarations at setup — T0 only.
 * Host-side constraint (kernel removed `LIVE_TOOL_LOAD_TIERS`; use `TOOL_LOAD_TIERS` for the full set).
 */
export const LIVE_TOOL_LOAD_TIERS = ['T0'] as const;

export type PlaygroundHubProtocol = 'geminiInteractions' | 'geminiLive';

export type PlaygroundModelKind = 'chat' | 'tts' | 'live';

export type GeminiPlaygroundModel = {
	id: string;
	label: string;
	kind: PlaygroundModelKind;
	protocols: readonly PlaygroundHubProtocol[];
	/** Map grounding (googleMaps) — Tools → Map grounding quota is non-zero. */
	mapGrounding: boolean;
	/** Search grounding (googleSearch) — Search grounding family quota is non-zero. */
	searchGrounding: boolean;
};

/**
 * Non-pro models with non-zero free-tier quotas (AI Studio, Sep 2026).
 * Wire ids verified against generativelanguage.googleapis.com/v1beta/models.
 */
export const GEMINI_PLAYGROUND_MODELS: readonly GeminiPlaygroundModel[] = [
	{
		id: 'gemini-2.5-flash-lite',
		label: '2.5 Flash Lite',
		kind: 'chat',
		protocols: ['geminiInteractions'],
		mapGrounding: true,
		searchGrounding: true,
	},
	{
		id: 'gemini-2.5-flash',
		label: '2.5 Flash',
		kind: 'chat',
		protocols: ['geminiInteractions'],
		mapGrounding: true,
		searchGrounding: true,
	},
	{
		id: 'gemini-2.5-flash-preview-tts',
		label: '2.5 Flash TTS',
		kind: 'tts',
		protocols: ['geminiInteractions'],
		mapGrounding: false,
		searchGrounding: true,
	},
	{
		id: 'gemini-3-flash-preview',
		label: '3 Flash',
		kind: 'chat',
		protocols: ['geminiInteractions'],
		mapGrounding: false,
		searchGrounding: false,
	},
	{
		id: 'gemini-3.1-flash-lite',
		label: '3.1 Flash Lite',
		kind: 'chat',
		protocols: ['geminiInteractions'],
		mapGrounding: true,
		searchGrounding: false,
	},
	{
		id: 'gemini-3.1-flash-tts-preview',
		label: '3.1 Flash TTS',
		kind: 'tts',
		protocols: ['geminiInteractions'],
		mapGrounding: true,
		searchGrounding: false,
	},
	{
		id: 'gemini-3.5-flash-lite',
		label: '3.5 Flash Lite',
		kind: 'chat',
		protocols: ['geminiInteractions'],
		mapGrounding: true,
		searchGrounding: false,
	},
	{
		id: 'gemini-3.5-flash',
		label: '3.5 Flash',
		kind: 'chat',
		protocols: ['geminiInteractions'],
		mapGrounding: false,
		searchGrounding: false,
	},
	{
		id: 'gemini-3.6-flash',
		label: '3.6 Flash',
		kind: 'chat',
		protocols: ['geminiInteractions'],
		mapGrounding: false,
		searchGrounding: false,
	},
	{
		id: 'gemini-3.7-flash',
		label: '3.7 Flash',
		kind: 'chat',
		protocols: ['geminiInteractions'],
		mapGrounding: false,
		searchGrounding: false,
	},
	{
		id: 'gemma-4-26b-a4b-it',
		label: 'Gemma 4 26B',
		kind: 'chat',
		protocols: ['geminiInteractions'],
		mapGrounding: false,
		searchGrounding: false,
	},
	{
		id: 'gemma-4-31b-it',
		label: 'Gemma 4 31B',
		kind: 'chat',
		protocols: ['geminiInteractions'],
		mapGrounding: false,
		searchGrounding: false,
	},
	{
		id: 'gemini-3.1-flash-live-preview',
		label: '3 Flash Live',
		kind: 'live',
		protocols: ['geminiLive'],
		mapGrounding: false,
		searchGrounding: false,
	},
	{
		id: 'gemini-3.8-live',
		label: '3.8 Live',
		kind: 'live',
		protocols: ['geminiLive'],
		mapGrounding: false,
		searchGrounding: false,
	},
	{
		id: 'gemini-3.8-live-extended-thinking',
		label: '3.8 Live Extended Thinking',
		kind: 'live',
		protocols: ['geminiLive'],
		mapGrounding: false,
		searchGrounding: false,
	},
] as const;

export type GoogleBuiltinId = 'googleSearch' | 'googleMaps' | 'urlContext' | 'codeExecution';

export const GOOGLE_BUILTIN_OPTIONS: { value: GoogleBuiltinId; label: string }[] =
	GOOGLE_BUILTIN_TOOLS.map((tool) => ({
		value: tool.name as GoogleBuiltinId,
		label: tool.name,
	}));

const GOOGLE_BUILTIN_IDS = new Set<string>(GOOGLE_BUILTIN_OPTIONS.map((o) => o.value));

const GEMINI_BY_ID = new Map(GEMINI_PLAYGROUND_MODELS.map((m) => [m.id, m]));

export function normalizeApiId(apiId: string): string {
	return apiId.trim();
}

export function isGoogleTransport(protocol: string, provider: string): boolean {
	return (protocol === 'geminiInteractions' || protocol === 'geminiLive') && provider === 'google';
}

export function isOpenRouterTransport(protocol: string, provider: string): boolean {
	return protocol === 'openAi' && provider === 'openrouter';
}

export function geminiPlaygroundModel(apiId: string): GeminiPlaygroundModel | undefined {
	return GEMINI_BY_ID.get(normalizeApiId(apiId));
}

export function isAllowedGeminiPlaygroundApiId(apiId: string, protocol?: string): boolean {
	const model = geminiPlaygroundModel(apiId);
	if (!model) return false;
	if (!protocol) return true;
	return model.protocols.includes(protocol as PlaygroundHubProtocol);
}

export function isProGeminiApiId(apiId: string): boolean {
	const n = normalizeApiId(apiId);
	if (!n.includes('gemini')) return false;
	return (
		/\bpro\b/.test(n) || n.includes('-pro-') || n.endsWith('-pro') || n.includes('pro-preview')
	);
}

export function defaultGeminiApiId(protocol: string): string {
	if (protocol === 'geminiLive') return GEMINI_PLAYGROUND_LIVE_DEFAULT_API_ID;
	return GEMINI_PLAYGROUND_DEFAULT_API_ID;
}

export function defaultApiIdForTransport(protocol: string, provider: string): string {
	if (isOpenRouterTransport(protocol, provider)) return OPENROUTER_PLAYGROUND_API_ID;
	if (isGoogleTransport(protocol, provider)) return defaultGeminiApiId(protocol);
	return '';
}

export function allowedBuiltinsForGemini(apiId: string): GoogleBuiltinId[] {
	const model = geminiPlaygroundModel(apiId);
	if (model?.kind !== 'chat') return [];
	const out: GoogleBuiltinId[] = [];
	if (model.searchGrounding) out.push('googleSearch');
	if (model.mapGrounding) out.push('googleMaps');
	out.push('urlContext');
	return out;
}

/** Reject provider builtins in profile.tools.allow — they belong on models.*.builtInTools. */
export function validateCustomToolsAllow(toolsAllowRaw: string): string | null {
	for (const id of parseList(toolsAllowRaw)) {
		if (GOOGLE_BUILTIN_IDS.has(id)) {
			return `${id} is a provider builtin — set it on the model spec (builtInTools), not tools.allow.`;
		}
	}
	return null;
}

/** Validate one model spec's apiId + builtInTools for playground free tier. */
export function validateGeminiModelBinding(
	apiId: string,
	builtInToolsRaw: string,
	protocol?: string,
): string | null {
	const id = apiId.trim();
	if (!id) return 'Model wire id is required.';
	if (isProGeminiApiId(id)) return `Pro models are not available on the playground free tier.`;
	if (!isAllowedGeminiPlaygroundApiId(id, protocol)) {
		if (protocol && geminiPlaygroundModel(id)) {
			return `${id} is not available on ${protocol} in the playground.`;
		}
		return `Choose a playground Gemini model — pro and unrated models are blocked.`;
	}

	const model = geminiPlaygroundModel(id);
	if (!model) {
		return `Choose a playground Gemini model — pro and unrated models are blocked.`;
	}
	const builtInTools = parseList(builtInToolsRaw) as GoogleBuiltinId[];

	if (model.kind !== 'chat' && builtInTools.length) {
		return `${model.label} does not support builtInTools on the playground.`;
	}

	const allowed = allowedBuiltinsForGemini(id);
	for (const builtin of builtInTools) {
		if (!allowed.includes(builtin)) {
			if (builtin === 'googleMaps') {
				return `${id} has no map-grounding quota on the free tier — remove googleMaps from builtInTools.`;
			}
			if (builtin === 'googleSearch') {
				return `${id} has no search-grounding quota on the free tier — remove googleSearch from builtInTools.`;
			}
			return `${builtin} is not allowed with ${id} on the playground free tier.`;
		}
	}

	return null;
}

export function validateOpenRouterModelBinding(apiId: string): string | null {
	const id = apiId.trim();
	if (id !== OPENROUTER_PLAYGROUND_API_ID) {
		return `Playground OpenRouter profiles must use ${OPENROUTER_PLAYGROUND_API_ID}.`;
	}
	return null;
}

export type ProfileLike = {
	models: Record<
		string,
		{
			protocol: string;
			provider: string;
			apiId?: string;
			builtInTools?: string[];
		}
	>;
	key?: string;
	tools?: { allow?: string[]; t2Loader?: string };
};

/** Compile-time gate for the full profile graph. */
export function playgroundPolicyViolation(profile: ProfileLike): string | null {
	const customErr = validateCustomToolsAllow((profile.tools?.allow ?? []).join(', '));
	if (customErr) return customErr;

	const hasLive = Object.values(profile.models).some((m) => m.protocol === 'geminiLive');
	if (hasLive) {
		if (profile.tools?.t2Loader?.trim()) {
			return 'tools.t2Loader is not supported on geminiLive — function declarations are fixed at session setup (T0 tools only).';
		}
		const tools = profile.tools as { t1Policy?: unknown };
		if (tools.t1Policy !== undefined) {
			return 'tools.t1Policy is not supported on geminiLive — declare T0 tools in tools.allow for session setup.';
		}
	}

	for (const [id, spec] of Object.entries(profile.models)) {
		if (isOpenRouterTransport(spec.protocol, spec.provider)) {
			const err = validateOpenRouterModelBinding(spec.apiId ?? '');
			if (err) return `Model "${id}": ${err}`;
		}
		if (isGoogleTransport(spec.protocol, spec.provider)) {
			const err = validateGeminiModelBinding(
				spec.apiId ?? '',
				(spec.builtInTools ?? []).join(', '),
				spec.protocol,
			);
			if (err) return `Model "${id}": ${err}`;
		}
	}

	return null;
}

export function parseList(raw: string): string[] {
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

export function geminiModelSelectOptions(protocol?: string) {
	return GEMINI_PLAYGROUND_MODELS.filter(
		(m) => !protocol || m.protocols.includes(protocol as PlaygroundHubProtocol),
	).map((m) => ({ value: m.id, label: `${m.label} (${m.id})` }));
}

/** Strip builtInTools that violate playground policy for the given apiId. */
export function sanitizeBuiltInsForApiId(apiId: string, builtInToolsRaw: string): string {
	const allowed = new Set(allowedBuiltinsForGemini(apiId));
	return parseList(builtInToolsRaw)
		.filter((b) => allowed.has(b as GoogleBuiltinId))
		.join(', ');
}
