import { type RefObject, useEffect, useRef } from 'react';
import { PLATFORM_TABS } from '../lib/home-platform';
import './home-morph.css';

/** A picture on the page, where it is and what it shows. */
type Picture = { element: HTMLElement; src: string };

/**
 * A picture that travels from one place on the page to another as the page scrolls. `progress`
 * runs from 0 to 1 over that scroll. At 0 the overlay is the source and at 1 it is the target, and
 * in between the source and the target are hidden behind it.
 */
type Morph = {
	from: (scroller: HTMLElement) => Picture | null;
	to: (scroller: HTMLElement) => Picture | null;
	progress: (scroller: HTMLElement) => number;
};

/** Zero while `top` is at the bottom edge of the viewport, one once it is `span` pixels up. */
function across(top: number, span: number): number {
	return Math.min(1, Math.max(0, (window.innerHeight - top) / span));
}

function pictureOf(
	element: HTMLElement | null | undefined,
	src: string | undefined,
): Picture | null {
	return element && src ? { element, src } : null;
}

/** The stage of the platform, with the still it shows at `src`. */
function platformStage(scroller: HTMLElement, src: string): Picture | null {
	return pictureOf(scroller.querySelector<HTMLElement>('.home-platform-stage'), src);
}

const MORPHS: Morph[] = [
	// The platform's last still shrinks into the first showcase card as the showcase comes up.
	{
		from: (scroller) => platformStage(scroller, PLATFORM_TABS[PLATFORM_TABS.length - 1].src),
		to: (scroller) => {
			const image = scroller.querySelector<HTMLImageElement>('.examples-card img');
			return pictureOf(image, image?.src);
		},
		progress: (scroller) => {
			const image = scroller.querySelector<HTMLElement>('.examples-card img');
			return image ? across(image.getBoundingClientRect().top, window.innerHeight * 0.6) : 0;
		},
	},
];

const STATIC_QUERY = '(width < 768px), (prefers-reduced-motion: reduce)';

/**
 * The overlay for the morph. It is fixed over the page and moves between the two pictures from the
 * scroll. Nothing is in it while the page is at rest, so the real pictures show as they always do.
 */
export function HomeMorph({ scrollRoot }: { scrollRoot: RefObject<HTMLDivElement | null> }) {
	const overlayRef = useRef<HTMLDivElement>(null);
	const fromRef = useRef<HTMLImageElement>(null);
	const toRef = useRef<HTMLImageElement>(null);

	useEffect(() => {
		const scroller = scrollRoot.current;
		const overlay = overlayRef.current;
		const fromImage = fromRef.current;
		const toImage = toRef.current;
		if (!scroller || !overlay || !fromImage || !toImage) return;

		// Every element a morph has hidden at some point, so each can be shown again.
		const touched = new Set<HTMLElement>();

		const update = () => {
			const hide = new Set<HTMLElement>();
			let shown = false;
			const still = matchMedia(STATIC_QUERY).matches;
			for (const morph of still ? [] : MORPHS) {
				const p = morph.progress(scroller);
				const from = morph.from(scroller);
				const to = morph.to(scroller);
				if (!from || !to || p <= 0 || p >= 1 || shown) continue;
				// The overlay can only carry one morph at a time, and the morphs do not overlap.
				shown = true;
				const a = from.element.getBoundingClientRect();
				const b = to.element.getBoundingClientRect();
				const mix = (x: number, y: number) => x + (y - x) * p;
				overlay.style.left = `${mix(a.left, b.left)}px`;
				overlay.style.top = `${mix(a.top, b.top)}px`;
				overlay.style.width = `${mix(a.width, b.width)}px`;
				overlay.style.height = `${mix(a.height, b.height)}px`;
				fromImage.src = from.src;
				toImage.src = to.src;
				fromImage.style.opacity = String(1 - p);
				toImage.style.opacity = String(p);
				hide.add(from.element);
				hide.add(to.element);
			}
			overlay.hidden = !shown;
			for (const element of hide) touched.add(element);
			for (const element of touched) {
				element.style.visibility = hide.has(element) ? 'hidden' : '';
			}
		};

		update();
		scroller.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		return () => {
			scroller.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
			for (const element of touched) element.style.visibility = '';
		};
	}, [scrollRoot]);

	return (
		<div ref={overlayRef} className="home-morph" aria-hidden hidden>
			<img ref={fromRef} alt="" />
			<img ref={toRef} alt="" />
		</div>
	);
}
