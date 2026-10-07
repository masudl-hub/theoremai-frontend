import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ContributeBoard } from '../components/contribute/board';
import { ExamplesBoard } from '../components/examples/board';
import { HomeStage } from '../components/home-stage';
import '../components/home-scroll.css';
import { SITE_REDIRECTS } from '../lib/docs/articles/chapters';
import type { Th30PageHandle } from '../lib/th30-page';
export function meta() {
	return [
		{ title: 'theorem' },
		{
			name: 'description',
			content: 'A TypeScript kernel for typed agent profiles and deterministic turns.',
		},
	];
}

export const handle = {
	homeImmersive: true,
	th30Page: () => ({
		title: 'Home',
		summary:
			"Landing (/) opens on a full-bleed shell panel: the favicon mark draws, then the title card with playground and docs links, package links, a copyable npm install line, the lowercase theorem wordmark, and the tagline 'Typed, composable agents for text, image, speech, and live voice — guarded on every turn.' A scroll snaps to overview (/overview) — the panel contracts to the rail on the way. On the left: 'Agents are probabilistic.' then 'Your architecture shouldn’t be.', and 'Agent outputs vary every turn. Users still need an experience they can understand and trust. theorem helps you build that experience around a clear agent contract.' On the right, three goals. Each is a square still with a large icon on it — One source of truth over a single river in an orange canyon, Room to experiment over drying saffron plots, Built-in boundaries over obsidian shores — and the title and note sit beside the square. Another scroll snaps to showcase (/examples), and a last one to contribute (/contribute): the showcase's dotted field carries on, fading out, behind 'Contribute to the theory', with four tiles, each a link: Raise an issue (a bug or an idea), Contribute code (the repo's CONTRIBUTING guide), Join the Discord, and Report a vulnerability (privately, not in a public issue).",
	}),
} satisfies Th30PageHandle & { homeImmersive: true };

function RetiredHashRedirect() {
	const { hash, pathname } = useLocation();
	const navigate = useNavigate();
	useEffect(() => {
		if (pathname !== '/') return;
		const from = `/${hash}`;
		const hit = SITE_REDIRECTS.find((redirect) => redirect.from === from);
		if (hit) void navigate(hit.to, { replace: true });
	}, [hash, navigate, pathname]);
	return null;
}

type LandingScreen = 'landing' | 'overview' | 'showcase' | 'contribute';

/** `#examples` is the previous showcase id. An empty hash is landing. */
function landingScreen(hash: string): LandingScreen | null {
	const id = decodeURIComponent(hash.replace(/^#/, ''));
	if (id === '' || id === 'landing') return 'landing';
	if (id === 'overview') return 'overview';
	if (id === 'showcase' || id === 'examples') return 'showcase';
	if (id === 'contribute') return 'contribute';
	return null;
}

function hashFor(screen: LandingScreen): string {
	if (screen === 'landing') return '';
	return `#${screen}`;
}

/** Snap offsets for the four screens. Overview uses the settle band. */
function screenStops(scroller: HTMLElement): { screen: LandingScreen; at: number }[] {
	const settle = scroller.querySelector<HTMLElement>('.home-contract-settle');
	const overview = scroller.querySelector<HTMLElement>('#overview');
	const showcase = scroller.querySelector<HTMLElement>('#showcase');
	const contribute = scroller.querySelector<HTMLElement>('#contribute');
	const overviewAt =
		settle && getComputedStyle(settle).display !== 'none'
			? settle.offsetTop
			: (overview?.offsetTop ?? 0);
	return [
		{ screen: 'landing', at: 0 },
		{ screen: 'overview', at: overviewAt },
		{ screen: 'showcase', at: showcase?.offsetTop ?? overviewAt },
		{ screen: 'contribute', at: contribute?.offsetTop ?? showcase?.offsetTop ?? overviewAt },
	];
}

function nearestStop(scroller: HTMLElement): { screen: LandingScreen; distance: number } | null {
	const top = scroller.scrollTop;
	const stops = screenStops(scroller);
	if (stops.length === 0) return null;
	let best = stops[0];
	for (const stop of stops) {
		if (Math.abs(top - stop.at) < Math.abs(top - best.at)) best = stop;
	}
	return { screen: best.screen, distance: Math.abs(top - best.at) };
}

/** The screen this scroll position has settled on, or null while it is still moving. */
function screenAtRest(scroller: HTMLElement): LandingScreen | null {
	const nearest = nearestStop(scroller);
	if (!nearest || nearest.distance > 4) return null;
	return nearest.screen;
}

/**
 * Overview’s snap point is the settle band. The named section sits in the sticky
 * frame, so scrolling to it would stay on landing. Reduced motion hides that band
 * and stacks the section, which is then the right target.
 */
function scrollToLandingScreen(scroller: HTMLElement, screen: LandingScreen) {
	if (screen === 'landing') {
		scroller.scrollTo({ top: 0 });
		return;
	}
	if (screen === 'overview') {
		const settle = scroller.querySelector<HTMLElement>('.home-contract-settle');
		if (settle && getComputedStyle(settle).display !== 'none') {
			settle.scrollIntoView({ block: 'start' });
			return;
		}
	}
	scroller.querySelector<HTMLElement>(`#${screen}`)?.scrollIntoView({ block: 'start' });
}

/** Landing (/), then overview (/overview), showcase (/examples) and contribute (/contribute). */
export default function Home() {
	const scrollRef = useRef<HTMLDivElement>(null);
	const { hash, pathname } = useLocation();
	const navigate = useNavigate();
	const suppressUrl = useRef(false);

	useEffect(() => {
		const scroller = scrollRef.current;
		if (!scroller) return;
		const screen = landingScreen(hash);
		if (screen) {
			if (screenAtRest(scroller) === screen) return;
			suppressUrl.current = true;
			scrollToLandingScreen(scroller, screen);
			suppressUrl.current = false;
			return;
		}
		const id = decodeURIComponent(hash.replace(/^#/, ''));
		if (!id) return;
		scroller.querySelector<HTMLElement>(`#${CSS.escape(id)}`)?.scrollIntoView({ block: 'start' });
	}, [hash]);

	useEffect(() => {
		const scroller = scrollRef.current;
		if (!scroller || pathname !== '/') return;
		const syncUrl = (settled: boolean) => {
			if (suppressUrl.current) return;
			const screen = settled ? nearestStop(scroller)?.screen : screenAtRest(scroller);
			if (!screen) return;
			const next = hashFor(screen);
			if (window.location.hash === next) return;
			void navigate(next === '' ? '/' : { pathname: '/', hash: next }, {
				replace: true,
				preventScrollReset: true,
			});
		};
		const onScroll = () => {
			syncUrl(false);
		};
		const onScrollEnd = () => {
			syncUrl(true);
		};
		scroller.addEventListener('scroll', onScroll, { passive: true });
		scroller.addEventListener('scrollend', onScrollEnd);
		return () => {
			scroller.removeEventListener('scroll', onScroll);
			scroller.removeEventListener('scrollend', onScrollEnd);
		};
	}, [navigate, pathname]);

	return (
		<div className="home-scroll" ref={scrollRef}>
			<RetiredHashRedirect />
			<HomeStage scrollRoot={scrollRef} />
			<div className="home-dotted">
				<section className="home-page" id="showcase" aria-label="Showcase">
					<ExamplesBoard />
				</section>
				<section className="home-page" id="contribute" aria-label="Contribute">
					<ContributeBoard />
				</section>
			</div>
		</div>
	);
}
