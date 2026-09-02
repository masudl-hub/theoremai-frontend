<script lang="ts">
import { onMount, tick } from 'svelte';
import { on } from 'svelte/events';
import { wrapText } from '$lib/ascii/tip-card';
import { type PillarArtId, pillarArt } from '$lib/data/pillar-art';

type Pillar = {
	id: PillarArtId;
	title: string;
	body: string;
};

const pillars: Pillar[] = [
	{
		id: 'profile',
		title: 'Profile',
		body: [
			'Agent setup is usually scattered — prompts here, tools there, no single definition.',
			'A profile puts identity, model, tools.allow (custom functions), builtInTools (provider natives), inputs, outputs, and guardrails in one contract.',
		].join('\n\n'),
	},
	{
		id: 'kernel',
		title: 'Kernel',
		body: [
			'Custom runners diverge. Streaming, retries, and tools take different paths.',
			'The kernel runs every turn the same way: resolve snapshot, stream, tools, done. Tool visibility is turn-local — the kernel does not remember T2 promotion across turns.',
		].join('\n\n'),
	},
	{
		id: 'providers',
		title: 'Providers',
		body: [
			'Switching models usually means rewriting the agent.',
			'createProvider is the single door — OpenRouter, Gemini, local, and speech adapters load lazily on the first turn, not when you import the package.',
		].join('\n\n'),
	},
	{
		id: 'guardrails',
		title: 'Guardrails',
		body: [
			'Untrusted text walks in — injection, secrets, canary leaks — and most apps invent a one-off filter.',
			'Shared checks scrub inbound text, fence user data, and optionally enforce egress before the user sees output — batch turns and Live.',
		].join('\n\n'),
	},
	{
		id: 'observability',
		title: 'Observability',
		body: [
			'When a turn fails, you need a record — without shipping data somewhere you didn’t choose.',
			'Every turn can write a trace to a destination you control.',
		].join('\n\n'),
	},
];

const FIRST = 0;
const LAST = pillars.length - 1;

let active = $state(0);
let sectionEl: HTMLElement | undefined = $state();

function wrapBody(text: string, width: number): string[] {
	const paragraphs = text
		.split(/\n\n+/)
		.map((p) => p.trim())
		.filter(Boolean);
	const out: string[] = [];
	for (let i = 0; i < paragraphs.length; i++) {
		if (i > 0) out.push('');
		out.push(...wrapText(paragraphs[i], width));
	}
	return out;
}

function center(s: string, width: number): string {
	const t = s.trimEnd();
	if (t.length >= width) return t.slice(0, width);
	const left = Math.floor((width - t.length) / 2);
	return ' '.repeat(left) + t + ' '.repeat(width - t.length - left);
}

function cardArt(p: Pillar): string {
	const inner = 48;
	const rule = '─'.repeat(inner);
	const pad = (s: string) => `│ ${s.padEnd(inner - 1)}│`;
	const blank = pad('');
	const artLines = pillarArt[p.id].split('\n').map((line) => pad(center(line, inner - 2)));
	const body = wrapBody(p.body, inner - 2).map(pad);

	return [
		`┌${rule}┐`,
		blank,
		pad(center(p.title.toUpperCase(), inner - 2)),
		blank,
		`├${rule}┤`,
		blank,
		...artLines,
		blank,
		`├${rule}┤`,
		blank,
		...body,
		blank,
		`└${rule}┘`,
	].join('\n');
}

/** Circular slots so Profile can sit center with neighbors on both sides. */
function relativeSlot(i: number): number {
	const n = pillars.length;
	let d = i - active;
	if (d > Math.floor(n / 2)) d -= n;
	if (d < -Math.floor(n / 2)) d += n;
	return d;
}

function scrollerOf(): HTMLElement | null {
	return (sectionEl?.closest('.landing-scroll') as HTMLElement | null) ?? null;
}

function desktopStory(): boolean {
	return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
}

function stepNodes(): HTMLElement[] {
	if (!sectionEl) return [];
	return Array.from(sectionEl.querySelectorAll<HTMLElement>('[data-pillar-step]'));
}

