/**
 * Th30 ("T H 3 O" / "T H thirty") — The live, grounded site assistant for THEORUM.
 *
 * Configured as a real-time Gemini 3.1 Flash Live voice/speech agent with
 * client-side UI navigation, precise line/element highlighting,
 * real-time line-numbered document reading, multi-source search, and Google Search grounding.
 *
 * Built on the THEORUM tool system (registerTool / Zod contracts).
 *
 * @module
 */

import { defineProfile, registerProfile, registerTool, standardEgressEnforce } from 'theorum';
import { z } from 'zod';
import {
	formatNavigablePathsForPrompt,
	NAVIGABLE_PATHS,
	readDocSection,
	searchDocumentation,
} from '$lib/docs/unified-docs';

export const TH30_PROFILE_ID = 'theorum.site.th30';

/* -------------------------------------------------------------------------- */
/* Tool Schemas (Strict Zod Contracts)                                        */
/* -------------------------------------------------------------------------- */

export const NavigateInputSchema = z.object({
	path: z
		.enum(NAVIGABLE_PATHS)
		.describe(
			'Target section anchor on the website: ' +
				NAVIGABLE_PATHS.map((p) => p.replace('/#', '#')).join(', '),
		),
	subTarget: z
		.string()
		.optional()
		.describe(
			'Optional sub-element or facet ID (e.g. "profile", "kernel", "providers", "guardrails", "observability", "install", "tools", "identity")',
		),
});

export const NavigateOutputSchema = z.object({
	success: z.boolean(),
	navigatedTo: z.string(),
	subTarget: z.string().optional(),
});

export const HighlightInputSchema = z.object({
	target: z
		.string()
		.describe(
			'Target CSS selector or section ID to focus (e.g. "#use", "#pillars", "#architecture", "#playground", "#overview", or ".profile-code")',
		),
	lineStart: z
		.number()
		.int()
		.positive()
		.optional()
		.describe(
			'1-indexed start line number in a code snippet or section to visually select (human-like selection)',
		),
	lineEnd: z
		.number()
		.int()
		.positive()
		.optional()
		.describe('1-indexed end line number for multi-line selection range'),
	subTarget: z
		.string()
		.optional()
		.describe('Specific item ID, pillar key, or architecture node to focus'),
	label: z
		.string()
		.optional()
		.describe('Short descriptive label for the selection, e.g. "Defining the profile contract"'),
});

export const HighlightOutputSchema = z.object({
	success: z.boolean(),
	highlighted: z.string(),
	lineRange: z.string().optional(),
	subTarget: z.string().optional(),
	label: z.string().optional(),
});

export const ReadInputSchema = z.object({
	target: z
		.enum([
			'#overview',
			'#pillars',
			'#use',
			'#playground',
			'#architecture',
			'contracts',
			'specs',
			'full_page',
		])
		.describe('Section or topic to read in real time with line numbers'),
	detail: z
		.enum(['summary', 'full', 'code_only'])
		.optional()
		.describe(
			'Detail level: "full" for complete text with line numbers, "code_only" for snippet lines, "summary" for top lines',
		),
});

export const ReadOutputSchema = z.object({
	target: z.string(),
	title: z.string(),
	content: z.string().describe('Structured, line-numbered markdown representation (L01 | ...)'),
	lineCount: z.number(),
});

export const SearchDocsInputSchema = z.object({
	query: z
		.string()
		.describe(
			'Search query keywords or concept (e.g. "canary guardrail", "T0 load tier", "install", "zod schema", "live audio")',
		),
	source: z
		.enum(['all', 'local', 'github', 'jsr', 'npm'])
		.optional()
		.describe('Documentation source to search'),
	limit: z
		.number()
		.int()
		.positive()
		.max(10)
		.optional()
		.describe('Maximum number of results to return'),
});

