/**
 * Unified Documentation and Site Knowledge Source for THEORUM.
 *
 * Single source of truth for:
 * 1. Live page navigation routes & anchors
 * 2. Section readouts with accurate line numbers for real-time grounded agent inspection
 * 3. Unified search across local site sections, GitHub contracts/specs, JSR, and NPM
 *
 * @module
 */

export interface NavigableTarget {
	path: string;
	title: string;
	description: string;
	subTargets?: Array<{ id: string; name: string; description: string }>;
}

export const NAVIGABLE_TARGETS: NavigableTarget[] = [
	{
		path: '/#hero',
		title: 'Hero / Header',
		description: 'The top hero section with kernel version, live status, and core proposition.',
		subTargets: [
			{ id: 'hero-title', name: 'Title', description: 'THEORUM title & version badge' },
			{
				id: 'th30-dock',
				name: 'Th30',
				description: 'Voice assistant for site navigation and docs',
			},
		],
	},
	{
		path: '/#overview',
		title: 'Overview: The Flat Kernel',
		description:
			'Core overview and thesis of THEORUM: flat runtime, zero bloat, single runner loop, deterministic boundaries.',
	},
	{
		path: '/#pillars',
		title: 'Pillars: Core Architecture Pillars',
		description: 'The 5 foundational pillars of THEORUM architecture.',
		subTargets: [
			{
				id: 'profile',
				name: 'Profile Pillar',
				description:
					'Single contract: identity, model, tools.allow, builtInTools, inputs, outputs, guardrails',
			},
			{
				id: 'kernel',
				name: 'Kernel Pillar',
				description: 'Flat execution core — resolve, stream, tools, done',
			},
			{
				id: 'providers',
				name: 'Providers Pillar',
				description: 'createProvider lazy door for Google, OpenRouter, and Local models',
			},
			{
				id: 'guardrails',
				name: 'Guardrails Pillar',
				description: 'Inbound sanitization, canaries, and egress enforcement',
			},
			{
				id: 'observability',
				name: 'Observability Pillar',
				description: 'Structured turn traces written to user-controlled sinks',
			},
		],
	},
	{
		path: '/#use',
		title: 'Use / Quickstart',
		description:
			'Installation instructions and code snippets demonstrating defineProfile, registerProfile, registerTool, and runTurn with a provider.',
		subTargets: [
			{
				id: 'install',
				name: 'Install Snippet',
				description: 'npm install theorum and jsr add @theorum/core',
			},
			{
				id: 'agent',
				name: 'Agent Definition',
				description: 'defineProfile and identity specification',
			},
			{ id: 'tools', name: 'Tools Registration', description: 'registerTool with Zod schemas' },
			{
				id: 'guardrails',
				name: 'Guardrails Config',
				description: 'Canary token and egress enforcement',
			},
		],
	},
	{
		path: '/#playground',
		title: 'Playground: Interactive Facet Editor',
		description:
			'Visual profile composer — edit facets, compile defineProfile + registerTool source, and export. Does not execute runTurn.',
		subTargets: [
			{ id: 'identity', name: 'Identity Facet', description: 'Handle and system prompt' },
			{ id: 'model', name: 'Model Facet', description: 'Provider, model allowlist, parameters' },
			{ id: 'tools', name: 'Tools Facet', description: 'Custom tools, loadTier, tools.t2Loader' },
			{
				id: 'guardrails',
				name: 'Guardrails Facet',
				description: 'Canary tokens and egress enforcement',
			},
		],
	},
	{
		path: '/#architecture',
		title: 'Architecture / Package Map',
		description: 'Complete interactive package tree and module breakdown of @theorum/core.',
		subTargets: [
			{ id: 'theorum', name: 'Root Package', description: 'theorum root barrel' },
			{ id: 'kernel', name: 'Kernel Module', description: 'src/kernel runner and tool registry' },
			{
				id: 'guardrails',
				name: 'Guardrails Module',
				description: 'src/guardrails canaries and egress',
			},
			{
				id: 'providers',
				name: 'Providers Module',
				description: 'src/providers multi-engine adapters',
			},
			{
				id: 'observability',
				name: 'Observability Module',
				description: 'src/observability trace sinks',
			},
			{ id: 'presets', name: 'Presets Module', description: 'src/presets/google built-in tools' },
		],
	},
];

