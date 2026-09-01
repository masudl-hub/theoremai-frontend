<script lang="ts">
	import { onMount } from 'svelte';
	import TypeTip from '$lib/components/TypeTip.svelte';
	import { annotateProfileCode } from '$lib/theorum/annotate';

	type OutputKind = 'text' | 'structured' | 'image' | 'speech';
	type SnippetId =
		| 'all'
		| 'install'
		| 'agent'
		| 'models'
		| 'tools'
		| 'inputs'
		| 'outputs'
		| 'guardrails';

	let compaction = $state(false);
	let dynamicTools = $state(false);
	let outputKind = $state<OutputKind>('structured');
	let validation = $state(true);
	let egress = $state(false);

	let copiedId = $state<SnippetId | null>(null);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;
	let pageEl: HTMLElement | undefined = $state();

	const installSnippet = `npm install theorum

import { defineProfile, registerProfile } from "theorum";`;

	const agentBlock = `  id: "mermaid",
  identity: {
    handle: "mermaid",
    chat: true,
    system:
      "Turn requests into Mermaid diagrams. Ask when the request is too vague.",
  },`;

	const agentSnippet = $derived(`defineProfile({
${agentBlock}`);

	const modelsBlock = $derived.by(() => {
		const compactBlock = compaction
			? `
          compaction: {
            maxTokens: 2000,
            compactAt: 0.75,
            previousExchanges: 8,
            profile: "mermaid.compactor", // Requires a registered profile id
            timing: "after",
            meter: "history",
          },`
			: '';

		return `  model: {
    protocol: "geminiInteractions",
    provider: "google",
    allow: ["flash", "pro"],
    config: {
      flash: {
        apiId: "gemini-3.5-flash-lite",
        thinking: { on: "medium", off: "minimal" },
        thinkingLevels: ["minimal", "low", "medium", "high"],
        summaries: { on: "auto", off: "none" },
        maxOutputTokens: 8192,
        temperature: 1,
        keyBuiltins: ["googleMaps", "urlContext"],${compactBlock}
      },
      pro: {
        apiId: "gemini-3.7-flash",
        thinking: { on: "high", off: "low" },
        thinkingLevels: ["low", "medium", "high"],
        summaries: { on: "auto", off: "auto" },
        maxOutputTokens: 64000,
        temperature: 1,
        keyBuiltins: [],${compactBlock}
      },
    },
    select: { fast: "flash", smart: "pro" },
    thinking: { fast: "low", smart: "high" },
    controls: ["thinking"],
    maxSteps: 1, // tool-loop ceiling (default)
  },`;
	});

	const toolsBlock = $derived.by(() => {
		const base = `  tools: {
    allow: ["googleSearch", "googleMaps", "urlContext"],
    // allow = hard ceiling — the turn cannot call anything outside this list
  },`;

		if (!dynamicTools) return base;

		return `${base}

  // Dynamic tools (turn request — not on the profile):
  // runTurn({
  //   profile: "mermaid",
  //   input: { text: "…" },
  //   tools: {
  //     lookup_order: true,
  //   },
  //   dynamicTools: [{
  //     name: "lookup_order",
  //     description: "Fetch order state from the host.",
  //     loadTier: "T1",               // T0 | T1 | T2
  //     permissionTier: "session_consent", // auto | session_consent | always_confirm
  //     parameters: {
  //       type: "object",
  //       properties: { orderId: { type: "string" } },
  //       required: ["orderId"],
  //     },
  //     handler: async (args) => ({ status: "ok", data: args }),
  //   }],
  // }, provider)`;
	});

	const inputsBlock = `  inputs: {
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
    // maxBytes / maxTurnBytes / limitsByMime — optional size policy
    // slots: { aspectRatio: ["1:1", "16:9"] } — optional turn-time selectors
  },`;

	const outputsBlock = $derived.by(() => {
		const lines: string[] = ['  outputs: {'];

		if (outputKind === 'text') {
			lines.push('    // plain text — no structured / image / speech pins');
		} else if (outputKind === 'structured') {
			lines.push('    structured: "mermaidTurn", // { message, diagram?: { mermaid, title? } }');
			if (validation) {
				lines.push(`    validation: {
      fields: {
        // Host-owned validator; return { isValid, error? }.
        "diagram.mermaid": (source) => ({
          isValid: typeof source === "string" && source.trim().length > 0,
          error: "diagram.mermaid must be a non-empty string",
        }),
      },
      maxRetries: 3,
      repairGuidance: "Return valid Mermaid only in diagram.mermaid.",
    },`);
			}
		} else if (outputKind === 'image') {
			lines.push(`    image: {
      aspectRatio: "1:1",
      size: "2K",
      mimeType: "image/png",
      allowsGrounding: true,
      maxInputImages: 3,
    },`);
		} else if (outputKind === 'speech') {
			lines.push(`    speech: {
      voice: "Kore",
      format: "pcm", // → WAV; mp3 needs openAi speech
    },`);
		}

		lines.push(`    // streaming — how the turn emits live events
    streaming: {
      streamThoughts: true, // emit model thinking on the turn stream
      gateMedia: true, // hold media until egress / validation clear
    },
    // resume — continue after a non-user stop (length cut, dropped stream, …)
    resume: {
      allowContinue: ["length", "stream_incomplete", "provider_error"], // host may resume
      autoContinue: ["length", "stream_incomplete"], // runner auto-continues these
    },`);

		lines.push('  },');
		return lines.join('\n');
	});

	const guardrailsBlock = $derived.by(() => {
		const egressLines = egress
			? `\n    egress: {
      // Host-owned check before user-visible text is released.
      enforce: async ({ text }) => ({ blocked: false, text }),
      onBlock: "reject_to_agent", // or "refuse_to_user"
      maxRetries: 2,
    },`
			: '';

		return `  guardrails: {
    canary: true, // default
    sanitizeInput: true, // default
    redactSensitive: true, // default
    quota: { perDay: 20 }, // host HTTP helper — not enforced inside runTurn${egressLines}
  },`;
	});

	const fullCode = $derived(
		[
			installSnippet,
			'',
			'registerProfile(',
			'  defineProfile({',
			agentBlock,
			modelsBlock,
			toolsBlock,
			inputsBlock,
			outputsBlock,
			guardrailsBlock,
			'  }),',
			');'
		].join('\n')
	);

	function codeHtml(source: string): string {
		return annotateProfileCode(source);
	}

	async function copySnippet(id: SnippetId, text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedId = id;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => {
				copiedId = null;
			}, 1400);
		} catch {
			/* ignore */
		}
	}

	function setOutputKind(kind: OutputKind) {
		outputKind = kind;
		validation = kind === 'structured';
	}

	onMount(() => {
		const section = pageEl;
		if (!section) return;

		const scroller = section.closest('.landing-scroll') as HTMLElement | null;
		if (!scroller) return;

		const onWheel = (e: WheelEvent) => {
			const box = (e.target as HTMLElement | null)?.closest?.('pre.profile-code') as
				| HTMLElement
				| null;
			if (!box || !section.contains(box)) return;

			const max = box.scrollHeight - box.clientHeight;
			if (max <= 1) return;

			const top = box.scrollTop;
			const atTop = top <= 0;
			const atBottom = top >= max - 1;
			const goingDown = e.deltaY > 0;
			const goingUp = e.deltaY < 0;

			if ((goingDown && atBottom) || (goingUp && atTop)) {
				e.preventDefault();
				scroller.scrollTop += e.deltaY;
			}
		};

		section.addEventListener('wheel', onWheel, { passive: false });
		return () => section.removeEventListener('wheel', onWheel);
	});
