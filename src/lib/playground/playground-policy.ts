/**
 * Playground-only policy shim — not kernel truth.
 * Reflects free-tier key limits from Google AI Studio / OpenRouter guardrails.
 *
 * Grounding columns in AI Studio (Sep 2026):
 * - Search grounding bucket: Gemini 2 / 2.5 → 1.5K; Gemini 3 → 0.
 * - Map grounding (Tools): per-model 0/500 or 0/0 (see mapGrounding flags below).
 */

import type { Protocol } from 'theorum/schema';
import type { PlaygroundNode } from './types';

export const OPENROUTER_PLAYGROUND_API_ID = 'openrouter/free';

export const OPENROUTER_PLAYGROUND_NOTE =
	'Playground restriction: only the free router is allowed. OpenRouter picks a free model per request; some routed models may train on data.';

/** Default Gemini wire id for geminiInteractions — highest free RPD in quota table. */
export const GEMINI_PLAYGROUND_DEFAULT_API_ID = 'gemini-3.1-flash-lite';

/** Default wire id for geminiLive on free tier. */
export const GEMINI_PLAYGROUND_LIVE_DEFAULT_API_ID = 'gemini-3.1-flash-live-preview';

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
] as const;

export type GoogleBuiltinId = 'googleSearch' | 'googleMaps' | 'urlContext' | 'codeExecution';

export const GOOGLE_BUILTIN_OPTIONS: { value: GoogleBuiltinId; label: string }[] = [
	{ value: 'googleSearch', label: 'googleSearch' },
	{ value: 'googleMaps', label: 'googleMaps' },
	{ value: 'urlContext', label: 'urlContext' },
	{ value: 'codeExecution', label: 'codeExecution' },
];

const GOOGLE_BUILTIN_IDS = new Set<string>(GOOGLE_BUILTIN_OPTIONS.map((o) => o.value));

const GEMINI_BY_ID = new Map(GEMINI_PLAYGROUND_MODELS.map((m) => [m.id, m]));

/** Builtins that cannot be combined on the same model (Google preset conflicts). */
const BUILTIN_MUTEX: Partial<Record<GoogleBuiltinId, GoogleBuiltinId[]>> = {
	googleMaps: ['googleSearch', 'urlContext'],
	googleSearch: ['googleMaps'],
	urlContext: ['googleMaps'],
};

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

function builtinMutexViolation(builtins: GoogleBuiltinId[]): string | null {
	for (const id of builtins) {
		const blocked = BUILTIN_MUTEX[id] ?? [];
		for (const other of builtins) {
			if (blocked.includes(other)) {
				return `${id} and ${other} cannot be used together.`;
			}
		}
	}
	return null;
}

/** Reject provider builtins in profile.tools.allow — they belong on model.config.*.builtInTools. */
export function validateCustomToolsAllow(toolsAllowRaw: string): string | null {
	for (const id of parseList(toolsAllowRaw)) {
		if (GOOGLE_BUILTIN_IDS.has(id)) {
			return `${id} is a provider builtin — set it on the model spec (builtInTools), not tools.allow.`;
		}
	}
	return null;
}

/** Validate one model spec's apiId + builtInTools for playground free tier. */
export function validateGeminiModelSpec(
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

	return builtinMutexViolation(builtInTools);
}

export function validateOpenRouterModelSpec(apiId: string): string | null {
	const id = apiId.trim();
	if (id !== OPENROUTER_PLAYGROUND_API_ID) {
		return `Playground OpenRouter profiles must use ${OPENROUTER_PLAYGROUND_API_ID}.`;
	}
	return null;
}

export type ProfileLike = {
	model: {
		protocol: string;
		provider: string;
		allow: string[];
		config: Record<
			string,
			{
				apiId?: string;
				key?: string;
				builtInTools?: string[];
			}
		>;
	};
	tools?: { allow?: string[]; t2Loader?: string };
};

/** Compile-time gate for the full profile graph. */
export function playgroundPolicyViolation(profile: ProfileLike): string | null {
	const { protocol, provider, allow, config } = profile.model;

	const customErr = validateCustomToolsAllow((profile.tools?.allow ?? []).join(', '));
	if (customErr) return customErr;

	if (profile.model.protocol === 'geminiLive') {
		if (profile.tools?.t2Loader?.trim()) {
			return 'tools.t2Loader is not supported on geminiLive — function declarations are fixed at session setup.';
		}
		const tools = profile.tools as { t1Policy?: unknown };
		if (tools.t1Policy !== undefined) {
			return 'tools.t1Policy is not supported on geminiLive — declare T0 tools in tools.allow for session setup.';
		}
	}

	if (isOpenRouterTransport(protocol, provider)) {
		for (const id of allow) {
			const err = validateOpenRouterModelSpec(config[id].apiId ?? '');
			if (err) return err;
		}
		return null;
	}

	if (isGoogleTransport(protocol, provider)) {
		for (const id of allow) {
			const spec = config[id];
			const err = validateGeminiModelSpec(
				spec.apiId ?? '',
				(spec.builtInTools ?? []).join(', '),
				protocol,
			);
			if (err) return `Model "${id}": ${err}`;
		}
		return null;
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

/** Coerce apiId when transport changes in the facet editor. */
export function coerceApiIdForTransport(apiId: string, protocol: string, provider: string): string {
	if (isOpenRouterTransport(protocol, provider)) return OPENROUTER_PLAYGROUND_API_ID;
	if (isGoogleTransport(protocol, provider)) {
		const trimmed = apiId.trim();
		if (isAllowedGeminiPlaygroundApiId(trimmed, protocol)) return trimmed;
		return defaultGeminiApiId(protocol);
	}
	return apiId.trim();
}

/** Strip builtInTools that violate playground policy for the given apiId. */
export function sanitizeBuiltInsForApiId(apiId: string, builtInToolsRaw: string): string {
	const allowed = new Set(allowedBuiltinsForGemini(apiId));
	return parseList(builtInToolsRaw)
		.filter((b) => allowed.has(b as GoogleBuiltinId))
		.join(', ');
}

/** After hub transport changes, coerce every modelSpec on the canvas. */
export function syncModelSpecsForTransport(
	modelSpecs: Array<{ id: string; apiId: string; builtInTools: string }>,
	protocol: string,
	provider: string,
): Map<string, { apiId: string; builtInTools: string }> {
	const updates = new Map<string, { apiId: string; builtInTools: string }>();
	for (const spec of modelSpecs) {
		const apiId = coerceApiIdForTransport(spec.apiId, protocol, provider);
		const builtInTools = isGoogleTransport(protocol, provider)
			? sanitizeBuiltInsForApiId(apiId, spec.builtInTools)
			: spec.builtInTools;
		if (apiId !== spec.apiId || builtInTools !== spec.builtInTools) {
			updates.set(spec.id, { apiId, builtInTools });
		}
	}
	return updates;
}

/** Gemini Interactions speech must be PCM — reset legacy mp3 on the outputs facet. */
export function clearMp3SpeechOnGeminiInteractions(
	getNodes: () => PlaygroundNode[] | undefined,
	patchNode: (id: string, partial: Partial<PlaygroundNode['data']>) => void,
	protocol: Protocol,
): void {
	if (protocol !== 'geminiInteractions') return;
	for (const n of getNodes() ?? []) {
		if (n.data.kind !== 'outputs') continue;
		if (n.data.speechFormat === 'mp3') {
			patchNode(n.id, { speechFormat: 'pcm' });
		}
	}
}
