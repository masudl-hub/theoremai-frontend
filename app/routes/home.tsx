import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ContributeBoard } from '../components/contribute/board';
import { ChapterContext } from '../components/docs/body';
import { ExamplesBoard } from '../components/examples/board';
import { HomePlatform } from '../components/home-platform';
import { scrollTopOf } from '../components/home-scroll-stops';
import { HomeStage } from '../components/home-stage';
import { HomeStudioStop } from '../components/home-studio-stop';
import { PageJsonLd } from '../components/page-summary';
import '../components/home-scroll.css';
import { homeTerms } from '../lib/.server/home-terms';
import { SITE_REDIRECTS } from '../lib/docs/articles/chapters';
import {
	HOME_DESCRIPTION,
	homeJsonLd,
	KERNEL,
	SHOWCASE_SHOWN,
	SITE_NAME,
} from '../lib/home-content';
import { type GoalId, isGoalId } from '../lib/home-goals';
import { isPlatformId, PLATFORM_SHOWN, type PlatformId } from '../lib/home-platform';
import { GOALS, HOME_TAGLINE } from '../lib/site-pitch';
import type { Route } from './+types/home';
export function loader({ request }: Route.LoaderArgs) {
	return { origin: new URL(request.url).origin, terms: homeTerms() };
}

/** The origin never changes while the page is open. A refetch would count as a pending navigation, which hides the page. */
export function shouldRevalidate() {
	return false;
}

export function meta({ loaderData }: Route.MetaArgs) {
	const origin = loaderData.origin;
	const image = `${origin}${GOALS[0].src}`;
	return [
		{ title: `${SITE_NAME} · ${HOME_TAGLINE}` },
		{ name: 'description', content: HOME_DESCRIPTION },
		{ name: 'keywords', content: KERNEL.keywords.join(', ') },
		{ tagName: 'link', rel: 'canonical', href: origin },
		{ tagName: 'link', rel: 'alternate', type: 'text/plain', href: `${origin}/llms.txt` },
		{ property: 'og:type', content: 'website' },
		{ property: 'og:site_name', content: SITE_NAME },
		{ property: 'og:url', content: origin },
		{ property: 'og:title', content: `${SITE_NAME} · ${HOME_TAGLINE}` },
		{ property: 'og:description', content: HOME_DESCRIPTION },
		{ property: 'og:image', content: image },
		{ property: 'og:image:alt', content: GOALS[0].alt },
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:title', content: `${SITE_NAME} · ${HOME_TAGLINE}` },
		{ name: 'twitter:description', content: HOME_DESCRIPTION },
		{ name: 'twitter:image', content: image },
	];
}

export const handle = { homeImmersive: true };

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

type LandingScreen = 'landing' | 'overview' | GoalId | PlatformId | 'showcase' | 'contribute';

/** `#examples` is the previous showcase id. An empty hash is landing. */
function landingScreen(hash: string): LandingScreen | null {
	const id = decodeURIComponent(hash.replace(/^#/, ''));
	if (id === '' || id === 'landing') return 'landing';
	if (id === 'overview') return 'overview';
	if (id === 'source-of-truth') return 'experience';
	if (isGoalId(id)) return id;
	if (isPlatformId(id)) return PLATFORM_SHOWN ? id : null;
	if (id === 'showcase' || id === 'examples') return SHOWCASE_SHOWN ? 'showcase' : 'contribute';
	if (id === 'contribute') return 'contribute';
	return null;
}

function hashFor(screen: LandingScreen): string {
	if (screen === 'landing') return '';
	return `#${screen}`;
}

/** The stops of the screens that pass `isScreen`, where they are laid out. A phone and reduced motion have none. */
function stopsOf<S extends LandingScreen>(
	scroller: HTMLElement,
	isScreen: (id: string) => id is S,
): { screen: S; stop: HTMLElement }[] {
	const out: { screen: S; stop: HTMLElement }[] = [];
	for (const stop of scroller.querySelectorAll<HTMLElement>('[data-home-stop]')) {
		const screen = stop.dataset.homeStop ?? '';
		if (isScreen(screen) && stop.offsetHeight > 0) out.push({ screen, stop });
	}
	return out;
}

/** Snap offsets for the screens. Overview uses the settle band, and a goal has a stop for each beat. */
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
		...[
			...stopsOf(scroller, isGoalId),
			...(PLATFORM_SHOWN ? stopsOf(scroller, isPlatformId) : []),
		].map(({ screen, stop }) => ({ screen, at: scrollTopOf(scroller, stop) })),
		...(showcase ? [{ screen: 'showcase' as const, at: showcase.offsetTop }] : []),
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
 * and stacks the section, which is then the right target. A goal's snap point is the
 * stop of its first beat. Where the stops are not laid out, its block in the page is the
 * target, and overview where the block is not shown either.
 */
function scrollToLandingScreen(scroller: HTMLElement, screen: LandingScreen) {
	if (screen === 'landing') {
		scroller.scrollTo({ top: 0 });
		return;
	}
	if (isGoalId(screen)) {
		const first = stopsOf(scroller, isGoalId).find((stop) => stop.screen === screen);
		if (first) {
			first.stop.scrollIntoView({ block: 'start' });
			return;
		}
		const block = scroller.querySelector<HTMLElement>(`#${screen}`);
		if (block && block.offsetHeight > 0) {
			block.scrollIntoView({ block: 'start' });
			return;
		}
	}
	if (isPlatformId(screen)) {
		stopsOf(scroller, isPlatformId)
			.find((stop) => stop.screen === screen)
			?.stop.scrollIntoView({ block: 'start' });
		return;
	}
	if (screen === 'overview' || isGoalId(screen)) {
		const settle = scroller.querySelector<HTMLElement>('.home-contract-settle');
		if (settle && getComputedStyle(settle).display !== 'none') {
			settle.scrollIntoView({ block: 'start' });
			return;
		}
	}
	scroller.querySelector<HTMLElement>(`#${screen}`)?.scrollIntoView({ block: 'start' });
}

/**
 * Landing (/), then overview (/overview), the goals, showcase (/examples) while it is shown, and
 * contribute (/contribute). Scrolling on from contribute opens the studio (/studio).
 */
export default function Home({ loaderData }: Route.ComponentProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const chapter = useMemo(
		() => ({ terms: loaderData.terms, seeds: new Map<string, string>() }),
		[loaderData.terms],
	);
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
			<PageJsonLd data={homeJsonLd(loaderData.origin)} />
			<RetiredHashRedirect />
			<ChapterContext.Provider value={chapter}>
				<HomeStage scrollRoot={scrollRef} />
			</ChapterContext.Provider>
			{PLATFORM_SHOWN ? <HomePlatform scrollRoot={scrollRef} /> : null}
			<div className="home-dotted" data-pages={SHOWCASE_SHOWN ? 2 : 1}>
				{SHOWCASE_SHOWN ? (
					<section className="home-page" id="showcase" aria-label="Showcase">
						<ExamplesBoard />
					</section>
				) : null}
				<section className="home-page" id="contribute" aria-label="Contribute">
					<ContributeBoard />
				</section>
			</div>
			<HomeStudioStop scrollRoot={scrollRef} />
		</div>
	);
}