</script>

{#snippet copyBtn(id: SnippetId, text: string)}
	<button
		type="button"
		class="copy-icon shrink-0 p-1.5"
		aria-label={copiedId === id ? 'Copied' : 'Copy'}
		onclick={() => copySnippet(id, text)}
	>
		{#if copiedId === id}
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
{/snippet}

<section
	bind:this={pageEl}
	id="use"
	class="landing-section landing-section-grow relative flex w-full flex-col items-center justify-start border-b-[3px] border-black px-6 py-20 md:px-14 md:py-12"
>
	<div class="relative z-10 mb-6 flex w-full max-w-3xl shrink-0 items-start justify-between gap-4 md:mb-8">
		<div>
			<h3 class="text-sm font-extrabold tracking-[0.22em] uppercase">Define a profile</h3>
			<p class="mt-2 max-w-lg text-xs text-[var(--color-mute)] md:text-sm">
				A profile is the contract for one agent: identity, models, tools, inputs, outputs, and
				guardrails.
			</p>
		</div>
		{@render copyBtn('all', fullCode)}
	</div>

	<div class="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-10 pb-10 md:gap-12">
		<TypeTip class="flex flex-col gap-10 md:gap-12">
		<section class="flex flex-col gap-3" aria-labelledby="use-s0">
			<div>
				<h4 id="use-s0" class="text-[11px] font-extrabold tracking-wide uppercase md:text-xs">
					1 · Install
				</h4>
				<p class="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--color-mute)] md:text-sm">
					Add theorum to your project, then import the profile APIs.
				</p>
			</div>
			<div class="relative">
				<div class="absolute top-0 right-0 z-10">{@render copyBtn('install', installSnippet)}</div>
				<pre
					class="ascii profile-code overflow-x-auto pr-8 text-[10px] leading-relaxed font-bold md:text-[11px] md:leading-[1.45]">{@html codeHtml(installSnippet)}</pre>
			</div>
		</section>

		<section class="flex flex-col gap-3" aria-labelledby="use-s1">
			<div>
				<h4 id="use-s1" class="text-[11px] font-extrabold tracking-wide uppercase md:text-xs">
					2 · Describe agent
				</h4>
				<p class="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--color-mute)] md:text-sm">
					Every profile has an id, a handle, and a system instruction the model receives each turn.
				</p>
			</div>
			<div class="relative">
				<div class="absolute top-0 right-0 z-10">{@render copyBtn('agent', agentSnippet)}</div>
				<pre
					class="ascii profile-code max-h-[min(40vh,18rem)] overflow-auto pr-8 text-[10px] leading-relaxed font-bold md:text-[11px] md:leading-[1.45]">{@html codeHtml(agentSnippet)}</pre>
			</div>
		</section>

		<section class="flex flex-col gap-3" aria-labelledby="use-s2">
			<div>
				<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
					<h4 id="use-s2" class="text-[11px] font-extrabold tracking-wide uppercase md:text-xs">
						3 · Define models
					</h4>
					<button
						type="button"
						class="chip shrink-0"
						class:chip-on={compaction}
						aria-pressed={compaction}
						onclick={() => (compaction = !compaction)}
					>
						[ compaction ]
					</button>
				</div>
				<p class="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--color-mute)] md:text-sm">
					Select a provider and the models this agent may use. Each model sets thinking levels,
					token limits, and optional compaction.
				</p>
			</div>
			<div class="relative">
				<div class="absolute top-0 right-0 z-10">{@render copyBtn('models', modelsBlock)}</div>
				<pre
					class="ascii profile-code max-h-[min(40vh,18rem)] overflow-auto pr-8 text-[10px] leading-relaxed font-bold md:text-[11px] md:leading-[1.45]">{@html codeHtml(modelsBlock)}</pre>
			</div>
		</section>

		<section class="flex flex-col gap-3" aria-labelledby="use-s3">
			<div>
				<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
					<h4 id="use-s3" class="text-[11px] font-extrabold tracking-wide uppercase md:text-xs">
						4 · Configure tools
					</h4>
					<button
						type="button"
						class="chip shrink-0"
						class:chip-on={dynamicTools}
						aria-pressed={dynamicTools}
						onclick={() => (dynamicTools = !dynamicTools)}
					>
						[ dynamic tools ]
					</button>
				</div>
				<p class="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--color-mute)] md:text-sm">
					<code class="font-bold text-black">tools.allow</code> is the maximum set of tools the
					agent can call. Anything outside that list is rejected.
				</p>
			</div>
			<div class="relative">
				<div class="absolute top-0 right-0 z-10">{@render copyBtn('tools', toolsBlock)}</div>
				<pre
					class="ascii profile-code max-h-[min(40vh,18rem)] overflow-auto pr-8 text-[10px] leading-relaxed font-bold md:text-[11px] md:leading-[1.45]">{@html codeHtml(toolsBlock)}</pre>
			</div>
		</section>

		<section class="flex flex-col gap-3" aria-labelledby="use-s4">
			<div>
				<h4 id="use-s4" class="text-[11px] font-extrabold tracking-wide uppercase md:text-xs">
					5 · Allow inputs
				</h4>
				<p class="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--color-mute)] md:text-sm">
					Declare which text, file, and voice inputs the agent accepts on a turn.
				</p>
			</div>
			<div class="relative">
				<div class="absolute top-0 right-0 z-10">{@render copyBtn('inputs', inputsBlock)}</div>
				<pre
					class="ascii profile-code max-h-[min(40vh,18rem)] overflow-auto pr-8 text-[10px] leading-relaxed font-bold md:text-[11px] md:leading-[1.45]">{@html codeHtml(inputsBlock)}</pre>
			</div>
		</section>

		<section class="flex flex-col gap-3" aria-labelledby="use-s5">
			<div>
				<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
					<h4 id="use-s5" class="text-[11px] font-extrabold tracking-wide uppercase md:text-xs">
						6 · Describe outputs
					</h4>
					<div class="flex flex-wrap gap-x-0.5" role="radiogroup" aria-label="Output kind">
						{#each ['text', 'structured', 'image', 'speech'] as kind (kind)}
							<button
								type="button"
								class="chip"
								class:chip-on={outputKind === kind}
								role="radio"
								aria-checked={outputKind === kind}
								onclick={() => setOutputKind(kind as OutputKind)}
							>
								[ {kind} ]
							</button>
						{/each}
						{#if outputKind === 'structured'}
							<button
								type="button"
								class="chip"
								class:chip-on={validation}
								aria-pressed={validation}
								onclick={() => (validation = !validation)}
							>
								[ validation ]
							</button>
						{/if}
					</div>
				</div>
				<p class="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--color-mute)] md:text-sm">
					Configure how the agent responds: plain text, structured JSON, images, or speech.
				</p>
			</div>
			<div class="relative">
				<div class="absolute top-0 right-0 z-10">{@render copyBtn('outputs', outputsBlock)}</div>
				<pre
					class="ascii profile-code max-h-[min(40vh,18rem)] overflow-auto pr-8 text-[10px] leading-relaxed font-bold md:text-[11px] md:leading-[1.45]">{@html codeHtml(outputsBlock)}</pre>
			</div>
		</section>

		<section class="flex flex-col gap-3" aria-labelledby="use-s6">
			<div>
				<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
					<h4 id="use-s6" class="text-[11px] font-extrabold tracking-wide uppercase md:text-xs">
						7 · Set guardrails
					</h4>
					<button
						type="button"
						class="chip shrink-0"
						class:chip-on={egress}
						aria-pressed={egress}
						onclick={() => (egress = !egress)}
					>
						[ egress ]
					</button>
				</div>
				<p class="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--color-mute)] md:text-sm">
					Control canary fencing, input sanitization, sensitive-data redaction, quotas, and egress
					checks.
				</p>
			</div>
			<div class="relative">
				<div class="absolute top-0 right-0 z-10">
					{@render copyBtn('guardrails', guardrailsBlock)}
				</div>
				<pre
					class="ascii profile-code max-h-[min(40vh,18rem)] overflow-auto pr-8 text-[10px] leading-relaxed font-bold md:text-[11px] md:leading-[1.45]">{@html codeHtml(guardrailsBlock)}</pre>
			</div>
		</section>
		</TypeTip>
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

	.chip {
		appearance: none;
		background: transparent;
		border: none;
		padding: 0.15rem 0.2rem;
		color: var(--color-mute);
		cursor: pointer;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		line-height: 1.4;
	}

	.chip-on {
		color: #000;
	}

	.chip:hover {
		color: #000;
	}

	.chip:focus-visible {
		outline: 2px solid #000;
		outline-offset: 2px;
	}

	:global(.code-comment) {
		font-weight: 400;
		color: var(--color-mute);
	}

	@media (min-width: 768px) {
		.chip {
			font-size: 11px;
		}
	}
</style>