/** Path anchors Th30 `navigate` accepts — derived from {@link NAVIGABLE_TARGETS}. */
export const NAVIGABLE_PATHS = NAVIGABLE_TARGETS.map((t) => t.path) as [string, ...string[]];

export function formatNavigablePathsForPrompt(): string {
	return NAVIGABLE_TARGETS.map((t) => `${t.path} (${t.title})`).join(', ');
}

export interface DocSectionContent {
	id: string;
	title: string;
	path: string;
	source: 'local' | 'github' | 'jsr' | 'npm';
	lines: string[];
	tags: string[];
}

export const SITE_DOC_SECTIONS: DocSectionContent[] = [
	{
		id: '#hero',
		title: 'THEORUM Hero & Mission',
		path: '/#hero',
		source: 'local',
		tags: ['hero', 'version', 'runtime', 'live', 'introduction', 'mission'],
		lines: [
			'# THEORUM — The Flat TypeScript Agent Kernel',
			'Version: @1.0.0',
			'',
			'## Mission & Core Value',
			'THEORUM is a flat, zero-bloat TypeScript agent kernel built around 4 core principles:',
			'1. Flatness & Zero-Bloat: Single runner loop, direct provider adapters, zero framework overhead.',
			'2. Deterministic Guardrails: Injected prompt canaries, egress filtering, rate limits, sensitive data scrubbing.',
			'3. Strict Typed Contracts: Pure Zod tool schemas, clean type-safe profiles, separate wire framing from network transport.',
			'4. Multi-Engine Agnosticism: Gemini Live real-time audio/video, Gemini Interactions chat, OpenRouter OpenAI-compat, Local Ollama.',
		],
	},
	{
		id: '#overview',
		title: 'Overview: Runtime Architecture',
		path: '/#overview',
		source: 'local',
		tags: ['overview', 'flat', 'kernel', 'runtime', 'architecture', 'zero-bloat'],
		lines: [
			'# Overview: A Unified Runtime for Agentic Execution',
			'',
			'THEORUM turns ad-hoc agent scripts into a typed execution kernel.',
			'One contract per agent — predictable at every boundary.',
			'',
			'## Key Characteristics',
			'- Single Turn Loop: resolve tool snapshot → stream provider → execute function tools → continue or done.',
			'- Stateless kernel: no cross-turn tool visibility memory — hosts own persistence (t1Policy on load, invokeTool promoted[], session state).',
			'- No Hidden Prompts: What you write in defineProfile is what reaches the model.',
			'- Pluggable Sinks: Traces write to your chosen sink (memory, jsonl, or directory).',
		],
	},
	{
		id: '#pillars',
		title: 'Architecture Pillars',
		path: '/#pillars',
		source: 'local',
		tags: ['pillars', 'profile', 'kernel', 'providers', 'guardrails', 'observability'],
		lines: [
			'# Architecture Pillars',
			'',
			'## Pillar 1: Profile (defineProfile)',
			'Agent setup is usually scattered across prompts, tools, and configs.',
			'A profile bundles identity, model config, tools.allow (custom functions only), model builtInTools (provider natives), inputs, outputs, and guardrails.',
			'',
			'## Pillar 2: Kernel (runTurn & single runner loop)',
			'Custom runners diverge across streaming, tool calls, and retries.',
			'The kernel runs every turn identically: resolve snapshot → stream → tools → done. T2 promotion is turn-local visibility, not durable state.',
			'',
			'## Pillar 3: Providers (createProvider)',
			'Switching models usually requires rewriting the agent.',
			'createProvider is the single door — OpenRouter, Gemini Interactions/Live, and Local Ollama load lazily on the first turn.',
			'',
			'## Pillar 4: Guardrails (Deterministic Protection)',
			'Inbound checks scrub text and fence user data.',
			'Canary tokens detect prompt leakage deterministically, and egress enforcement inspects outbound payloads.',
			'',
			'## Pillar 5: Observability (Structured Traces)',
			'Every turn writes a structured TraceRecord to a destination you control (memorySink, jsonlSink, dirSink).',
		],
	},
	{
		id: '#use',
		title: 'Quickstart, Installation & Code Examples',
		path: '/#use',
		source: 'local',
		tags: ['use', 'quickstart', 'install', 'code', 'npm', 'jsr', 'example', 'profile', 'tool'],
		lines: [
			'# Quickstart & Usage',
			'',
			'## Installation',
			'npm install theorum',
			'# or for Deno / JSR:',
			'jsr add @theorum/core',
			'',
			'## Minimal Profile & Execution',
			'import { defineProfile, registerProfile, runTurn, registerTool, createProvider } from "theorum";',
			'import { z } from "zod";',
			'',
			'registerTool({',
			'  type: "function",',
			'  name: "lookup_order",',
			'  description: "Fetch order state from the host.",',
			'  category: "commerce",',
			'  access: "read-only",',
			'  paths: ["*"],',
			'  loadTier: "T0",',
			'  permission: "session_consent",',
			'  input: z.object({ orderId: z.string() }),',
			'  output: z.object({ status: z.string() }),',
			'  handler: async (input) => ({ status: "shipped " + input.orderId }),',
			'});',
			'',
			'const profile = defineProfile({',
			'  id: "order_bot",',
			'  identity: {',
			'    handle: "order_bot",',
			'    system: "You help users look up orders. Use lookup_order when given an ID.",',
			'  },',
			'  model: {',
			'    protocol: "geminiInteractions",',
			'    provider: "google",',
			'    allow: ["fast"],',
			'    config: {',
			'      fast: {',
			'        apiId: "gemini-3.5-flash-lite",',
			'        thinking: { on: "high", off: "minimal" },',
			'        thinkingLevels: ["minimal", "low", "medium", "high"],',
			'        summaries: { on: "auto", off: "none" },',
			'        maxOutputTokens: 8192,',
			'        temperature: 1,',
			'        builtInTools: ["googleSearch"],',
			'      },',
			'    },',
			'    select: { fast: "fast" },',
			'    maxSteps: 4,',
			'  },',
			'  tools: { allow: ["lookup_order"] },',
			'  inputs: { text: true },',
			'  guardrails: { canary: true, sanitizeInput: true },',
			'});',
			'registerProfile(profile);',
			'',
			'const provider = await createProvider(profile);',
			'for await (const event of runTurn({ profile: "order_bot", input: { text: "Where is order 12345?" } }, provider)) {',
			'  if (event.type === "text") console.log(event.text);',
			'  if (event.type === "done") break;',
			'}',
			'',
			'## Tool visibility (T0 / T1 / T2)',
			'- T0: wired at turn start when gated (custom on tools.allow / builtin on model builtInTools).',
			'- T1: wired when profile.tools.t1Policy(ctx) selects the id.',
			'- T2: turn-local only — designated tools.t2Loader returns { loaded: string[] }; kernel promotes ids for the rest of that turn. Next turn starts fresh unless the host restores visibility.',
			'',
			'## Host-initiated tools',
			'invokeTool({ profile, name, input, resume?, promoted?, snapshot? }) — shared execute core with runTurn; snapshot is cloned on entry.',
			'Builtins (googleSearch, codeExecution, …) are provider-native — kernel pins generation.builtins, does not execute handlers locally (provider_native if model emits a function_call for them).',
		],
	},
	{
		id: '#playground',
		title: 'Playground & Facet System',
		path: '/#playground',
		source: 'local',
		tags: ['playground', 'facets', 'interactive', 'compiler', 'matrix', 'testing'],
		lines: [
			'# Playground: Interactive Facet Visualizer',
			'',
			'The Playground is a visual profile composer — not a turn runner.',
			'Facets map to defineProfile fields:',
			'- Identity: handle, system prompt.',
			'- Model: protocol, provider, model specs, builtInTools (provider natives — not tools.allow).',
			'- Tools: custom function tools (registerTool + tools.allow), loadTier per tool, optional tools.t2Loader id.',
			'- Inputs & Outputs: text/voice, streaming, structured schemas, speech, live.',
			'- Guardrails: canary, sanitization, egress.',
			'',
			'Run / Export compiles TypeScript source (defineProfile + registerTool). geminiLive profiles accept T0 tools only — declarations are fixed at session setup; T1/T2 and tools.t2Loader do not apply.',
		],
	},
	{
		id: '#architecture',
		title: 'Package Architecture & Modules',
		path: '/#architecture',
		source: 'local',
		tags: ['architecture', 'modules', 'packages', 'kernel', 'guardrails', 'providers', 'presets'],
		lines: [
			'# Package Architecture Breakdown',
			'',
			'## Module Tree',
			'- theorum (mod.ts): Root package barrel.',
			'- theorum/kernel: runTurn runner, runSession live door, registerTool registry, invokeTool, prepareTurnToolSnapshot.',
			'- theorum/guardrails: Canary token generation, inbound sanitization, egress filtering.',
			'- theorum/providers: Google Gemini Live & Interactions, OpenRouter, Local Ollama.',
			'- theorum/presets/google: Builtin registrations (googleSearch, googleMaps, urlContext, codeExecution).',
			'- theorum/observability: Trace recording and sinks.',
			'- theorum/host: Client event projection and stream helpers.',
			'',
			'## Tool modules (src/kernel/tools/)',
			'- registry.ts: process-local catalog — register at startup.',
			'- resolve.ts: TurnToolSnapshot — T0 resolve, expandT1Policy, promoteLoadedTools, cloneTurnToolSnapshot.',
			'- execute.ts: executeRegisteredTool — shared by runner and invokeTool.',
			'- invoke.ts: invokeTool host entrypoint.',
		],
	},
	{
		id: 'contracts',
		title: 'THEORUM Contracts & Specifications',
		path: 'https://github.com/masudl-hub/theorum/tree/main/docs/contracts',
		source: 'github',
		tags: ['contracts', 'specs', 'tool-system', 'kernel', 'guardrails', 'providers', 'presets'],
		lines: [
			'# THEORUM Contracts & Specifications',
			'',
			'## Tool system (docs/contracts/kernel.md + tool registry)',
			'- registerTool at startup — single catalog. No defineTool export.',
			'- type: "builtin" (provider-native, on model builtInTools) vs type: "function" (Zod handler, on tools.allow).',
			'- Load tiers: T0 at turn start; T1 via tools.t1Policy; T2 via tools.t2Loader returning { loaded: string[] } (turn-local promotion). Live profiles are T0-only — declarations fixed at session setup.',
			'- invokeTool for host-initiated execution; optional promoted[] and snapshot (cloned).',
			'',
			'## Kernel contract (docs/contracts/kernel.md)',
			'- Stream events: thought, text, tool, structured, media, grounding, evidence, tokens, done, error.',
			'- runTurn(req: TurnRequest, provider: ModelProvider) → AsyncGenerator<TurnEvent>.',
			'',
			'## Google presets (docs/contracts/presets-google.md)',
			'- googleSearch, googleMaps, urlContext, codeExecution — declare on model.config.*.builtInTools.',
		],
	},
	{
		id: 'jsr',
		title: 'JSR Package: @theorum/core',
		path: 'https://jsr.io/@theorum/core',
		source: 'jsr',
		tags: ['jsr', 'deno', 'package', 'typescript', 'core'],
		lines: [
			'# JSR Registry: @theorum/core',
			'',
			'URL: https://jsr.io/@theorum/core',
			'Install: jsr add @theorum/core',
			'',
			'Exported entrypoints:',
			'- @theorum/core: defineProfile, registerProfile, runTurn, runSession, registerTool, invokeTool, createProvider, prepareTurnToolSnapshot.',
			'- Native TypeScript publication with zero transpile required for Deno, Bun, and modern bundlers.',
		],
	},
	{
		id: 'npm',
		title: 'NPM Package: theorum',
		path: 'https://www.npmjs.com/package/theorum',
		source: 'npm',
		tags: ['npm', 'node', 'package', 'theorum'],
		lines: [
			'# NPM Registry: theorum',
			'',
			'URL: https://www.npmjs.com/package/theorum',
			'Install: npm install theorum',
			'',
			'Full ESM & CommonJS support with TypeScript declaration files.',
		],
	},
	{
		id: 'github',
		title: 'GitHub Repository: masudl-hub/theorum',
		path: 'https://github.com/masudl-hub/theorum',
		source: 'github',
		tags: ['github', 'repository', 'open-source', 'code', 'tests', 'ci'],
		lines: [
			'# GitHub Repository: masudl-hub/theorum',
			'',
			'Repository: https://github.com/masudl-hub/theorum',
			'Architecture: Flat TypeScript agent kernel with contract tests and Stryker mutation testing on guardrails and tool modules.',
			'Key directories: src/kernel, src/guardrails, src/providers, src/presets, docs/contracts.',
		],
	},
];

