/**
 * Th30 ("T H 3 O" / "T H thirty") — The live, grounded site assistant for THEOREM.
 *
 * Configured as a real-time Gemini 3.1 Flash Live voice/speech agent with
 * client-side UI navigation, precise line/element highlighting,
 * real-time line-numbered document reading, multi-source search, and Google Search grounding.
 *
 * Built on the THEOREM tool system (registerTool / Zod contracts).
 *
 * @module
 */

import {
	defineProfile,
	registerProfile,
	registerTool,
	standardEgressEnforce,
} from '@theoremai/agents';
import { z } from 'zod';
import { getDocIndex } from '../docs/.server/load-index';
import { formatNavigableForPrompt, readDoc, resolveNavigate, searchDocs } from '../docs/query';
import { TH30_PROFILE_ID } from '../th30-id';

export { TH30_PROFILE_ID };

/* -------------------------------------------------------------------------- */
/* Tool Schemas (Strict Zod Contracts)                                        */
/* -------------------------------------------------------------------------- */

export const NavigateInputSchema = z.object({
	slug: z
		.string()
		.describe(
			'Docs chapter slug (start, runner, profiles, tools, …). Validated against the index.',
		),
	blockId: z
		.string()
		.optional()
		.describe('Optional in-page block or field path (e.g. session, types, live.vad)'),
});

export const NavigateOutputSchema = z.object({
	success: z.boolean(),
	navigatedTo: z.string(),
	error: z.string().optional(),
});

export const HighlightInputSchema = z.object({
	blockId: z
		.string()
		.describe('DOM id to focus via getElementById (e.g. session, live.vad, types)'),
	label: z.string().optional().describe('Short label shown on the highlight'),
});

export const HighlightOutputSchema = z.object({
	success: z.boolean(),
	highlighted: z.string(),
	label: z.string().optional(),
});

export const ReadInputSchema = z.object({
	target: z
		.string()
		.describe('Chapter slug, slug#blockId, or full_page — projected from the composed index'),
	detail: z
		.enum(['summary', 'full', 'code_only'])
		.optional()
		.describe('summary | full | code_only'),
});

export const ReadOutputSchema = z.object({
	target: z.string(),
	title: z.string(),
	content: z.string().describe('Structured, line-numbered markdown representation (L01 | ...)'),
	lineCount: z.number(),
});

export const SearchDocsInputSchema = z.object({
	query: z.string().describe('Search over titles, summaries, and catalog docs'),
	limit: z.number().int().positive().max(10).optional(),
});

export const SearchDocsOutputSchema = z.object({
	query: z.string(),
	results: z.array(
		z.object({
			title: z.string(),
			urlOrAnchor: z.string(),
			excerpt: z.string(),
		}),
	),
	totalMatches: z.number(),
});

type NavigateInput = z.infer<typeof NavigateInputSchema>;
type HighlightInput = z.infer<typeof HighlightInputSchema>;
type ReadInput = z.infer<typeof ReadInputSchema>;
type SearchDocsInput = z.infer<typeof SearchDocsInputSchema>;

/* -------------------------------------------------------------------------- */
/* Tool Definitions & Registration                                            */
/* -------------------------------------------------------------------------- */

export const th30NavigateTool = {
	type: 'function' as const,
	name: 'navigate',
	description: 'Navigate the user to a /docs chapter slug, optionally to a block id.',
	category: 'ui',
	access: 'read-only' as const,
	paths: ['*'],
	loadTier: 'T0' as const,
	permission: 'auto' as const,
	input: NavigateInputSchema,
	output: NavigateOutputSchema,
	handler: (input: NavigateInput) => {
		const resolved = resolveNavigate(getDocIndex(), input.slug, input.blockId);
		if (!resolved.ok) return { success: false, navigatedTo: input.slug, error: resolved.error };
		return { success: true, navigatedTo: resolved.href };
	},
};

export const th30HighlightTool = {
	type: 'function' as const,
	name: 'highlight',
	description:
		'Highlight a docs block by id (getElementById). Use field paths such as live.vad, never a CSS selector.',
	category: 'ui',
	access: 'read-only' as const,
	paths: ['*'],
	loadTier: 'T0' as const,
	permission: 'auto' as const,
	input: HighlightInputSchema,
	output: HighlightOutputSchema,
	handler: (input: HighlightInput) => ({
		success: true,
		highlighted: input.blockId,
		label: input.label,
	}),
};

