/**
 * Th30 ("T H 3 O") — the site's live voice guide. A Gemini Live profile with
 * docs tools over the composed index (navigate, highlight, read, search),
 * web search, and a question against a public repo's wiki.
 */
import { defineProfile, registerProfile, registerTool } from '@theoremjs/agents';
import { googleBindingViolation } from '@theoremjs/agents/presets/google';
import { SURFACE_PROMPT, SURFACE_TOOL_NAMES, surfaceTools } from '@theoremjs/agents/surface';
import { z } from 'zod';
import { getDocIndex } from '../docs/.server/load-index';
import { formatNavigableForPrompt, readDoc, resolveNavigate, searchDocs } from '../docs/query';
import { TH30_PROFILE_ID } from '../th30-id';

/* -------------------------------------------------------------------------- */
/* Tool Schemas (Strict Zod Contracts)                                        */
/* -------------------------------------------------------------------------- */

const NavigateInputSchema = z.object({
	slug: z
		.string()
		.describe(
			'Docs chapter slug (start, modalities, identity, models, …). Validated against the index.',
		),
	blockId: z
		.string()
		.optional()
		.describe('Optional in-page block or field path (e.g. session, types, live.vad)'),
});

const NavigateOutputSchema = z.object({
	success: z.boolean(),
	navigatedTo: z.string(),
	error: z.string().optional(),
});

const HighlightInputSchema = z.object({
	blockId: z
		.string()
		.describe('DOM id to focus via getElementById (e.g. session, live.vad, types)'),
	label: z.string().optional().describe('Short label shown on the highlight'),
});

const HighlightOutputSchema = z.object({
	success: z.boolean(),
	highlighted: z.string(),
	label: z.string().optional(),
});

const ReadInputSchema = z.object({
	target: z
		.string()
		.describe('Chapter slug, slug#blockId, or full_page — projected from the composed index'),
	detail: z
		.enum(['summary', 'full', 'code_only'])
		.optional()
		.describe('summary | full | code_only'),
});

const ReadOutputSchema = z.object({
	target: z.string(),
	title: z.string(),
	content: z.string().describe('Structured, line-numbered markdown representation (L01 | ...)'),
	lineCount: z.number(),
});

const SearchDocsInputSchema = z.object({
	query: z.string().describe('Words or field names; plurals, typos and partial words still match'),
	limit: z.number().int().positive().max(10).optional(),
});

