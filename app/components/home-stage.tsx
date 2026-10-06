import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { IconArrowsExchange, IconContract, IconShieldCheck } from '@tabler/icons-react';
import {
	type Ref,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { HeroVideo } from './hero-video';
import './home-stage.css';

/** Same per-character cadence as the docs search hints. */
const TYPE_MS = 55;

const ARGUMENT =
	'Theorem is an open-source TypeScript agent builder that brings models, inputs, outputs, tools, and guardrails into one typed profile. Build multimodal agents with less wiring, keep execution and interface aligned, and spend more time on what makes your agent useful.';

/**
 * Each still is the idea.
 * Saffron laid out to one rule. One river through orange rock, not a junction.
 * The valley footage itself settles as the boundary.
 */
const STILLS: readonly {
	icon: typeof IconContract;
	title: string;
	text: string;
	src: string;
	alt: string;
	objectPosition: string;
}[] = [
	{
		icon: IconContract,
		title: 'Predictable structure',
		text: 'Define the agent’s contract once. Run each turn against the same declared rules, even when the model’s answers vary.',
		src: '/imagery/th30_dryingsaffron.png',
		alt: 'Purple saffron laid out in plots divided by dirt paths, with clouds and their shadows',
		objectPosition: 'center',
	},
	{
		icon: IconArrowsExchange,
		title: 'Less plumbing',
		text: 'Move between text, images, speech, and live interactions with a familiar profile-based approach. Focus on the experience, not another integration.',
		src: '/imagery/th30_orangecanyon.png',
		alt: 'A single river cutting through an orange canyon, with clouds and their shadows',
		objectPosition: 'center',
	},
	{
		icon: IconShieldCheck,
		title: 'Built-in boundaries',
		text: 'Make guardrails part of the agent, not an afterthought. Apply checks to inputs, reasoning streams, tool calls, and outputs, with explicit permissions for what the agent can access.',
		src: '/hero/valley.webp',
		alt: 'A green valley with a river running through it, seen from above',
		objectPosition: 'center',
	},
];

const BOUNDS_TITLE = 'Built-in boundaries';

type Still = (typeof STILLS)[number];

function StillLabel({ still }: { still: Still }) {
	const Icon = still.icon;
	return (
		<>
			<span className="home-stage-still-title">
				<Icon size={20} stroke={1.75} aria-hidden />
				<Heading level={3}>{still.title}</Heading>
			</span>
			<p className="home-stage-still-body">{still.text}</p>
		</>
	);
}

type ArgumentWord = { text: string; index: number };

/** Words, with the index of each word's first character in `text`. */
function argumentWords(text: string): ArgumentWord[] {
	const words: ArgumentWord[] = [];
	for (const match of text.matchAll(/\S+/g)) {
		words.push({ text: match[0], index: match.index });
	}
	return words;
}

/**
 * Types `text` one character at a time, then leaves it. Reduced motion shows the whole
 * sentence. The hidden copy is the finished wrap: a word that will not fit on the
 * current line breaks before its first letter, so it does not jump down mid-word.
 */
function TypedArgument({ text }: { text: string }) {
	const words = useMemo(() => argumentWords(text), [text]);
	const holdRef = useRef<HTMLSpanElement>(null);
	const [breaks, setBreaks] = useState<readonly boolean[]>([]);
	const [shown, setShown] = useState(0);
	useLayoutEffect(() => {
		const root = holdRef.current;
		if (!root || words.length === 0) return;
		let alive = true;
		const measure = () => {
			if (!alive) return;
			const nodes = [...root.querySelectorAll<HTMLElement>('[data-word]')];
			const next = nodes.map((node, i) => i > 0 && node.offsetTop > nodes[i - 1].offsetTop);
			setBreaks((current) =>
				current.length === next.length && current.every((bit, i) => bit === next[i])
					? current
					: next,
			);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(root);
		void document.fonts.ready.then(measure);
		return () => {
			alive = false;
			observer.disconnect();
		};
	}, [words]);
	useEffect(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			setShown(text.length);
			return;
		}
		let length = 0;
		let timer = 0;
		const step = () => {
			if (length >= text.length) return;
			length += 1;
			setShown(length);
			timer = window.setTimeout(step, TYPE_MS);
		};
		timer = window.setTimeout(step, TYPE_MS);
		return () => {
			window.clearTimeout(timer);
		};
	}, [text]);
	return (
		<Text className="home-stage-statement">
			<span className="home-stage-statement-full">{text}</span>
			<span ref={holdRef} className="home-stage-statement-hold" aria-hidden>
				{words.map((word, i) => (
					<span key={word.index}>
						{i > 0 ? ' ' : null}
						<span data-word>{word.text}</span>
					</span>
				))}
			</span>
			<span className="home-stage-statement-live" aria-hidden>
				{words.map((word, i) => {
					if (shown <= word.index) return null;
					const typed = word.text.slice(0, shown - word.index);
					return (
						<span key={word.index}>
							{breaks[i] ? <br /> : i > 0 ? ' ' : null}
							<span className="home-stage-statement-word">{typed}</span>
						</span>
					);
				})}
			</span>
		</Text>
	);
}

