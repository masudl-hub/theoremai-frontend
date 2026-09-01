<script lang="ts">
	const installCmd = 'npm install theorum';

	type Example = {
		id: string;
		label: string;
		blurb: string;
		code: string;
	};

	const examples: Example[] = [
		{
			id: 'mermaid',
			label: 'Mermaid',
			blurb: 'Structured output + multimodal input. From a real host app.',
			code: `import { defineProfile, registerProfile } from "theorum";
import { MERMAID_COMPACTION } from "./compaction.ts";

registerProfile(
  defineProfile({
    id: "mermaid",
    identity: {
      handle: "mermaid",
      system:
        "Turn requests into Mermaid diagrams. Ask when the request is too vague.",
    },
    model: {
      protocol: "geminiInteractions",
      provider: "google",
      allow: ["flash"],
      config: {
        flash: {
          apiId: "gemini-3.5-flash-lite",
          thinking: { on: "medium", off: "minimal" },
          thinkingLevels: ["minimal", "low", "medium", "high"],
          summaries: { on: "auto", off: "none" },
          maxOutputTokens: 8192,
          temperature: 1,
          keyBuiltins: ["googleMaps", "urlContext"],
          compaction: MERMAID_COMPACTION,
        },
      },
    },
    tools: {
      allow: ["googleSearch", "googleMaps", "urlContext"],
    },
    inputs: {
      text: true,
      attachments: {
        accept: [
          "image/png",
          "image/jpeg",
          "image/webp",
          "application/pdf",
          "text/plain",
          "text/markdown",
        ],
      },
      voice: { accept: ["audio/webm", "audio/wav", "audio/mpeg"] },
      maxFiles: 5,
    },
    outputs: {
      structured: "mermaidTurn", // { message, diagram?: { mermaid, title? } }
    },
    guardrails: {
      canary: true, // default
      sanitizeInput: true, // default
      redactSensitive: true, // default
      quota: { perDay: 20 },
    },
  }),
);`
		},
		{
			id: 'openrouter',
			label: 'OpenRouter',
			blurb: 'System and quota live in your app. Several models behind one profile.',
			code: `import { defineProfile, registerProfile } from "theorum";
import { SUPPORT_SYSTEM } from "./prompts/support.ts";
import { supportQuota } from "./subscriptions/plans.ts";

registerProfile(
  defineProfile({
    id: "support.agent",
    identity: {
      handle: "support",
      system: SUPPORT_SYSTEM,
    },
    model: {
      protocol: "openAi",
      provider: "openrouter",
      allow: ["fast", "smart", "reason"],
      config: {
        fast: {
          apiId: "perplexity/sonar",
          openRouterId: "perplexity/sonar",
          thinking: { on: "low", off: "minimal" },
          thinkingLevels: ["minimal", "low", "medium", "high"],
          summaries: { on: "auto", off: "none" },
          maxOutputTokens: 2048,
          temperature: 0.4,
          keyBuiltins: [],
        },
        smart: {
          apiId: "anthropic/claude-sonnet-4",
          openRouterId: "anthropic/claude-sonnet-4",
          thinking: { on: "medium", off: "minimal" },
          thinkingLevels: ["minimal", "low", "medium", "high"],
          summaries: { on: "auto", off: "none" },
          maxOutputTokens: 8192,
          temperature: 0.5,
          keyBuiltins: [],
        },
        reason: {
          apiId: "openai/o4-mini",
          openRouterId: "openai/o4-mini",
          thinking: { on: "high", off: "minimal" },
          thinkingLevels: ["minimal", "low", "medium", "high"],
          summaries: { on: "auto", off: "none" },
          maxOutputTokens: 8192,
          temperature: 1,
          keyBuiltins: [],
        },
      },
      select: { fast: "fast", smart: "smart", reason: "reason" },
    },
    tools: { allow: ["lookup_order", "refund"] },
    inputs: { text: true },
    outputs: {},
    guardrails: {
      canary: true, // default
      sanitizeInput: true, // default
      redactSensitive: true, // default
      quota: supportQuota, // e.g. { perDay: 200 } from your plan table
    },
  }),
);`
		},
		{
			id: 'compaction',
			label: 'Compaction',
			blurb: 'Per-model history budget. Host owns the summarizer profile.',
			code: `import { defineProfile, registerProfile, type CompactionSpec } from "theorum";

const COMPACTION: CompactionSpec = {
  maxTokens: 2000,
  compactAt: 0.75,
  previousExchanges: 8,
  profile: "support.compactor",
  timing: "after",
  meter: "history",
};

registerProfile(
  defineProfile({
    id: "support.compactor",
    identity: {
      handle: "compactor",
      system:
        "Summarize prior turns. Keep decisions, open issues, and identifiers.",
    },
    model: {
      protocol: "openAi",
      provider: "openrouter",
      allow: ["fast"],
      config: {
        fast: {
          apiId: "perplexity/sonar",
          openRouterId: "perplexity/sonar",
          thinking: { on: "minimal", off: "minimal" },
          thinkingLevels: ["minimal", "low", "medium", "high"],
          summaries: { on: "none", off: "none" },
          maxOutputTokens: 4096,
          temperature: 0.2,
          keyBuiltins: [],
        },
      },
      maxSteps: 1,
    },
    tools: { allow: [] },
    inputs: { text: true },
    outputs: {},
    guardrails: {
      canary: false,
      sanitizeInput: false,
      redactSensitive: false,
    },
  }),
);

registerProfile(
  defineProfile({
    id: "support.agent",
    identity: {
      handle: "support",
      system: "Help with orders. Never invent tracking numbers.",
    },
    model: {
      protocol: "openAi",
      provider: "openrouter",
      allow: ["fast"],
      config: {
        fast: {
          apiId: "perplexity/sonar",
          openRouterId: "perplexity/sonar",
          thinking: { on: "low", off: "minimal" },
          thinkingLevels: ["minimal", "low", "medium", "high"],
          summaries: { on: "auto", off: "none" },
          maxOutputTokens: 2048,
          temperature: 0.4,
          keyBuiltins: [],
          compaction: COMPACTION,
        },
      },
    },
    tools: { allow: ["lookup_order"] },
    inputs: { text: true },
    outputs: {},
    guardrails: {
      canary: true, // default
      sanitizeInput: true, // default
      redactSensitive: true, // default
    },
  }),
);`
		},
		{
			id: 'resume',
			label: 'Resume',
			blurb: 'Continue a turn when the model stops on length or a dropped stream.',
			code: `import { defineProfile, registerProfile } from "theorum";

registerProfile(
  defineProfile({
    id: "writer.agent",
    identity: {
      handle: "writer",
      system: "Draft long-form copy. Stay on the brief.",
    },
    model: {
      protocol: "openAi",
      provider: "openrouter",
      allow: ["smart"],
      config: {
        smart: {
          apiId: "anthropic/claude-sonnet-4",
          openRouterId: "anthropic/claude-sonnet-4",
          thinking: { on: "medium", off: "minimal" },
          thinkingLevels: ["minimal", "low", "medium", "high"],
          summaries: { on: "auto", off: "none" },
          maxOutputTokens: 8192,
          temperature: 0.7,
          keyBuiltins: [],
        },
      },
    },
    tools: { allow: [] },
    inputs: { text: true },
    outputs: {
      resume: {
        allowContinue: ["length", "stream_incomplete", "provider_error"],
        autoContinue: ["length", "stream_incomplete"],
      },
    },
    guardrails: {
      canary: true, // default
      sanitizeInput: true, // default
      redactSensitive: true, // default
    },
  }),
);

// Host continues with:
// runTurn({
//   profile: "writer.agent",
//   input: { text: "" },
//   continueFrom: { stop: previousDone.stop, partialText },
// }, provider)`
		}
	];

	let active = $state(0);
	let installCopied = $state(false);
	let profileCopied = $state(false);
	let installTimer: ReturnType<typeof setTimeout> | undefined;
	let profileTimer: ReturnType<typeof setTimeout> | undefined;

	const current = $derived(examples[active]);

	async function copyText(text: string, which: 'install' | 'profile') {
		try {
			await navigator.clipboard.writeText(text);
			if (which === 'install') {
				installCopied = true;
				clearTimeout(installTimer);
				installTimer = setTimeout(() => {
					installCopied = false;
				}, 1400);
			} else {
				profileCopied = true;
				clearTimeout(profileTimer);
				profileTimer = setTimeout(() => {
					profileCopied = false;
				}, 1400);
			}
		} catch {
			/* ignore */
		}
	}

	function selectTab(i: number) {
		active = i;
		profileCopied = false;
	}
