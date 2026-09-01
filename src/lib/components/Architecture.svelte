<script lang="ts">
	import CloudSky from '$lib/components/CloudSky.svelte';
	import AsciiHover from '$lib/components/AsciiHover.svelte';
	import { renderAsciiCard } from '$lib/ascii/tip-card';
	import { architectureMap, type ArchNode } from '$lib/data/architecture';
	import { cloudParadeSparse } from '$lib/data/clouds';

	let hint = $state('[ Click to copy ]');

	function n(id: string, label: string) {
		return `<button type="button" class="node" data-node="${id}">${label}</button>`;
	}

	const labels: Record<string, string> = {
		cli: 'CLI',
		run: 'run',
		test: 'test',
		profile: 'profile',
		bench: 'bench',
		fuzz: 'fuzz',
		matrix: 'Matrix',
		fixtures: 'fixtures',
		synthesizer: 'synthesizer',
		kernel: 'Kernel',
		engine: 'Engine',
		assert: 'assert',
		boundary: 'boundary',
		compaction: 'compaction',
		delta: 'delta',
		runner: 'Runner',
		gates: 'gates',
		state: 'state',
		stream: 'stream',
		registry: 'Registry',
		catalog: 'catalog',
		profiles: 'profiles',
		resolve: 'resolve',
		schemas: 'schemas',
		ingress: 'ingress',
		stop: 'stop',
		providers: 'Providers',
		create_provider: 'createProvider',
		local: 'Local',
		gemini: 'Gemini',
		openrouter: 'OpenRouter',
		speech: 'Speech',
		guardrails: 'Guardrails',
		error: 'error',
		injection: 'injection',
		sensitive: 'sensitive',
		quota: 'quota',
		sanitize: 'sanitize',
		observability: 'Observability',
		sinks: 'sinks',
		trace_record: 'TraceRecord',
		host: 'Host',
		presets: 'Presets',
		presets_google: 'Google',
		streaming_preview: 'streaming preview'
	};

	const tree = $derived.by(() => {
		const ascii = [
			`Theorum ──┬── Kernel ─────────┬── Engine ──────────────────┬── assert`,
			`          │                   │                            ├── boundary`,
			`          │                   │                            ├── compaction`,
			`          │                   │                            ├── delta`,
			`          │                   │                            └── Runner ──────┬── gates`,
			`          │                   │                                             ├── state`,
			`          │                   │                                             └── stream`,
			`          │                   ├── Registry ────────────────┬── catalog`,
			`          │                   │                            ├── profiles`,
			`          │                   │                            ├── resolve`,
			`          │                   │                            ├── schemas`,
			`          │                   │                            └── ingress`,
			`          │                   └── stop`,
			`          │`,
			`          ├── Providers ──────┬── createProvider`,
			`          │                   ├── Local`,
			`          │                   ├── Gemini`,
			`          │                   ├── OpenRouter`,
			`          │                   └── Speech`,
			`          │`,
			`          ├── Guardrails ─────┬── error`,
			`          │                   ├── injection`,
			`          │                   ├── sensitive`,
			`          │                   ├── quota`,
			`          │                   └── sanitize`,
			`          │`,
			`          ├── Observability ──┬── sinks`,
			`          │                   └── TraceRecord`,
			`          │`,
			`          ├── CLI ────────────┬── Commands ────────────────┬── run`,
			`          │                   │                            ├── test`,
			`          │                   │                            ├── profile`,
			`          │                   │                            ├── bench`,
			`          │                   │                            └── fuzz`,
			`          │                   └── Matrix ──────────────────┬── fixtures`,
			`          │                                                └── synthesizer`,
			`          │`,
			`          ├── Host ── streaming preview`,
			`          │`,
			`          └── Presets ── Google`
		].join('\n');

		const order = Object.entries(labels).sort((a, b) => b[1].length - a[1].length);
		let html = ascii;
		for (let i = 0; i < order.length; i++) {
			const [, label] = order[i];
			html = html.replaceAll(label, `\u0001${i}\u0002`);
		}
		for (let i = 0; i < order.length; i++) {
			const [id, label] = order[i];
			html = html.replaceAll(`\u0001${i}\u0002`, n(id, label));
		}
		return html;
	});

	function archTipArt(node: ArchNode, action: string): string {
		const foot = action.replace(/^\[|\]$/g, '').trim().toLowerCase();
		return renderAsciiCard({
			title: `${node.title.toUpperCase()} · ${node.type}`,
			body: node.desc,
			specs: node.specs.map(([label, value]) => ({ label, value })),
			usage: node.usage,
			copyable: node.copyable,
			footer: foot
		});
	}

	function resolveTip(el: HTMLElement): string | null {
		const id = el.getAttribute('data-node');
		if (!id) return null;
		const data = architectureMap[id];
		if (!data) return null;
		hint = data.copyable ? '[ Click to copy ]' : '[ Internal ]';
		return archTipArt(data, hint);
	}

	async function onHostClick(e: MouseEvent) {
		const el = (e.target as Element | null)?.closest?.('[data-node]') as HTMLElement | null;
		if (!el) return;
		const id = el.getAttribute('data-node');
		if (!id) return;
		const data = architectureMap[id];
		if (!data?.copyable) return;
		try {
			await navigator.clipboard.writeText(data.usage);
			hint = 'Copied';
			setTimeout(() => {
				hint = '[ Click to copy ]';
			}, 1200);
		} catch {
			hint = 'Copy failed';
		}
	}
</script>

<section
	id="architecture"
	class="landing-section relative flex min-h-dvh w-full flex-col items-center justify-center overflow-y-auto border-b-[3px] border-black px-6 py-20 md:px-14 md:py-12"
>
	<CloudSky
		clouds={cloudParadeSparse}
		band="absolute inset-x-0 top-[8%] bottom-[8%] z-0 select-none overflow-visible text-black"
	/>

	<div class="relative z-10 mb-6 w-full max-w-6xl shrink-0 text-center md:mb-5">
		<h3 class="text-sm font-extrabold tracking-[0.22em] uppercase">Package map</h3>
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<AsciiHover selector="[data-node]" resolveTip={resolveTip}>
		<div class="relative z-10 mb-4 w-full max-w-6xl overflow-x-auto md:mb-2" onclick={onHostClick} role="presentation">
			<pre class="ascii text-xs leading-snug font-bold md:text-sm md:leading-[1.4]">{@html tree}</pre>
		</div>
	</AsciiHover>
</section>
