import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HomeIntro } from './home-intro';
import './home-stage.css';

/** Same per-character cadence as the docs search hints. */
const TYPE_MS = 55;

const ARGUMENT =
	'Theorem is an open-source TypeScript agent builder that brings models, inputs, outputs, tools, and guardrails into one typed profile. Build multimodal agents with less wiring, keep execution and interface aligned, and spend more time on what makes your agent useful.';

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

function StageCopy() {
	return (
		<div className="home-hero-copy">
			<div className="home-stage-frame">
				<div className="home-stage-lead">
					<Heading className="home-stage-headline" level={2}>
						<span className="home-stage-line is-quiet">Agents are</span>
						<span className="home-stage-line is-quiet">probabilistic.</span>
						<span className="home-stage-line is-claim">Your architecture</span>
						<span className="home-stage-line is-claim">shouldn’t be.</span>
					</Heading>
					<TypedArgument text={ARGUMENT} />
				</div>
			</div>
		</div>
	);
}

/** Landing intro, then the claim and typed argument, then the examples board below. */
export function HomeStage({
	scrollRoot,
}: {
	scrollRoot: RefObject<HTMLDivElement | null>;
}) {
	return (
		<>
			<HomeIntro scrollRoot={scrollRoot} />
			<section className="home-page home-stage-page" aria-label="Theorem">
				<StageCopy />
			</section>
		</>
	);
}