const SearchDocsOutputSchema = z.object({
	query: z.string(),
	results: z.array(
		z.object({
			title: z.string(),
			slug: z.string().describe('Pass to navigate or read'),
			blockId: z.string().optional().describe('Pass to navigate or highlight'),
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

const th30NavigateTool = {
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

const th30HighlightTool = {
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

const th30ReadTool = {
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
	handler: (input: ReadInput) => readDoc(getDocIndex(), input.target, input.detail),
};

const th30SearchDocsTool = {
	type: 'function' as const,
	name: 'searchDocs',
	description:
		'Search the docs: chapter titles, sections, fields and code examples. Each hit carries the slug and blockId to navigate, highlight or read.',
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
				slug: hit.slug,
				blockId: hit.blockId,
				urlOrAnchor: hit.href,
				excerpt: hit.excerpt,
			})),
			totalMatches: searchRes.totalMatches,
		};
	},
};

/** Exa's keyless MCP server: th30's web search, since free Gemini keys refuse Google Search. */
const th30SearchWebTool = {
	type: 'mcp' as const,
	name: 'searchWeb',
	description:
		'Search the web with Exa for what the Theorem docs do not cover: providers, models, other libraries, current news. Describe the page you want, not just keywords.',
	category: 'web',
	access: 'read-only' as const,
	paths: ['*'],
	loadTier: 'T0' as const,
	permission: 'auto' as const,
	serverUrl: 'https://mcp.exa.ai/mcp',
	mcpToolName: 'web_search_exa',
	input: z.object({
		query: z.string().min(1).max(500).describe('A description of the ideal page'),
		numResults: z.number().int().min(1).max(5).optional(),
	}),
	output: z.string().describe('Titles, links and highlights from the top results'),
};

/** The public package. Omitted `repoName` is filled in here before the call. */
const TH30_REPO = 'masudl-hub/theoremai';

/** DeepWiki's keyless MCP server: questions about a public repo the site docs do not answer. */
const th30AskRepoTool = {
	type: 'mcp' as const,
	name: 'askRepo',
	description: `Ask DeepWiki about a public GitHub repo. Omit repoName for ${TH30_REPO}. Use only when searchDocs has no answer, never for a field the docs already define.`,
	category: 'docs',
	access: 'read-only' as const,
	paths: ['*'],
	loadTier: 'T0' as const,
	permission: 'auto' as const,
	serverUrl: 'https://mcp.deepwiki.com/mcp',
	mcpToolName: 'ask_wiki_question',
	input: z.object({
		repoName: z
			.string()
			.trim()
			.min(1)
			.max(200)
			.default(TH30_REPO)
			.describe(`GitHub repo as owner/repo. Omit for ${TH30_REPO}.`),
		question: z.string().min(1).max(2000).describe('What to ask about the repo'),
	}),
	output: z.object({
		result: z.string().describe('Answer from the repo wiki'),
	}),
};

const TH30_TOOL_IDS = [
	'navigate',
	'highlight',
	'read',
	'searchDocs',
	'searchWeb',
	'askRepo',
] as const;

/** Register all Th30 tools into the process-local tool registry. */
function registerTh30Tools(): void {
	registerTool(th30NavigateTool);
	registerTool(th30HighlightTool);
	registerTool(th30ReadTool);
	registerTool(th30SearchDocsTool);
	registerTool(th30SearchWebTool);
	registerTool(th30AskRepoTool);
	for (const tool of surfaceTools({ category: 'page' })) registerTool(tool);
}

/** What th30 does with the playground surface, on top of how it uses look and act. */
const TH30_BUILDER_PROMPT = `Building an agent. On the playground you build the visitor's agent with them; they see every change land. Look at "playground" to start (look or act on it from any page and it opens).
- Ask at most 3 short questions (what it does, which type, which model), then build. Narrate in a few words, never field by field.
- An agent runs only when the playground has no issues: fix them, or tell the visitor what only they can do.
- newAgent replaces the draft: ask first if the visitor has changed the current one.
- When it runs, offer to try it: act try with their message, and tell them what came back.
- When something doesn't work ("why isn't this working?"): look for issues, test the key nodes and tools involved, and say what you found. A key's card tells you if it is missing, malformed, or the same as another; its test tells you whether the provider accepts it.
- To explain a setting, searchDocs it first. The site surface's go takes the visitor home, to the docs or the playground.`;

/* -------------------------------------------------------------------------- */
/* System Prompt & Profile Definition                                         */
/* -------------------------------------------------------------------------- */

function th30SystemPrompt(): string {
	const chapters = formatNavigableForPrompt(getDocIndex());
	return `You are Th30, the real-time AI guide for Theorem. You are built on Theorem.
Your name is spoken letter-by-letter as "T H 3 O", or as "T H thirty" (the digits 3-0). Never say "Theo", "three O", "three-oh", or "theo".
You speak concisely (1-3 sentences). English only.

You always know the page the visitor is on. A line starting "(page)" names it: the path, the page's title and what is on it, and sometimes the visitor's state in brackets (the chapter block they are viewing; on the playground the agent they are building, its type, its issue count and the section they have open). Page lines are context, not the caller speaking; never read one out or announce it. They update silently as the visitor moves, so use the latest one when they say "this", "here" or "this page". Name a chapter in plain words, not the path.

When the call first connects you get a cue like "(call connected) (page) /docs/guardrails — …". It is not the caller speaking; never read it out. Open the call yourself, warmly and in one short breath, the way a friendly guide picks up: say your name once, then offer help that fits the page they're on. On the docs landing, offer to find what they're after. Vary the wording from call to call. No "How may I assist you", no list of what you can do.

On the playground, explain a setting by searching the docs, never by guessing: searchDocs the field or section name, read the hit, then answer from it.

${SURFACE_PROMPT}

${TH30_BUILDER_PROMPT}

Docs live at /docs. Chapters: ${chapters}.
Type-scoped pins are on modalities (image, speech, live, decision, host). Each chapter ends with a dictionary of its fields. Do not invent field copy — read it.

Tools:
- navigate: { slug, blockId? } — only slugs from the index.
- highlight: { blockId } — DOM id via getElementById (live.vad is an id, not a CSS selector).
- read: slug, slug#block, or full_page. Line-numbered markdown from the same projector as the page.
- searchDocs: { query } — stemmed, typo-tolerant search over titles, sections, fields and examples. Hits that match every word come first. Each hit has slug and blockId: search, then navigate or highlight the hit, then read it before you answer.
- searchWeb: { query } — the web, through Exa. Only for providers, models, other libraries and news. Not for Theorem.
- askRepo: { question, repoName? } — DeepWiki for a public GitHub repo. Omit repoName for ${TH30_REPO}; pass owner/repo to ask about another public repo. Call it only when searchDocs has no answer. A field the docs define is answered from the docs.

When you point at a fact, call highlight with that blockId. Never claim you navigated, highlighted, read, searched, or asked a repo unless you issued that call. If a tool errors, say so and retry once.`;
}

/** Th30 runs on free keys, so it holds to the Google preset's free-tier rules. */
const TH30_MODEL = {
	protocol: 'geminiLive',
	provider: 'google',
	apiId: 'gemini-3.8-live',
	temperature: 0.7,
	maxOutputTokens: 2048,
} as const;

export function ensureTh30ProfileRegistered(): void {
	const violation = googleBindingViolation(TH30_MODEL, { freeTier: true });
	if (violation) throw new Error(`th30: ${violation.message}`);
	registerTh30Tools();

	const profile = defineProfile({
		type: 'live',
		id: TH30_PROFILE_ID,
		identity: {
			handle: 'th30',
			system: th30SystemPrompt(),
		},
		models: { gemini38Live: TH30_MODEL },
		key: 'main',
		// A quota refusal on the first free key reopens the call on the second, when one is set.
		fallbackKey: 'overflow',
		live: {
			// Text carries only the call-connected cue, so th30 greets first; page lines ride as context, which draws no reply.
			ingress: { text: true, video: false },
			voice: 'Sulafat',
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
			allow: [...TH30_TOOL_IDS, ...SURFACE_TOOL_NAMES],
		},
		guardrails: {
			// A reply that carries sensitive data or injection phrasing is refused. Addresses are cited.
			detect: {
				ids: { at: { live_reply: 'block' } },
				financial: { at: { live_reply: 'block' } },
				credentials: { at: { live_reply: 'block' } },
				injection: { at: { live_reply: 'block' } },
			},
			blockedReply: { onBlock: 'refuse' },
		},
	});

	registerProfile(profile);
}