function scrollToPillar(i: number) {
	const clamped = Math.max(FIRST, Math.min(LAST, i));
	if (!desktopStory()) {
		active = clamped;
		return;
	}
	const scroller = scrollerOf();
	const step = stepNodes()[clamped];
	if (!scroller || !step) {
		active = clamped;
		return;
	}
	const top =
		step.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
	scroller.scrollTo({ top, behavior: 'smooth' });
}

function select(i: number) {
	scrollToPillar(i);
}

function prev() {
	scrollToPillar(active - 1);
}

function next() {
	scrollToPillar(active + 1);
}

onMount(() => {
	let cleanup: (() => void) | undefined;

	void tick().then(() => {
		const section = sectionEl;
		if (!section) return;

		const scroller = scrollerOf();
		if (!scroller || !desktopStory()) return;

		let frame = 0;

		const sync = () => {
			frame = 0;
			const steps = stepNodes();
			if (!steps.length) return;
			const rootTop = scroller.getBoundingClientRect().top;
			let best = 0;
			let bestDist = Infinity;
			for (let i = 0; i < steps.length; i++) {
				const dist = Math.abs(steps[i].getBoundingClientRect().top - rootTop);
				if (dist < bestDist) {
					bestDist = dist;
					best = i;
				}
			}
			active = best;
		};

		const onScroll = () => {
			if (frame) return;
			frame = requestAnimationFrame(sync);
		};

		const offScroll = on(scroller, 'scroll', onScroll, { passive: true });
		sync();

		cleanup = () => {
			offScroll();
			if (frame) cancelAnimationFrame(frame);
		};
	});

	return () => cleanup?.();
});
</script>