</script>

<section
	id="use"
	class="landing-section relative flex min-h-dvh w-full flex-col items-center justify-start overflow-hidden border-b-[3px] border-black px-6 py-20 md:px-14 md:py-12"
>
	<div class="relative z-10 mb-6 w-full max-w-6xl shrink-0 text-center md:mb-5">
		<h3 class="text-sm font-extrabold tracking-[0.22em] uppercase">Use</h3>
	</div>

	<div
		class="relative z-10 mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col justify-center gap-7 md:gap-8"
	>
		<div class="flex flex-col gap-2">
			<p class="text-[11px] font-extrabold tracking-wide uppercase md:text-xs">1 · Install</p>
			<p class="text-sm text-[var(--color-mute)]">
				In your app project (Next, SvelteKit, Node — wherever the agent will run):
			</p>
			<div class="flex items-center gap-3">
				<pre class="ascii min-w-0 flex-1 overflow-x-auto text-[11px] font-bold md:text-xs">{installCmd}</pre>
				<button
					type="button"
					class="copy-icon shrink-0 p-1.5"
					aria-label={installCopied ? 'Copied' : 'Copy install command'}
					onclick={() => copyText(installCmd, 'install')}
				>
					{#if installCopied}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path
								d="M3.5 8.5L6.5 11.5L12.5 4.5"
								stroke="currentColor"
								stroke-width="1.75"
								stroke-linecap="square"
							/>
						</svg>
					{:else}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<rect x="5.5" y="5.5" width="8" height="8" stroke="currentColor" stroke-width="1.5" />
							<path d="M10.5 5.5V3.5H2.5V11.5H5.5" stroke="currentColor" stroke-width="1.5" />
						</svg>
					{/if}
				</button>
			</div>
		</div>

		<div class="flex min-h-0 flex-col gap-2">
			<p class="text-[11px] font-extrabold tracking-wide uppercase md:text-xs">
				2 · Define a profile
			</p>

			<div
				class="flex flex-wrap gap-x-1 gap-y-1"
				role="tablist"
				aria-label="Profile examples"
			>
				{#each examples as example, i (example.id)}
					<button
						type="button"
						role="tab"
						id="use-tab-{example.id}"
						aria-selected={i === active}
						aria-controls="use-panel"
						class="tab-btn px-2 py-1 text-[11px] font-extrabold tracking-widest uppercase md:text-xs"
						class:tab-active={i === active}
						onclick={() => selectTab(i)}
					>
						[ {example.label} ]
					</button>
				{/each}
			</div>

			<p class="text-sm text-[var(--color-mute)]">{current.blurb}</p>

			<div
				id="use-panel"
				role="tabpanel"
				aria-labelledby="use-tab-{current.id}"
				class="relative min-h-0"
			>
				<button
					type="button"
					class="copy-icon absolute top-0 right-0 z-10 p-1.5 md:right-1"
					aria-label={profileCopied ? 'Copied' : 'Copy profile example'}
					onclick={() => copyText(current.code, 'profile')}
				>
					{#if profileCopied}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path
								d="M3.5 8.5L6.5 11.5L12.5 4.5"
								stroke="currentColor"
								stroke-width="1.75"
								stroke-linecap="square"
							/>
						</svg>
					{:else}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<rect x="5.5" y="5.5" width="8" height="8" stroke="currentColor" stroke-width="1.5" />
							<path d="M10.5 5.5V3.5H2.5V11.5H5.5" stroke="currentColor" stroke-width="1.5" />
						</svg>
					{/if}
				</button>
				<pre
					class="ascii max-h-[min(40vh,20rem)] overflow-auto pr-8 text-[10px] leading-relaxed font-bold md:max-h-[min(44vh,22rem)] md:text-[11px] md:leading-[1.45]"
				>{current.code}</pre>
			</div>
		</div>
	</div>
</section>

<style>
	.copy-icon {
		appearance: none;
		background: transparent;
		border: none;
		color: #000;
		cursor: pointer;
		line-height: 0;
	}

	.copy-icon:hover {
		opacity: 0.55;
	}

	.copy-icon:focus-visible {
		outline: 2px solid #000;
		outline-offset: 2px;
	}

	.tab-btn {
		appearance: none;
		background: transparent;
		border: none;
		color: var(--color-mute);
		cursor: pointer;
	}

	.tab-btn:hover {
		color: #000;
	}

	.tab-active {
		color: #000;
	}

	.tab-btn:focus-visible {
		outline: 2px solid #000;
		outline-offset: 2px;
	}
</style>
