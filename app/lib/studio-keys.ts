/**
 * The keys this site lends to whoever opens its studio: Gemini on free-tier keys, OpenRouter's
 * free router for text, and decisions on TypeSafe or OpenRouter's free Span model. Which grounding
 * each Gemini model's free quota allows is the Google preset's table.
 */
import type { DecisionQuestion } from '@theoremjs/agents';
import { googleFreeTierBuiltins } from '@theoremjs/agents/presets';
import {
	firstServed,
	KNOWN_GEMINI_EMBEDDING_MODELS,
	KNOWN_OPENROUTER_EMBEDDING_MODELS,
	type LentBinding,
	type LentKeys,
	type LentModel,
	type ModelBindingViolation,
	type ModelProfileType,
	type ModelRoute,
} from '@theoremjs/studio';

/** The only OpenRouter model the site's key calls for an agent that isn't a decision. */
const OPENROUTER_FREE = 'openrouter/free';
const OPENROUTER_EMBEDDINGS: readonly LentModel[] = KNOWN_OPENROUTER_EMBEDDING_MODELS.map(
	(model) => ({ id: model.id, label: model.label }),
);

/** The only OpenRouter decision model: Span's free one. */
const SPAN_DECISION: LentModel = { id: 'respan/span-01-lite:free', label: 'Span 01 Lite Free' };

/** The TypeSafe model a decision starts on. */
const JEV: LentModel = { id: 'jev-latest', label: 'Jev' };
/** Jev 1.14, the release that answers Box questions; the studio's decision example runs on it. */
const JEV_BOXES: LentModel = { id: 'jev-1.14.0', label: 'Jev 1.14' };

/**
 * Non-pro Gemini models with non-zero free-tier quotas (AI Studio, Sep 2026). Wire ids verified
 * against generativelanguage.googleapis.com/v1beta/models. The first of each type is where a new
 * model starts.
 */
const GEMINI: Readonly<Record<Exclude<ModelProfileType, 'decision'>, readonly LentModel[]>> = {
	text: [
		{ id: 'gemini-3.1-flash-lite', label: '3.1 Flash Lite' },
		{ id: 'gemini-2.5-flash-lite', label: '2.5 Flash Lite' },
		{ id: 'gemini-2.5-flash', label: '2.5 Flash' },
		{ id: 'gemini-3-flash-preview', label: '3 Flash' },
		{ id: 'gemini-3.5-flash-lite', label: '3.5 Flash Lite' },
		{ id: 'gemini-3.8-flash', label: '3.8 Flash' },
		{ id: 'gemini-3.7-flash', label: '3.7 Flash' },
		{ id: 'gemma-4-26b-a4b-it', label: 'Gemma 4 26B' },
		{ id: 'gemma-4-31b-it', label: 'Gemma 4 31B' },
	],
	image: [{ id: 'gemini-3.1-flash-lite-image', label: '3.1 Flash Lite Image' }],
	speech: [
		{ id: 'gemini-3.1-flash-tts-preview', label: '3.1 Flash TTS' },
		{ id: 'gemini-2.5-flash-preview-tts', label: '2.5 Flash TTS' },
		{ id: 'gemini-3.8-flash-tts', label: '3.8 Flash TTS' },
		{ id: 'gemini-3.8-flash-lite-tts', label: '3.8 Flash Lite TTS' },
	],
	live: [
		{ id: 'gemini-3.8-live', label: '3.8 Live' },
		{ id: 'gemini-3.1-flash-live-preview', label: '3.1 Flash Live' },
		{ id: 'gemini-3.8-live-extended-thinking', label: '3.8 Live Extended Thinking' },
	],
	embedding: KNOWN_GEMINI_EMBEDDING_MODELS.map((model) => ({
		id: model.id,
		label: model.label,
	})),
};

const GEMINI_IDS = new Set(
	Object.values(GEMINI).flatMap((models) => models.map((model) => model.id)),
);

/** The built-ins `apiId` may use on the free tier: its grounding quota, and URL context. */
function builtins(apiId: string): readonly string[] {
	if (!GEMINI_IDS.has(apiId.trim())) return [];
	return [...googleFreeTierBuiltins(apiId), 'urlContext'];
}

function models(type: ModelProfileType, definition: string | undefined): readonly LentModel[] {
	if (type === 'decision')
		return definition === 'typesafe'
			? [JEV, JEV_BOXES]
			: definition === 'openrouter'
				? [SPAN_DECISION]
				: [];
	if (definition === 'gemini') return GEMINI[type];
	if (definition === 'openrouter') {
		if (type === 'text') return [{ id: OPENROUTER_FREE, label: 'Free router' }];
		if (type === 'embedding') return OPENROUTER_EMBEDDINGS;
	}
	return [];
}

