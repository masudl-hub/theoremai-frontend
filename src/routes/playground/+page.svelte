<script lang="ts">
import { createExampleGraph } from '$lib/playground/example';
import type { TurnResponsePayload } from '$lib/types/playground';
import type { PageData } from './$types';

let { data }: { data: PageData } = $props();

const exampleNodes = createExampleGraph().nodes;

let prompt = $state('Say hello from the THEORUM playground in one short sentence.');
let running = $state(false);
let status = $state<string | null>(null);
let statusKind = $state<'ok' | 'error' | null>(null);
let output = $state('');
let traceJson = $state('');

async function runTurn() {
	running = true;
	status = 'Running turn…';
	statusKind = null;
	output = '';
	traceJson = '';

	try {
		const res = await fetch('/api/turn', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ nodes: exampleNodes, text: prompt }),
		});
		const body = (await res.json()) as TurnResponsePayload;

		if (!body.ok) {
			status = body.error;
			statusKind = 'error';
			return;
		}

		output = body.text;
		traceJson = JSON.stringify(body.trace ?? [], null, 2);
		status = `Stop: ${JSON.stringify(body.stop)}`;
		statusKind = 'ok';
	} catch (error) {
		status = error instanceof Error ? error.message : 'Request failed.';
		statusKind = 'error';
	} finally {
		running = false;
	}
}
</script>

<div class="mx-auto max-w-5xl px-6 py-16 md:px-14">
	<a class="invert-link mb-10 inline-block text-xs font-bold tracking-widest uppercase" href="/"
		>← Theorum</a
	>

	<section class="mb-8 border-2 border-black bg-[var(--color-paper-bright)] p-6">
		<h1 class="mb-2 text-2xl font-extrabold tracking-tighter uppercase md:text-4xl">Playground</h1>
		<div class="flex flex-wrap gap-4 text-xs text-[var(--color-mute)]">
			<span>version <code class="text-black">{data.kernel.version}</code></span>
			{#if data.kernel.submoduleHead}
				<span>head <code class="text-black">{data.kernel.submoduleHead}</code></span>
			{/if}
		</div>
	</section>

	<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
		<section class="border-2 border-black bg-[var(--color-paper-bright)] p-6">
			<h2 class="mb-4 text-xs font-extrabold tracking-widest uppercase">Prompt</h2>
			<textarea
				class="field min-h-40 resize-y"
				aria-label="Turn prompt"
				bind:value={prompt}
			></textarea>
			<div class="mt-4 flex flex-wrap items-center gap-3">
				<button
					class="btn btn-solid"
					disabled={running || !prompt.trim()}
					onclick={runTurn}
					type="button"
				>
					{running ? '[ Running… ]' : '[ Run turn ]'}
				</button>
				<p
					class="text-xs"
					class:text-[#1a7a45]={statusKind === 'ok'}
					class:text-[#b00020]={statusKind === 'error'}
					class:text-[var(--color-mute)]={!statusKind}
				>
					{status ?? 'Uses the example graph with default egress. Requires OPENROUTER_API_KEY in .env.local.'}
				</p>
			</div>
		</section>

		<section class="border-2 border-black bg-[var(--color-paper-bright)] p-6">
			<h2 class="mb-4 text-xs font-extrabold tracking-widest uppercase">Output</h2>
			<div class="min-h-40 text-sm whitespace-pre-wrap">{output || '—'}</div>
		</section>
	</div>

	<section class="mt-8 border-2 border-black bg-black p-6 text-white">
		<h2 class="mb-4 text-xs font-extrabold tracking-widest uppercase md:text-sm">Trace events</h2>
		<pre
			class="overflow-x-auto text-xs leading-snug font-bold md:text-sm md:leading-[1.4]"
		>{traceJson || 'Run a turn to inspect raw TurnEvent[] from the kernel.'}</pre>
	</section>
</div>