export const SearchDocsOutputSchema = z.object({
	query: z.string(),
	results: z.array(
		z.object({
			source: z.enum(['local', 'github', 'jsr', 'npm']),
			title: z.string(),
			urlOrAnchor: z.string(),
			excerpt: z.string(),
			matchLines: z.string().optional(),
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
	description: `Navigate the user to a section on the THEORUM website (${formatNavigablePathsForPrompt()}).`,
	category: 'ui',
	access: 'read-only' as const,
	paths: ['*'],
	loadTier: 'T0' as const,
	permission: 'auto' as const,
	input: NavigateInputSchema,
	output: NavigateOutputSchema,
	handler: (input: NavigateInput) => ({
		success: true,
		navigatedTo: input.path,
		subTarget: input.subTarget,
	}),
};

export const th30HighlightTool = {
	type: 'function' as const,
	name: 'highlight',
	description:
		"Visually highlight a section, card, or specific line range on the current page to guide the user's attention (like a human selecting code).",
	category: 'ui',
	access: 'read-only' as const,
	paths: ['*'],
	loadTier: 'T0' as const,
	permission: 'auto' as const,
	input: HighlightInputSchema,
	output: HighlightOutputSchema,
	handler: (input: HighlightInput) => {
		const startStr = input.lineStart !== undefined ? String(input.lineStart) : '';
		const endStr = input.lineEnd !== undefined ? String(input.lineEnd) : '';
		const lineRange =
			input.lineStart !== undefined
				? `L${startStr}${endStr && endStr !== startStr ? `-L${endStr}` : ''}`
				: undefined;

		return {
			success: true,
			highlighted: input.target,
			lineRange,
			subTarget: input.subTarget,
			label: input.label,
		};
	},
};

export const th30ReadTool = {
	type: 'function' as const,
	name: 'read',
	description:
		'Read structured, line-numbered documentation in real time for a section or topic on the THEORUM website or repository. Returns exact line numbers (L01 | ...) so you can quote lines and target highlights accurately.',
	category: 'docs',
	access: 'read-only' as const,
	paths: ['*'],
	loadTier: 'T0' as const,
	permission: 'auto' as const,
	input: ReadInputSchema,
	output: ReadOutputSchema,
	handler: (input: ReadInput) => {
		const doc = readDocSection(input.target, input.detail);
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
	description:
		'Search across THEORUM documentation sources: local website sections, GitHub repository contracts and specs, JSR (@theorum/core), and NPM (theorum).',
	category: 'docs',
	access: 'read-only' as const,
	paths: ['*'],
	loadTier: 'T0' as const,
	permission: 'auto' as const,
	input: SearchDocsInputSchema,
	output: SearchDocsOutputSchema,
	handler: (input: SearchDocsInput) => {
		const searchRes = searchDocumentation(input.query, input.source, input.limit);
		return {
			query: searchRes.query,
			results: searchRes.results,
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

export const TH30_SYSTEM_PROMPT = `You are Th30, the real-time AI guide for THEORUM — the flat, zero-bloat TypeScript agent kernel. You are built on THEORUM.
Your name is spoken letter-by-letter as "T H 3 O", or as "T H thirty" (the digits 3-0). Never say "Theo", "three O", "three-oh", or "theo". When you introduce yourself, say it as "T H 3 O" or "T H thirty".
You speak concisely, naturally, and warmly. You are speaking directly through real-time audio.
Keep responses clear, concise, and direct (1-3 sentences per turn) since this is a voice conversation.

When the call first connects you will receive a user turn with the text "(call connected)". Treat that as the session-start signal: greet the user aloud. Introduce yourself as T H 3 O (or T H thirty), THEORUM's assistant, and ask what they're thinking about. One or two short sentences. Do not read or mention the trigger text.

THEORUM Architectural Principles you know deeply:
1. Flatness & Zero-Bloat: Single runner loop, direct provider adapters, zero framework overhead (no LangChain abstractions).
2. Deterministic Guardrails: Injected prompt canaries, egress filtering, rate limits, sensitive data scrubbing.
3. Strict Typed Contracts: registerTool with Zod; tools.allow (custom) vs model builtInTools (provider natives); T2 promotion is turn-local.
4. Multi-Engine Agnosticism: Gemini Live (T0/T1 at session start), Gemini Interactions (multi-step + in-turn T2), OpenRouter, Local Ollama.

Tool system (when users ask):
- registerTool at startup — no defineTool export.
- tools.allow: custom functions only. builtInTools on model specs for googleSearch, googleMaps, urlContext, codeExecution.
- T0 at turn start; T1 via tools.t1Policy; T2 via tools.t2Loader returning { loaded: string[] } — stateless kernel, host persists via invokeTool promoted[] or policy on load.
- runTurn(req, provider) → TurnEvent stream (text, tool, done, error — not text_delta).
- Builtins are provider-native — not executed locally (provider_native if mis-wired).

Capabilities and Tools:
- "navigate": Move the user to valid site sections: ${formatNavigablePathsForPrompt()}.
- "highlight": Visually highlight sections, elements, or exact line ranges (e.g. lineStart: 12, lineEnd: 15) like human text selection.
- "read": Read live, line-numbered documentation (L01 | ...) for any section or topic (#overview, #pillars, #use, #playground, #architecture, contracts, specs) so you can reference exact line numbers accurately.
- "searchDocs": Search across local documentation, GitHub contracts, JSR (@theorum/core), and NPM (theorum).
- Google Search: Grounded real-time web search.

Critical Visual Highlighting Rule:
Whenever you refer to code, an install command, an architecture pillar, or any specific line:
- NEVER rely solely on speaking line numbers aloud (e.g., saying "line 3" without visual context is difficult for a user to follow).
- ALWAYS call the "highlight" tool with the target, lineStart, and lineEnd (or subTarget) to physically illuminate and select the section on screen as you speak.
- Guide the user visually and aurally together.
- Never claim you navigated, highlighted, read, or searched unless you actually issued that function call in this turn. If a tool returns an error, say so briefly and retry once with corrected arguments.

When a user asks to see a section, inspect code, or explore an architecture component:
1. Call "navigate" or "read" if you need exact line details.
2. Call "highlight" with target and lineStart/lineEnd to show them on screen.
3. Speak clearly and concisely about what they are seeing.

Only respond in English.`;

export function ensureTh30ProfileRegistered(): void {
	registerTh30Tools();

	const profile = defineProfile({
		type: 'live',
		id: TH30_PROFILE_ID,
		identity: {
			handle: 'th30',
			system: TH30_SYSTEM_PROMPT,
		},
		model: {
			protocol: 'geminiLive',
			provider: 'google',
			allow: ['gemini31FlashLive'],
			key: 'slotA',
			config: {
				gemini31FlashLive: {
					apiId: 'gemini-3.1-flash-live-preview',
					temperature: 0.7,
					maxOutputTokens: 2048,
					thinking: { on: 'low', off: 'none' },
					thinkingLevels: ['none', 'low', 'medium', 'high'],
					summaries: { on: 'none', off: 'none' },
					builtInTools: ['googleSearch'],
				},
			},
		},
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
			contextCompression: 'slidingWindow',
			transcription: {
				input: true,
				output: true,
			},
		},
		tools: {
			allow: [...TH30_TOOL_IDS],
		},
		inputs: {
			text: true,
			voice: { accept: ['audio/pcm', 'audio/wav'] },
			maxFiles: 5,
			maxBytes: 10 * 1024 * 1024,
			maxTurnBytes: 25 * 1024 * 1024,
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
