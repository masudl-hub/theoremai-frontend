<script lang="ts">
import ProfileCode from '$lib/components/ProfileCode.svelte';
import TypeTip from '$lib/components/TypeTip.svelte';
import UseArt from '$lib/components/UseArt.svelte';

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
let customTools = $state(false);
let outputKind = $state<OutputKind>('structured');
let validation = $state(true);
let egress = $state(false);

let copiedId = $state<SnippetId | null>(null);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

const installSnippet = $derived.by(() => {
	const importNames = ['defineProfile', 'registerProfile'];
	if (customTools) importNames.push('registerTool');
	if (egress) importNames.push('standardEgressEnforce');
	const importLine = `import { ${importNames.join(', ')} } from "theorum";`;
	const zodImport = customTools ? `\nimport { z } from "zod";` : '';

	return `npm install theorum

${importLine}${zodImport}`;
});

const registerToolSnippet = `registerTool({
  type: "function",
  name: "lookup_order",
  description: "Fetch order state from the host.",
  category: "commerce",
  access: "read-only",
  paths: ["*"],
  loadTier: "T0",
  permission: "session_consent",
  input: z.object({ orderId: z.string() }),
  output: z.object({ status: z.string() }),
  handler: async (input) => ({ status: "shipped" }),
});

registerTool({
  type: "function",
  name: "load_tools",
  description: "Promote deferred T2 tools when the model requests them.",
  category: "commerce",
  access: "read-only",
  paths: ["*"],
  loadTier: "T0",
  permission: "auto",
  input: z.object({ names: z.array(z.string()) }),
  output: z.object({ loaded: z.array(z.string()) }),
  handler: async (input) => ({ loaded: input.names }),
});

registerTool({
  type: "function",
  name: "deferred_lookup",
  description: "T2 tool — wired only after load_tools promotes it.",
  category: "commerce",
  access: "read-only",
  paths: ["*"],
  loadTier: "T2",
  permission: "auto",
  input: z.object({ q: z.string() }),
  output: z.object({ finding: z.string() }),
  handler: async (input) => ({ finding: input.q }),
});`;

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
          profile: "mermaid.compactor",
          timing: "after",
          meter: "history",
        },`
		: '';

	return `  model: {
    protocol: "geminiInteractions",
    provider: "google",
    allow: ["fast", "capable"],
    config: {
      fast: {
        apiId: "gemini-3.5-flash-lite",
        thinking: { on: "medium", off: "minimal" },
        thinkingLevels: ["minimal", "low", "medium", "high"],
        summaries: { on: "auto", off: "none" },
        maxOutputTokens: 8192,
        temperature: 1,
        builtInTools: ["googleMaps", "urlContext"],${compactBlock}
      },
      capable: {
        apiId: "gemini-2.5-flash",
        thinking: { on: "high", off: "low" },
        thinkingLevels: ["low", "medium", "high"],
        summaries: { on: "auto", off: "auto" },
        maxOutputTokens: 8192,
        temperature: 1,
        builtInTools: ["googleSearch"],${compactBlock}
      },
    },
    select: { fast: "fast", smart: "capable" },
    thinking: { fast: "low", smart: "high" },
    controls: ["thinking"],
    maxSteps: 1,
  },`;
});

const profileToolsBlock = $derived.by(() => {
	const allow = customTools ? `["lookup_order", "load_tools", "deferred_lookup"]` : `[]`;
	const t2 = customTools
		? `,
    t2Loader: "load_tools"`
		: '';
	return `  tools: {
    allow: ${allow}${t2},
    // T1: optional tools.t1Policy(ctx) => ["deferred_lookup"]
  },`;
});

const toolsBlock = $derived.by(() => {
	const registerBlock = customTools ? `${registerToolSnippet}\n\n` : '';
	return `${registerBlock}${profileToolsBlock}`;
});

const inputsBlock = `  inputs: {
    text: true,
    attachments: {
      accept: ["image/png", "image/jpeg", "image/webp", "application/pdf", "text/plain", "text/markdown"],
    },
    voice: {
      accept: ["audio/webm", "audio/wav", "audio/mpeg"],
    },
    maxFiles: 5,
  },`;

const outputsBlock = $derived.by(() => {
	const lines: string[] = ['  outputs: {'];

	if (outputKind === 'text') {
		lines.push('    structured: null,');
	} else if (outputKind === 'structured') {
		lines.push('    structured: "mermaidTurn",');
		if (validation) {
			lines.push(`    validation: {
      fields: {
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
      maxInputImages: 3,
      includeText: true,
    },`);
	} else if (outputKind === 'speech') {
		lines.push(`    speech: {
      voice: "Kore",
      format: "pcm",
    },`);
	}

	lines.push(`    streaming: {
      streamThoughts: true,
    },
    resume: {
      allowContinue: ["length", "stream_incomplete", "provider_error"],
      autoContinue: ["length", "stream_incomplete"],
    },`);

	lines.push('  },');
	return lines.join('\n');
});

const guardrailsBlock = $derived.by(() => {
	const egressLines = egress
		? `\n    egress: {
      enforce: standardEgressEnforce,
      onBlock: "refuse_to_user",
      maxRetries: 2,
    },`
		: '';

	return `  guardrails: {
    canary: true,
    sanitizeInput: true,
    redactSensitive: true,
    quota: {
      perDay: 20,
    },${egressLines}
  },`;
});

const fullCode = $derived(
	[
		installSnippet,
		customTools ? `\n${registerToolSnippet}` : '',
		'',
		'registerProfile(',
		'  defineProfile({',
		agentBlock,
		modelsBlock,
		profileToolsBlock,
		inputsBlock,
		outputsBlock,
		guardrailsBlock,
		'  }),',
		');',
	].join('\n'),
);

function setOutputKind(kind: OutputKind) {
	outputKind = kind;
	validation = kind === 'structured';
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
</script>

{#snippet copyBtn(id: SnippetId, text: string)}
	<button
		class="copy-icon shrink-0 p-1.5"
		aria-label={copiedId === id ? 'Copied' : 'Copy'}
		onclick={() => copySnippet(id, text)}
		type="button"
	>
		{#if copiedId === id}
			<svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
				<path
					d="M3.5 8.5L6.5 11.5L12.5 4.5"
					stroke="currentColor"
					stroke-linecap="square"
					stroke-width="1.75"
				/>
			</svg>
		{:else}
			<svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
				<rect height="8" stroke="currentColor" stroke-width="1.5" width="8" x="5.5" y="5.5" />
				<path d="M10.5 5.5V3.5H2.5V11.5H5.5" stroke="currentColor" stroke-width="1.5" />
			</svg>
		{/if}
	</button>
{/snippet}

<section
	id="use"
	class="use-section landing-section landing-section-grow relative flex w-full flex-col items-center justify-start px-6 py-20 md:px-14 md:py-12"
>
	<div
		class="relative z-10 mb-6 flex w-full max-w-3xl shrink-0 items-start justify-between gap-4 md:mb-8"
	>
		<div>
			<h3 class="text-sm font-extrabold tracking-section uppercase">Define a profile</h3>
			<p class="mt-2 max-w-2xl text-xs leading-relaxed text-mute md:text-sm">
				A profile is the contract for one agent: identity, models, tools, inputs, outputs, and
				guardrails.
			</p>
		</div>
		{@render copyBtn('all', fullCode)}
	</div>

	<div class="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-12 pb-12 md:gap-14">
		<TypeTip class="flex flex-col gap-12 md:gap-14">
			<section
				class="flex flex-col gap-3"
				aria-labelledby="use-s0"
				data-subtarget="install"
				id="use-install"
			>
				<div>
					<h4 id="use-s0" class="text-xs font-extrabold tracking-wide uppercase md:text-sm">
						1 · Install
					</h4>
				</div>
				<UseArt id="install" />
				<p class="max-w-2xl text-xs leading-relaxed text-mute md:text-sm">
					Add theorum to your project, then import the profile APIs.
				</p>
				<div class="relative">
					<div class="absolute top-0 right-0 z-10">
						{@render copyBtn('install', installSnippet)}
					</div>
					<ProfileCode source={installSnippet} />
				</div>
			</section>

			<section
				class="flex flex-col gap-3"
				aria-labelledby="use-s1"
				data-subtarget="agent"
				id="use-agent"
			>
				<div>
					<h4 id="use-s1" class="text-xs font-extrabold tracking-wide uppercase md:text-sm">
						2 · Describe agent
					</h4>
				</div>
				<UseArt id="agent" />
				<p class="max-w-2xl text-xs leading-relaxed text-mute md:text-sm">
					Every profile has an id, a handle, and a system instruction the model receives each turn.
				</p>
				<div class="relative">
					<div class="absolute top-0 right-0 z-10">{@render copyBtn('agent', agentSnippet)}</div>
					<ProfileCode source={agentSnippet} />
				</div>
			</section>

			<section
				class="flex flex-col gap-3"
				aria-labelledby="use-s2"
				data-subtarget="models"
				id="use-models"
			>
				<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
					<h4 id="use-s2" class="text-xs font-extrabold tracking-wide uppercase md:text-sm">
						3 · Define models
					</h4>
					<button
						class="chip text-xs shrink-0"
						class:chip-on={compaction}
						aria-pressed={compaction}
						onclick={() => (compaction = !compaction)}
						type="button"
					>
						[ compaction ]
					</button>
				</div>
				<UseArt id="models" />
				<p class="max-w-2xl text-xs leading-relaxed text-mute md:text-sm">
					Select a provider and the models this agent may use. Each model sets thinking levels,
					token limits, provider builtins (<code class="font-bold text-black">builtInTools</code>),
					and optional compaction.
				</p>
				<div class="relative">
					<div class="absolute top-0 right-0 z-10">{@render copyBtn('models', modelsBlock)}</div>
					<ProfileCode source={modelsBlock} />
				</div>
			</section>

			<section
				class="flex flex-col gap-3"
				aria-labelledby="use-s3"
				data-subtarget="tools"
				id="use-tools"
			>
				<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
					<h4 id="use-s3" class="text-xs font-extrabold tracking-wide uppercase md:text-sm">
						4 · Configure tools
					</h4>
					<button
						class="chip text-xs shrink-0"
						class:chip-on={customTools}
						aria-pressed={customTools}
						onclick={() => (customTools = !customTools)}
						type="button"
					>
						[ custom tools ]
					</button>
				</div>
				<UseArt id="tools" />
				<p class="max-w-2xl text-xs leading-relaxed text-mute md:text-sm">
					<code class="font-bold text-black">tools.allow</code>
					lists custom function tools only — register them once at startup with
					<code class="font-bold text-black">registerTool</code>. Provider builtins belong on each
					model (<code class="font-bold text-black">builtInTools</code>) and are on whenever that
					model is selected. Optional on the profile:
					<code class="font-bold text-black">tools.t1Policy</code>
					(T1) and
					<code class="font-bold text-black">tools.t2Loader</code>
					(designated loader returning
					<code class="font-bold text-black">{'{ loaded: string[] }'}</code>
					). T2 promotion is turn-local — the kernel does not remember it on the next turn unless
					the host restores visibility via
					<code class="font-bold text-black">invokeTool</code>
					(<code class="font-bold text-black">promoted</code>
					/ snapshot) or policy on load. Visibility otherwise follows
					<code class="font-bold text-black">loadTier</code>
					on each registered tool.
				</p>
				<div class="relative">
					<div class="absolute top-0 right-0 z-10">{@render copyBtn('tools', toolsBlock)}</div>
					<ProfileCode source={toolsBlock} />
				</div>
			</section>

			<section
				class="flex flex-col gap-3"
				aria-labelledby="use-s4"
				data-subtarget="inputs"
				id="use-inputs"
			>
				<div>
					<h4 id="use-s4" class="text-xs font-extrabold tracking-wide uppercase md:text-sm">
						5 · Allow inputs
					</h4>
				</div>
				<UseArt id="inputs" />
				<p class="max-w-2xl text-xs leading-relaxed text-mute md:text-sm">
					Declare which text, file, and voice inputs the agent accepts on a turn.
				</p>
				<div class="relative">
					<div class="absolute top-0 right-0 z-10">{@render copyBtn('inputs', inputsBlock)}</div>
					<ProfileCode source={inputsBlock} />
				</div>
			</section>

			<section
				class="flex flex-col gap-3"
				aria-labelledby="use-s5"
				data-subtarget="outputs"
				id="use-outputs"
			>
				<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
					<h4 id="use-s5" class="text-xs font-extrabold tracking-wide uppercase md:text-sm">
						6 · Describe outputs
					</h4>
					<div class="flex flex-wrap gap-x-0.5" aria-label="Output kind" role="radiogroup">
						{#each ['text', 'structured', 'image', 'speech'] as kind (kind)}
							<button
								class="chip text-xs"
								class:chip-on={outputKind === kind}
								aria-checked={outputKind === kind}
								onclick={() => setOutputKind(kind as OutputKind)}
								role="radio"
								type="button"
							>
								[ {kind} ]
							</button>
						{/each}
						{#if outputKind === 'structured'}
							<button
								class="chip text-xs"
								class:chip-on={validation}
								aria-pressed={validation}
								onclick={() => (validation = !validation)}
								type="button"
							>
								[ validation ]
							</button>
						{/if}
					</div>
				</div>
				<UseArt id="outputs" />
				<p class="max-w-2xl text-xs leading-relaxed text-mute md:text-sm">
					Configure how the agent responds: plain text, structured JSON, images, or speech.
				</p>
				<div class="relative">
					<div class="absolute top-0 right-0 z-10">{@render copyBtn('outputs', outputsBlock)}</div>
					<ProfileCode source={outputsBlock} />
				</div>
			</section>

			<section
				class="flex flex-col gap-3"
				aria-labelledby="use-s6"
				data-subtarget="guardrails"
				id="use-guardrails"
			>
				<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
					<h4 id="use-s6" class="text-xs font-extrabold tracking-wide uppercase md:text-sm">
						7 · Set guardrails
					</h4>
					<button
						class="chip text-xs shrink-0"
						class:chip-on={egress}
						aria-pressed={egress}
						onclick={() => (egress = !egress)}
						type="button"
					>
						[ egress ]
					</button>
				</div>
				<UseArt id="guardrails" />
				<p class="max-w-2xl text-xs leading-relaxed text-mute md:text-sm">
					Canary fencing, input sanitization, sensitive-data redaction, quotas, and opt-in egress (<code
						class="text-black"
						>standardEgressEnforce</code
					>) — the same stack wired in Th30 Live and the playground default.
				</p>
				<div class="relative">
					<div class="absolute top-0 right-0 z-10">
						{@render copyBtn('guardrails', guardrailsBlock)}
					</div>
					<ProfileCode source={guardrailsBlock} />
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
	color: var(--color-ink);
	cursor: pointer;
	line-height: 0;
}

.copy-icon:hover {
	opacity: 0.55;
}

.chip {
	appearance: none;
	background: transparent;
	border: none;
	padding: 0.15rem 0.25rem;
	color: var(--color-mute);
	cursor: pointer;
	font-weight: 800;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	line-height: 1.4;
}

.chip-on {
	color: var(--color-ink);
}

.chip:hover {
	color: var(--color-ink);
}

:global(.code-comment) {
	font-weight: 500;
	color: var(--color-mute);
}

:global(pre.profile-code) {
	margin: 0;
	overflow-y: visible;
}

.use-section :global(pre.profile-code) {
	line-height: 1.25;
}

.use-section :global(.code-line) {
	min-height: 0;
}
</style>