/**
 * Format raw lines with 1-indexed, zero-padded line numbers.
 * E.g. "L01 | # Title\nL02 | Content..."
 */
export function formatWithLineNumbers(title: string, lines: string[]): string {
	const header = `=== ${title} ===\n`;
	const maxDigits = Math.max(2, String(lines.length).length);
	const numbered = lines.map((line, idx) => {
		const num = String(idx + 1).padStart(maxDigits, '0');
		return `L${num} | ${line}`;
	});
	return header + numbered.join('\n');
}

/**
 * Read structured, line-numbered documentation for a section or topic.
 */
export function readDocSection(
	target: string,
	detail: 'summary' | 'full' | 'code_only' = 'full',
): { target: string; title: string; content: string; lineCount: number } {
	const cleanTarget = target.trim().toLowerCase();

	if (cleanTarget === 'full_page' || cleanTarget === 'all') {
		const allLines: string[] = [];
		for (const sec of SITE_DOC_SECTIONS.filter((s) => s.source === 'local')) {
			allLines.push(`--- Section: ${sec.id} (${sec.title}) ---`);
			allLines.push(...sec.lines);
			allLines.push('');
		}
		const formatted = formatWithLineNumbers('THEORUM Full Page Documentation', allLines);
		return {
			target: 'full_page',
			title: 'Full Page Documentation',
			content: formatted,
			lineCount: allLines.length,
		};
	}

	const section =
		SITE_DOC_SECTIONS.find(
			(s) =>
				s.id.toLowerCase() === cleanTarget ||
				s.path.toLowerCase() === cleanTarget ||
				s.id.replace(/^#/, '').toLowerCase() === cleanTarget.replace(/^#/, ''),
		) ?? SITE_DOC_SECTIONS.find((s) => s.tags.includes(cleanTarget));

	if (!section) {
		const validList = SITE_DOC_SECTIONS.map((s) => `${s.id} (${s.title})`).join(', ');
		const fallback = `Section '${target}' not found. Valid targets include: ${validList}`;
		return {
			target,
			title: 'Not Found',
			content: fallback,
			lineCount: 1,
		};
	}

	let linesToFormat = section.lines;

	if (detail === 'code_only') {
		linesToFormat = section.lines.filter(
			(l) =>
				l.startsWith('npm ') ||
				l.startsWith('jsr ') ||
				l.startsWith('import ') ||
				l.startsWith('const ') ||
				l.startsWith('register') ||
				l.startsWith('for await') ||
				l.startsWith('  ') ||
				l.startsWith('//'),
		);
		if (linesToFormat.length === 0) linesToFormat = section.lines;
	} else if (detail === 'summary') {
		linesToFormat = section.lines.slice(0, 10);
	}

	const formatted = formatWithLineNumbers(`${section.title} (${section.id})`, linesToFormat);

	return {
		target: section.id,
		title: section.title,
		content: formatted,
		lineCount: linesToFormat.length,
	};
}

export interface SearchDocResult {
	source: 'local' | 'github' | 'jsr' | 'npm';
	title: string;
	urlOrAnchor: string;
	excerpt: string;
	matchedLineNumber?: number;
	score: number;
}

function scoreDocSection(section: DocSectionContent, rawTerms: string[]): SearchDocResult | null {
	let score = 0;
	let bestLineIdx = -1;
	let bestLine = '';

	for (const term of rawTerms) {
		if (section.title.toLowerCase().includes(term)) score += 15;
		if (section.tags.some((tag) => tag.includes(term))) score += 10;
		if (section.id.toLowerCase().includes(term)) score += 8;
	}

	for (const [idx, line] of section.lines.entries()) {
		const lower = line.toLowerCase();
		let lineMatches = 0;
		for (const term of rawTerms) {
			if (lower.includes(term)) lineMatches++;
		}
		if (lineMatches > 0) {
			score += lineMatches * 5;
			if (bestLineIdx === -1 || lineMatches > 1) {
				bestLineIdx = idx;
				bestLine = line;
			}
		}
	}

	if (score <= 0) return null;

	const lineNum = bestLineIdx >= 0 ? bestLineIdx + 1 : 1;
	const excerpt = bestLine.length > 0 ? bestLine : section.lines.slice(0, 3).join(' ');
	return {
		source: section.source,
		title: section.title,
		urlOrAnchor: section.path,
		excerpt,
		matchedLineNumber: lineNum,
		score,
	};
}

/**
 * Fast multi-source search across local site sections, GitHub contracts, JSR, and NPM.
 */
export function searchDocumentation(
	query: string,
	source: 'all' | 'local' | 'github' | 'jsr' | 'npm' = 'all',
	limit = 5,
): {
	query: string;
	results: Array<{
		source: 'local' | 'github' | 'jsr' | 'npm';
		title: string;
		urlOrAnchor: string;
		excerpt: string;
		matchLines?: string;
	}>;
	totalMatches: number;
} {
	const rawTerms = query
		.toLowerCase()
		.split(/\s+/)
		.map((t) => t.trim())
		.filter((t) => t.length > 0);

	if (rawTerms.length === 0) {
		return { query, results: [], totalMatches: 0 };
	}

	const candidates =
		source === 'all' ? SITE_DOC_SECTIONS : SITE_DOC_SECTIONS.filter((s) => s.source === source);

	const ranked: SearchDocResult[] = [];

	for (const section of candidates) {
		const hit = scoreDocSection(section, rawTerms);
		if (hit) ranked.push(hit);
	}

	ranked.sort((a, b) => b.score - a.score);
	const top = ranked.slice(0, limit);

	return {
		query,
		results: top.map((r) => ({
			source: r.source,
			title: r.title,
			urlOrAnchor: r.urlOrAnchor,
			excerpt: r.excerpt,
			matchLines: r.matchedLineNumber
				? `Line L${String(r.matchedLineNumber).padStart(2, '0')}`
				: undefined,
		})),
		totalMatches: ranked.length,
	};
}
