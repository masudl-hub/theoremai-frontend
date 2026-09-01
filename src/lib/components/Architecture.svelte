<script lang="ts">
	import CloudSky from '$lib/components/CloudSky.svelte';
	import { architectureMap, type ArchNode } from '$lib/data/architecture';
	import { cloudParadeSparse } from '$lib/data/clouds';

	let tip = $state<ArchNode | null>(null);
	let tipX = $state(0);
	let tipY = $state(0);
	let hint = $state('[ Click to copy ]');
	let visible = $state(false);

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
		// Author as pure ASCII so every │ sits under its ┬, then swap labels for buttons.
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
		// Index placeholders only — id-based tokens still contain short labels
		// (run ⊂ runner, profile ⊂ profiles) and get corrupted on a second pass.
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


	function place(e: MouseEvent) {
		const pad = 16;
		const w = 360;
		const h = 360;
		let x = e.clientX + pad;
		let y = e.clientY + pad;
		if (x + w > window.innerWidth) x = e.clientX - w - pad;
		if (y + h > window.innerHeight) y = e.clientY - h - pad;
		tipX = Math.max(8, x);
		tipY = Math.max(8, y);
	}

	function targetNode(e: Event): HTMLElement | null {
		const el = e.target;
		if (!(el instanceof Element)) return null;
		return el.closest('[data-node]');
	}

	function onEnter(e: MouseEvent) {
		const el = targetNode(e);
		if (!el) return;
		const id = el.getAttribute('data-node');
		if (!id) return;
		const data = architectureMap[id];
		if (!data) return;
		tip = data;
		hint = data.copyable ? '[ Click to copy ]' : '[ Internal ]';
		visible = true;
		place(e);
	}

	function onMove(e: MouseEvent) {
		if (!visible) return;
		place(e);
	}

	function onLeave(e: MouseEvent) {
		const related = e.relatedTarget;
		if (related instanceof Node && (e.currentTarget as HTMLElement).contains(related)) return;
		visible = false;
		tip = null;
	}

	function onFocusIn(e: FocusEvent) {
		const el = targetNode(e);
		if (!el) return;
		const id = el.getAttribute('data-node');
		if (!id) return;
		const data = architectureMap[id];
		if (!data) return;
		tip = data;
		hint = data.copyable ? '[ Click to copy ]' : '[ Internal ]';
		visible = true;
		const rect = el.getBoundingClientRect();
		tipX = Math.min(window.innerWidth - 340, rect.right + 12);
		tipY = Math.min(window.innerHeight - 200, rect.top);
	}

	function onFocusOut(e: FocusEvent) {
		const related = e.relatedTarget;
		if (related instanceof Node && (e.currentTarget as HTMLElement).contains(related)) return;
		visible = false;
		tip = null;
	}

	function wrapText(text: string, width: number): string[] {
		const lines: string[] = [];
		for (const raw of text.split('\n')) {
			const words = raw.split(/\s+/).filter(Boolean);
			if (!words.length) {
				lines.push('');
				continue;
			}
			let line = '';
			for (const word of words) {
				const next = line ? `${line} ${word}` : word;
				if (next.length <= width) {
					line = next;
					continue;
				}
				if (line) lines.push(line);
				line = word.length > width ? word.slice(0, width) : word;
			}
			if (line) lines.push(line);
		}
		return lines;
	}

	function tipArt(node: ArchNode, action: string): string {
		const inner = 44;
		const labelW = 9;
		const rule = '─'.repeat(inner);
		const pad = (s: string) => `│ ${s.padEnd(inner - 1)}│`;
		const title = `${node.title.toUpperCase()} · ${node.type}`.slice(0, inner - 2);
		const body = wrapText(node.desc, inner - 2);
		const usage = wrapText(node.usage, inner - 4);
		const foot = action.replace(/^\[|\]$/g, '').trim().toLowerCase();

		const specLines = node.specs.flatMap(([label, value]) => {
			const head = `${label.padEnd(labelW)} `;
			const wrapped = wrapText(value, inner - 2 - head.length);
			return wrapped.map((line, i) => (i === 0 ? `${head}${line}` : `${' '.repeat(head.length)}${line}`));
		});

		return [
			`┌${rule}┐`,
			pad(title),
			`├${rule}┤`,
			...body.map(pad),
			pad(''),
			...specLines.map(pad),
			`├${rule}┤`,
			...usage.map((line) => pad(node.copyable ? `> ${line}` : `  ${line}`)),
			pad(''),
			pad(foot.padStart(inner - 2)),
			`└${rule}┘`
		].join('\n');
	}

	async function onClick(e: MouseEvent) {
		const el = targetNode(e);
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

	<!-- svelte-ignore a11y_no_static_element_interactions a11y_mouse_events_have_key_events -->
	<div
		class="relative z-10 mb-4 w-full max-w-6xl overflow-x-auto md:mb-2"
		onmouseover={onEnter}
		onmousemove={onMove}
		onmouseout={onLeave}
		onclick={onClick}
		onfocusin={onFocusIn}
		onfocusout={onFocusOut}
		role="presentation"
	>
		<pre class="ascii text-xs leading-snug font-bold md:text-sm md:leading-[1.4]">{@html tree}</pre>
	</div>

	{#if visible && tip}
		<pre
			class="ascii map-tip pointer-events-none fixed z-50 font-bold"
			style="left: {tipX}px; top: {tipY}px;"
			role="tooltip"
		>{tipArt(tip, hint)}</pre>
	{/if}
</section>

<style>
	.map-tip {
		margin: 0;
		background: var(--color-paper);
		color: #000;
		font-size: 10px;
		line-height: 1.35;
		white-space: pre;
	}

	@media (min-width: 768px) {
		.map-tip {
			font-size: 11px;
		}
	}

	:global(.node) {
		display: inline;
		font: inherit;
		font-weight: inherit;
		background: transparent;
		border: none;
		border-bottom: 1px dashed #000;
		padding: 0;
		margin: 0;
		cursor: crosshair;
		color: inherit;
		transition:
			background-color 0.1s ease,
			color 0.1s ease,
			border-color 0.1s ease;
	}

	:global(.node:hover),
	:global(.node:focus-visible) {
		background: #000;
		color: #fff;
		border-bottom-style: solid;
		outline: none;
	}
</style>