function StageCopy({ boundsSlot }: { boundsSlot?: Ref<HTMLDivElement> }) {
	return (
		<div className="home-hero-copy">
			<div className="home-stage-frame">
				<div className="home-stage-split">
					<div className="home-stage-lead">
						<Heading className="home-stage-headline" level={2}>
							<span className="home-stage-line is-quiet">Agents are</span>
							<span className="home-stage-line is-quiet">probabilistic.</span>
							<span className="home-stage-line is-claim">Your architecture</span>
							<span className="home-stage-line is-claim">
								<span className="home-stage-rule">shouldn’t</span> be.
							</span>
						</Heading>
						<TypedArgument text={ARGUMENT} />
					</div>
					<div className="home-stage-stills">
						{STILLS.map((still) =>
							boundsSlot && still.title === BOUNDS_TITLE ? (
								<div
									key={still.title}
									ref={boundsSlot}
									className="home-stage-slot"
									aria-hidden="true"
								/>
							) : (
								<figure key={still.title} className="home-stage-still" tabIndex={0}>
									<img
										src={still.src}
										alt={still.alt}
										decoding="async"
										fetchPriority="low"
										style={{ objectPosition: still.objectPosition }}
									/>
									<figcaption>
										<StillLabel still={still} />
									</figcaption>
								</figure>
							),
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function Wordmark({ version }: { version: string }) {
	return (
		<VStack className="home-hero-wordmark" height="100%" justify="end" gap={2} padding={10}>
			<Text className="home-hero-aside" type="label">
				@theoremjs/agents {version}
			</Text>
			<Heading className="home-hero-title" level={1} type="wordmark" hasCapsize>
				THEOREM
			</Heading>
			<Text className="home-hero-aside" type="large">
				Typed, composable agents for text, image, speech, and live voice — guarded on every turn.
			</Text>
		</VStack>
	);
}

function Footage({ version, mediaRef }: { version: string; mediaRef: Ref<HTMLDivElement> }) {
	return (
		<div className="home-hero-media" ref={mediaRef} tabIndex={0}>
			<HeroVideo src="/hero/valley.mp4" poster="/hero/valley.webp">
				<Wordmark version={version} />
			</HeroVideo>
			<div className="home-hero-bounds-scrim" aria-hidden />
		</div>
	);
}

function BoundsCaption() {
	const bounds = STILLS.find((still) => still.title === BOUNDS_TITLE);
	if (!bounds) return null;
	return (
		<div className="home-hero-bounds-caption">
			<StillLabel still={bounds} />
		</div>
	);
}

/** Where the still has to land: the Built-in boundaries slot, in pin coordinates. */
function useFootageSlot(
	pinRef: RefObject<HTMLDivElement | null>,
	slotRef: RefObject<HTMLDivElement | null>,
	mediaRef: RefObject<HTMLDivElement | null>,
) {
	useLayoutEffect(() => {
		if (!CSS.supports('animation-timeline', 'view()')) return;
		const pin = pinRef.current;
		const slot = slotRef.current;
		const media = mediaRef.current;
		if (!pin || !slot || !media) return;
		let alive = true;
		const measure = () => {
			if (!alive) return;
			const pinBox = pin.getBoundingClientRect();
			const slotBox = slot.getBoundingClientRect();
			if (slotBox.width < 1 || pinBox.width < 1) return;
			const next: Record<string, string> = {
				'--hero-to-x': `${String(slotBox.left - pinBox.left)}px`,
				'--hero-to-y': `${String(slotBox.top - pinBox.top)}px`,
				'--hero-to-w': `${String(slotBox.width)}px`,
				'--hero-to-h': `${String(slotBox.height)}px`,
			};
			for (const [name, value] of Object.entries(next)) {
				if (pin.style.getPropertyValue(name) !== value) pin.style.setProperty(name, value);
			}
			media.classList.add('is-placed');
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(pin);
		observer.observe(slot);
		const frame = slot.closest('.home-stage-frame');
		frame?.addEventListener('scroll', measure, { passive: true });
		void document.fonts.ready.then(measure);
		return () => {
			alive = false;
			observer.disconnect();
			frame?.removeEventListener('scroll', measure);
		};
	}, [pinRef, slotRef, mediaRef]);
}

/**
 * The valley footage contracts into the Built-in boundaries slot. The wordmark
 * fades as that frame settles on the claim and the other two stills.
 */
export function HomeStage({ version }: { version: string }) {
	const pinRef = useRef<HTMLDivElement>(null);
	const slotRef = useRef<HTMLDivElement>(null);
	const mediaRef = useRef<HTMLDivElement>(null);
	useFootageSlot(pinRef, slotRef, mediaRef);
	return (
		<>
			<section className="home-hero-run" aria-label="Theorem">
				<div className="home-hero-pin" ref={pinRef}>
					<StageCopy boundsSlot={slotRef} />
					<Footage version={version} mediaRef={mediaRef} />
					<BoundsCaption />
				</div>
				<div className="home-hero-settle" aria-hidden="true" />
			</section>
			<section className="home-page home-stage-page" aria-label="Theorem">
				<StageCopy />
			</section>
		</>
	);
}