<section bind:this={sectionEl} id="pillars" class="pillars-root relative w-full">
	<!-- Sticky stage: stays put while the track below is scrolled. -->
	<div
		class="pillars-pin section-divide-b relative z-10 flex min-h-dvh w-full flex-col items-center justify-start px-6 py-20 md:h-dvh md:overflow-hidden md:px-14 md:py-12"
	>
		<div class="relative z-10 mb-6 w-full max-w-6xl shrink-0 text-center md:mb-5">
			<h3 class="text-sm font-extrabold tracking-section uppercase">Pillars</h3>
		</div>

		<div
			class="relative z-10 flex min-h-0 w-full max-w-6xl flex-1 flex-col items-center justify-center"
		>
			<div
				class="pillar-stage relative w-full max-w-6xl"
				aria-activedescendant={pillars[active].id}
				aria-label="Pillars"
				role="listbox"
				tabindex="-1"
			>
				{#each pillars as pillar, i (pillar.id)}
					{const slot = $derived(relativeSlot(i))}
					<button
						id={pillar.id}
						class="pillar-card absolute top-1/2 left-1/2"
						class:pillar-focus={slot === 0}
						class:pillar-hidden={Math.abs(slot) > 2}
						class:pillar-l1={slot === -1}
						class:pillar-l2={slot === -2}
						class:pillar-r1={slot === 1}
						class:pillar-r2={slot === 2}
						aria-current={slot === 0 ? 'true' : undefined}
						aria-label={pillar.title}
						type="button"
						onclick={() => select(i)}
					>
						<pre class="ascii pillar-art text-xs font-bold md:text-sm">{cardArt(pillar)}</pre>
					</button>
				{/each}
			</div>

			<div
				class="mt-4 flex items-center gap-6 text-xs font-extrabold tracking-widest uppercase md:mt-6 md:text-sm"
			>
				<button class="invert-link px-2 py-1" aria-label="Previous" onclick={prev} type="button">
					[ &lt; ]
				</button>
				<span class="min-w-28 text-center text-mute">{pillars[active].title}</span>
				<button class="invert-link px-2 py-1" aria-label="Next" onclick={next} type="button">
					[ &gt; ]
				</button>
			</div>
		</div>
	</div>

	<!--
		Desktop scroll track: one snap page per pillar.
		Negative margin pulls the track under the sticky pin so total height = N × 100dvh.
	-->
	<div class="pillars-track" aria-hidden="true">
		{#each pillars as pillar, i (pillar.id)}
			<div class="pillar-step" data-pillar-id={pillar.id} data-pillar-step={i}></div>
		{/each}
	</div>
</section>

<style>
.pillars-track {
	display: none;
}

@media (min-width: 768px) {
	.pillars-pin {
		position: sticky;
		top: 0;
	}

	.pillars-track {
		display: block;
		margin-top: -100dvh;
		pointer-events: none;
	}

	.pillar-step {
		height: 100dvh;
		scroll-snap-align: start;
		scroll-snap-stop: always;
	}
}

.pillar-card {
	appearance: none;
	background: transparent;
	border: none;
	padding: 0;
	margin: 0;
	cursor: pointer;
	transform: translate(-50%, -50%);
	transition:
		transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
		opacity 0.45s ease,
		filter 0.45s ease;
}

.pillar-stage {
	height: var(--size-pillar-stage);
}

@media (min-width: 768px) {
	.pillar-stage {
		height: var(--size-pillar-stage-md);
	}
}

.pillar-art {
	margin: 0;
	background: var(--color-paper);
	color: var(--color-ink);
	line-height: 1.38;
	white-space: pre;
	text-align: left;
}

.pillar-l2 {
	z-index: 1;
	opacity: 0.28;
	transform: translate(-50%, -50%) translateX(-18rem) translateY(1.5rem) rotate(-7deg) scale(0.78);
	filter: saturate(0.75);
}

.pillar-l1 {
	z-index: 3;
	opacity: 0.5;
	transform: translate(-50%, -50%) translateX(-10rem) translateY(0.6rem) rotate(-3.5deg) scale(0.9);
}

.pillar-focus {
	z-index: 6;
	opacity: 1;
	transform: translate(-50%, -50%) scale(1.05);
}

.pillar-r1 {
	z-index: 3;
	opacity: 0.5;
	transform: translate(-50%, -50%) translateX(10rem) translateY(0.6rem) rotate(3.5deg) scale(0.9);
}

.pillar-r2 {
	z-index: 1;
	opacity: 0.28;
	transform: translate(-50%, -50%) translateX(18rem) translateY(1.5rem) rotate(7deg) scale(0.78);
	filter: saturate(0.75);
}

.pillar-hidden {
	z-index: 0;
	opacity: 0;
	pointer-events: none;
	transform: translate(-50%, -50%) scale(0.68);
}

@media (max-width: 767px) {
	.pillar-stage {
		height: auto;
		min-height: 30rem;
	}

	.pillar-art {
		line-height: 1.35;
	}

	.pillar-l2,
	.pillar-r2 {
		opacity: 0;
		pointer-events: none;
	}

	.pillar-l1 {
		transform: translate(-50%, -50%) translateX(-3.5rem) translateY(1rem) rotate(-4deg) scale(0.82);
		opacity: 0.35;
	}

	.pillar-r1 {
		transform: translate(-50%, -50%) translateX(3.5rem) translateY(1rem) rotate(4deg) scale(0.82);
		opacity: 0.35;
	}

	.pillar-focus {
		transform: translate(-50%, -50%) scale(1);
	}
}

@media (min-width: 768px) {
	.pillar-art {
		line-height: 1.4;
	}
}

@media (min-width: 1100px) {
	.pillar-art {
		line-height: 1.42;
	}

	.pillar-l2 {
		transform: translate(-50%, -50%) translateX(-22rem) translateY(1.5rem) rotate(-7deg) scale(0.8);
	}

	.pillar-l1 {
		transform: translate(-50%, -50%) translateX(-12rem) translateY(0.6rem) rotate(-3.5deg)
			scale(0.91);
	}

	.pillar-r1 {
		transform: translate(-50%, -50%) translateX(12rem) translateY(0.6rem) rotate(3.5deg) scale(0.91);
	}

	.pillar-r2 {
		transform: translate(-50%, -50%) translateX(22rem) translateY(1.5rem) rotate(7deg) scale(0.8);
	}
}
</style>