/** Why `binding` can't run on the site's keys: models off their lists, and grounding without quota. */
function violation(binding: LentBinding): ModelBindingViolation | null {
	const apiId = binding.apiId.trim();
	if (binding.decision && binding.definition === 'typesafe') return null;
	if (binding.definition === 'openrouter')
		return models(binding.profileType, 'openrouter').some((model) => model.id === apiId)
			? null
			: { field: 'apiId', message: `${apiId} is not one of the studio's free OpenRouter models.` };
	if (binding.definition !== 'gemini')
		return { field: 'provider', message: 'The studio runs Google and OpenRouter models only.' };
	if (!GEMINI_IDS.has(apiId))
		return {
			field: 'apiId',
			message: `${apiId} is not a studio Gemini model — pro and unrated models are blocked.`,
		};
	return builtinViolation(apiId, binding.builtInTools);
}

/** The first built-in `apiId` has no free-tier quota for. */
function builtinViolation(
	apiId: string,
	builtInTools: readonly string[],
): ModelBindingViolation | null {
	const allowed = builtins(apiId);
	const refused = builtInTools.find((builtin) => !allowed.includes(builtin));
	if (refused === undefined) return null;
	const grounding = { googleMaps: 'map-grounding', googleSearch: 'search-grounding' }[refused];
	return {
		field: 'builtInTools',
		message: grounding
			? `${apiId} has no free-tier ${grounding} quota — remove ${refused}.`
			: `${refused} is not allowed with ${apiId} on the studio free tier.`,
	};
}

function isSpan(route: Pick<ModelRoute, 'definition' | 'apiId' | 'decision'>): boolean {
	return route.decision && route.definition === 'openrouter' && route.apiId.startsWith('respan/');
}

/** Span asks Number questions only, each with true and false described. */
function questionViolation(route: ModelRoute, question: DecisionQuestion): string | null {
	if (!isSpan(route)) return null;
	if (question.type !== 'noul') return 'Span accepts Number questions.';
	const criteria = question.criteria;
	if (
		!criteria ||
		Object.keys(criteria).length !== 2 ||
		typeof criteria.true !== 'string' ||
		!criteria.true.trim() ||
		typeof criteria.false !== 'string' ||
		!criteria.false.trim()
	)
		return 'Span needs true and false criteria with descriptions.';
	return null;
}

/** Span's state is text, or input and output messages. */
function stateViolation(
	route: Pick<ModelRoute, 'definition' | 'apiId' | 'decision'>,
	state: unknown,
): string | null {
	if (!isSpan(route) || typeof state === 'string') return null;
	if (
		typeof state === 'object' &&
		state !== null &&
		!Array.isArray(state) &&
		Object.keys(state).length > 0 &&
		Object.entries(state).every(
			([key, value]) => (key === 'input' || key === 'output') && spanMessages(value),
		)
	)
		return null;
	return 'Span state must be a string or input/output messages.';
}

/** Text, one role/content message, or a nonempty list of such messages. */
function spanMessages(value: unknown): boolean {
	if (typeof value === 'string') return true;
	if (Array.isArray(value)) return value.length > 0 && value.every(spanMessage);
	return spanMessage(value);
}

function spanMessage(value: unknown): boolean {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const message = value as Record<string, unknown>;
	return (
		typeof message.role === 'string' && !!message.role.trim() && typeof message.content === 'string'
	);
}

export const SITE_KEYS: LentKeys = {
	models,
	runs: (type, definition) => models(type, definition).length > 0,
	start: (type) =>
		type === 'decision'
			? { ...firstServed('typesafe', type), apiId: JEV.id }
			: { ...firstServed('gemini', type), apiId: GEMINI[type][0]?.id ?? '' },
	violation,
	builtins,
	decision: {
		questions: 8,
		criteria: 12,
		instructionsChars: 2_000,
		criterionChars: 500,
		nameChars: 64,
		idChars: 128,
		stateBytes: 16_384,
		timeoutMs: 30_000,
		images: 4,
		imageBytes: 4_194_304,
	},
	questionViolation,
	stateViolation,
	/**
	 * The model pages list 131,072, but the free key holds a Live session to about half, so this is
	 * the site's limit, not the model's.
	 */
	liveInputTokens: 65_536,
	/**
	 * Anyone's draft runs on the site's server, so it reaches public hosts only, and fetched text
	 * can't steer it into deleting or overwriting.
	 */
	holds: { publicHostsOnly: true, afterRemoteRead: 'destructive' },
};
