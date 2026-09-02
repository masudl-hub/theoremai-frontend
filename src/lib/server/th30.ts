/**
 * Th30 ("Theo") — The live, grounded site assistant for THEORUM.
 *
 * Configured as a real-time Gemini 3.1 Flash Live voice/speech agent with
 * client-side UI navigation and highlighting tools.
 *
 * @module
 */

import {
	defineProfile,
	registerProfile,
	standardEgressEnforce,
	type WireFunctionTool,
} from './theorum';

export const TH30_PROFILE_ID = 'theorum.site.th30';

/** Client UI tools executed by the browser client when called by Gemini Live. */
export const TH30_CLIENT_TOOLS: WireFunctionTool[] = [
	{
		type: 'function',
		name: 'navigate',
		description:
			'Navigate the user to a specific section or page on the THEORUM website (e.g. "/#pillars", "/#architecture", "/#use", "/#playground", or "/playground").',
		parameters: {
			type: 'object',
			properties: {
				path: {
					type: 'string',
					description:
						'Target path or anchor hash (e.g. "/#pillars", "/#architecture", "/#use", "/playground")',
				},
			},
			required: ['path'],
		},
	},
	{
		type: 'function',
		name: 'highlightSection',
		description:
			"Visually highlight a section, card, or landmark on the current page to guide the user's attention.",
		parameters: {
			type: 'object',
			properties: {
				selector: {
					type: 'string',
					description:
						'CSS selector or section ID (e.g. "#pillars", "#architecture", "#use", "#playground")',
				},
			},
			required: ['selector'],
		},
	},
];

export const TH30_SYSTEM_PROMPT = `You are Th30 (pronounced "Theo"), the real-time AI guide for THEORUM — the flat, zero-bloat TypeScript agent kernel.
You speak concisely, naturally, and warmly. You are speaking directly through real-time audio.
Keep responses short, clear, and direct (1-3 sentences per turn) since this is a voice conversation.

THEORUM Architectural Principles you know deeply:
1. Flatness & Zero-Bloat: Single runner loop, direct provider adapters, zero framework overhead (no LangChain abstractions).
2. Deterministic Guardrails: Injected prompt canaries, egress filtering, rate limits, sensitive data scrubbing.
3. Strict Typed Contracts & Boundaries: Pure Zod tool schemas, clean type-safe profiles, separate wire framing from network transport.
4. Multi-Engine Agnosticism: Gemini Live real-time bidirectional audio/video, OpenRouter OpenAI-compatible chat/reasoning, Local Ollama.

When a user asks to see a section or diagram, call the "navigate" or "highlightSection" tool immediately, and explain what they are seeing.`;

export function ensureTh30ProfileRegistered(): void {
	const profile = defineProfile({
		id: TH30_PROFILE_ID,
		identity: {
			handle: 'th30',
			system: TH30_SYSTEM_PROMPT,
		},
		model: {
			protocol: 'geminiLive',
			provider: 'google',
			allow: ['gemini31FlashLive'],
			key: 'freeA',
			config: {
				gemini31FlashLive: {
					apiId: 'gemini-3.1-flash-live-preview',
					temperature: 0.7,
					maxOutputTokens: 2048,
					thinking: { on: 'low', off: 'none' },
					thinkingLevels: ['none', 'low', 'medium', 'high'],
					summaries: { on: 'none', off: 'none' },
					builtInTools: [],
				},
			},
		},
		tools: {
			allow: [],
		},
		inputs: {
			text: true,
			voice: { accept: ['audio/pcm', 'audio/wav'] },
			maxFiles: 5,
			maxBytes: 10 * 1024 * 1024,
			maxTurnBytes: 25 * 1024 * 1024,
		},
		outputs: {
			live: {
				voice: 'Aoede',
				vad: {
					activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
					startSensitivity: 'START_SENSITIVITY_LOW',
					endSensitivity: 'END_SENSITIVITY_LOW',
					prefixPaddingMs: 300,
					silenceDurationMs: 1200,
				},
				sessionResumption: true,
				contextCompression: 'slidingWindow',
				transcription: {
					input: true,
					output: true,
				},
			},
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
