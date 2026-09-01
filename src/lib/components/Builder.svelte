<script lang="ts">
	let name = $state('sales.agent');
	let handle = $state('sales');
	let system = $state('Qualify leads. Never invent pricing.');
	let tools = $state('lookup_crm, draft_quote');
	let running = $state(false);
	let toast = $state(false);
	let logs = $state<string[]>(['> Awaiting execution…']);
	let btnLabel = $state('[ Simulate run ]');

	const code = $derived.by(() => {
		const id = name.trim() || 'agent';
		const h = handle.trim() || id;
		const sys = system.trim() || 'Be precise.';
		const allow = tools
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		const allowLit = allow.length ? allow.map((t) => `"${t}"`).join(', ') : '';
		const toolsGate = allow.length
			? allow.map((t) => `    ${t}: true`).join(',\n')
			: '    // enable tools per turn';

		return `import {
  defineProfile,
  registerProfile,
  createProvider,
  runTurn,
} from "theorum";

const profile = defineProfile({
  id: "${id}",
  identity: {
    handle: "${h}",
    system: "${sys}",
  },
  model: {
    protocol: "openAi",
    provider: "openrouter",
    allow: ["fast"],
    config: {
      fast: {
        apiId: "perplexity/sonar",
        openRouterId: "perplexity/sonar",
        thinking: { on: "high", off: "minimal" },
        thinkingLevels: ["minimal", "low", "medium", "high"],
        summaries: { on: "auto", off: "none" },
        maxOutputTokens: 2048,
        temperature: 0.3,
        keyBuiltins: [],
      },
    },
    select: { fast: "fast" },
  },
  tools: { allow: [${allowLit}] },
  inputs: { text: true },
  outputs: {},
  guardrails: { quota: { perDay: 100 } },
});

registerProfile(profile);

const provider = createProvider(profile, {
  openRouter: { apiKey: process.env.OPENROUTER_API_KEY },
});

for await (const event of runTurn(
  {
    profile: "${id}",
    select: "fast",
    input: { text: "Qualify Acme Corp, mid-market." },
    tools: {
${toolsGate}
    },
  },
  provider,
)) {
  console.log(event);
}`;
	});

	async function exportConfig() {
		await navigator.clipboard.writeText(code);
		toast = true;
		setTimeout(() => (toast = false), 1600);
	}

	function sleep(ms: number) {
		return new Promise((r) => setTimeout(r, ms));
	}

	async function simulate() {
		if (running) return;
		running = true;
		btnLabel = '[ Running… ]';
		const id = name.trim() || 'agent';
		const sequence = [
			`> runTurn({ profile: "${id}" })`,
			`[theorum:resolve] profile mounted · ${id}`,
			`[theorum:ingress] input normalized`,
			`[theorum:boundary] canary bound`,
			`[theorum:guardrail] sanitize · clear`,
			`[theorum:provider] openAi/openrouter · select=fast`,
			`[theorum:stream] tokens…`,
			`[theorum:gates] output validated`,
			`[theorum:trace] sink.write · span_turn_ok`,
			`> done · stop.kind=completed`
		];
		logs = [];
		for (const line of sequence) {
			logs = [...logs, line];
			await sleep(120 + Math.random() * 280);
		}
		running = false;
		btnLabel = '[ Simulate run ]';
	}
</script>

<section
	id="builder"
	class="landing-section flex min-h-dvh w-full flex-col border-b-[3px] border-black px-6 py-20 md:px-14 md:py-12"
>
	<div class="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
		<div class="mb-6 shrink-0 md:mb-8">
			<h2 class="mb-2 text-3xl font-extrabold tracking-tighter uppercase md:text-5xl">
				Interactive builder
			</h2>
			<p class="text-sm font-bold md:text-base">
				Shape a profile. Export real kernel config. Simulate a trace.
			</p>
		</div>

		<div class="grid min-h-0 flex-1 grid-cols-1 gap-8 overflow-hidden lg:grid-cols-2 lg:gap-12">
			<!-- Interaction surface — the only "card" on the site -->
			<div class="flex flex-col border-2 border-black bg-[var(--color-paper-bright)] p-6">
				<div
					class="mb-6 border-b border-black pb-2 text-xs font-extrabold tracking-widest uppercase"
				>
					Contract definition
				</div>

				<div class="flex flex-grow flex-col gap-5">
					<label class="flex flex-col gap-1">
						<span class="text-[10px] font-bold tracking-widest uppercase">Profile id</span>
						<input class="field" bind:value={name} autocomplete="off" />
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-[10px] font-bold tracking-widest uppercase">Handle</span>
						<input class="field" bind:value={handle} autocomplete="off" />
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-[10px] font-bold tracking-widest uppercase">System</span>
						<input class="field" bind:value={system} autocomplete="off" />
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-[10px] font-bold tracking-widest uppercase"
							>Tools allow (comma-separated)</span
						>
						<input class="field" bind:value={tools} autocomplete="off" />
					</label>
				</div>

				<div class="mt-8 flex gap-4 border-t border-black pt-4">
					<button type="button" class="btn btn-ghost flex-1" onclick={exportConfig}>
						[ Export config ]
					</button>
					<button
						type="button"
						class="btn btn-solid flex-1"
						onclick={simulate}
						disabled={running}
					>
						{btnLabel}
					</button>
				</div>
			</div>

			<div class="flex min-h-0 flex-col gap-8">
				<div class="relative flex min-h-0 flex-1 flex-col border-2 border-black bg-[var(--color-paper-bright)] p-6">
					<div
						class="mb-4 flex justify-between border-b border-black pb-2 text-xs font-extrabold tracking-widest uppercase"
					>
						<span>Kernel config</span>
						<span class="transition-opacity" class:opacity-0={!toast} class:opacity-100={toast}
							>Copied</span
						>
					</div>
					<pre class="min-h-0 flex-1 overflow-auto text-[10px] leading-relaxed md:text-xs">{code}</pre>
				</div>

				<div
					class="relative flex min-h-0 flex-1 flex-col overflow-hidden border-2 border-black bg-black p-6 text-white"
				>
					<div
						class="mb-4 border-b border-white pb-2 text-xs font-extrabold tracking-widest uppercase"
					>
						Telemetry trace
					</div>
					<div
						class="min-h-0 flex-1 overflow-y-auto font-mono text-[10px] leading-relaxed whitespace-pre-wrap md:text-xs"
						class:cursor-blink={running}
					>
						{#each logs as line, i (i)}
							<div
								class={i === logs.length - 1 && line.startsWith('> done')
									? 'mt-2 font-bold text-[#7dffb3]'
									: 'text-white/80'}
							>
								{line}
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