export const th30ReadTool = {
	type: 'function' as const,
	name: 'read',
	description:
		'Read the composed docs index as line-numbered markdown (slug, slug#block, or full_page).',
	category: 'docs',
	access: 'read-only' as const,
	paths: ['*'],
	loadTier: 'T0' as const,
	permission: 'auto' as const,
	input: ReadInputSchema,
	output: ReadOutputSchema,
	handler: (input: ReadInput) => {
		const doc = readDoc(getDocIndex(), input.target, input.detail);
		return {
			target: doc.target,
			title: doc.title,
			content: doc.content,
			lineCount: doc.lineCount,
		};
	},
};

export const th30SearchDocsTool = {
	type: 'function' as const,
	name: 'searchDocs',
	description: 'Search the composed docs index (titles, summaries, catalog docs).',
	category: 'docs',
	access: 'read-only' as const,
	paths: ['*'],
	loadTier: 'T0' as const,
	permission: 'auto' as const,
	input: SearchDocsInputSchema,
	output: SearchDocsOutputSchema,
	handler: (input: SearchDocsInput) => {
		const searchRes = searchDocs(getDocIndex(), input.query, input.limit);
		return {
			query: searchRes.query,
			results: searchRes.results.map((hit) => ({
				title: hit.title,
				urlOrAnchor: hit.href,
				excerpt: hit.excerpt,
			})),
			totalMatches: searchRes.totalMatches,
		};
	},
};

export const TH30_TOOL_IDS = ['navigate', 'highlight', 'read', 'searchDocs'] as const;

/** Register all Th30 tools into the process-local tool registry. */
export function registerTh30Tools(): void {
	registerTool(th30NavigateTool);
	registerTool(th30HighlightTool);
	registerTool(th30ReadTool);
	registerTool(th30SearchDocsTool);
}

/* -------------------------------------------------------------------------- */
/* System Prompt & Profile Definition                                         */
/* -------------------------------------------------------------------------- */

export function th30SystemPrompt(): string {
	const chapters = formatNavigableForPrompt(getDocIndex());
	return `You are Th30, the real-time AI guide for THEOREM. You are built on THEOREM.
Your name is spoken letter-by-letter as "T H 3 O", or as "T H thirty" (the digits 3-0). Never say "Theo", "three O", "three-oh", or "theo".
You speak concisely (1-3 sentences). English only.

When the call first connects you will receive a user turn with the text "(call connected)". Greet the user as T H 3 O and ask what they want to look at. Do not read the trigger text.

Docs live at /docs. Chapters: ${chapters}.
Type-scoped pins nest under profiles#types (image, speech, live, decision). runner#session is the live door, not a second pin table. Do not invent field copy — read the catalog.

Tools:
- navigate: { slug, blockId? } — only slugs from the index.
- highlight: { blockId } — DOM id via getElementById (live.vad is an id, not a CSS selector).
- read: slug, slug#block, or full_page. Line-numbered markdown from the same projector as the page.
- searchDocs: bag-of-words over the composed index.
- Google Search: only for the public web, not kernel catalogs.

When you point at a fact, call highlight with that blockId. Never claim you navigated, highlighted, read, or searched unless you issued that call. If a tool errors, say so and retry once.`;
}

export function ensureTh30ProfileRegistered(): void {
	registerTh30Tools();

	const profile = defineProfile({
		type: 'live',
		id: TH30_PROFILE_ID,
		identity: {
			handle: 'th30',
			system: th30SystemPrompt(),
		},
		models: {
			gemini31FlashLive: {
				protocol: 'geminiLive',
				provider: 'google',
				apiId: 'gemini-3.1-flash-live-preview',
				efforts: { normal: 'low' },
				summaries: false,
				temperature: 0.7,
				maxOutputTokens: 2048,
				builtInTools: ['googleSearch'],
			},
		},
		key: 'slotA',
		live: {
			voice: 'Aoede',
			vad: {
				// Barge-in on, coarsest Gemini sensitivity. Fine choppy-cut protection is
				// client-side: live-client withholds quiet mic frames while model audio plays.
				activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
				startSensitivity: 'START_SENSITIVITY_LOW',
				endSensitivity: 'END_SENSITIVITY_LOW',
				prefixPaddingMs: 400,
				silenceDurationMs: 1500,
			},
			sessionResumption: true,
			contextCompression: { slidingWindow: {} },
			transcription: {
				input: true,
				output: true,
			},
		},
		tools: {
			allow: [...TH30_TOOL_IDS],
		},
		guardrails: {
			canary: true,
			sanitizeInput: true,
			redactSensitive: true,
			egress: {
				onBlock: 'refuse_to_user',
				enforce: standardEgressEnforce,
			},
		},
	});

	registerProfile(profile);
}
