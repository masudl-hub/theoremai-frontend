import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ExamplesBoard } from '../components/examples/board';
import { HomeStage } from '../components/home-stage';
import '../components/home-scroll.css';
import { getKernelPackageVersion } from '../lib/.server/theoremai';
import { SITE_REDIRECTS } from '../lib/docs/articles/chapters';
import type { Th30PageHandle } from '../lib/th30-page';
import type { Route } from './+types/home';

export function meta() {
	return [
		{ title: 'THEOREM' },
		{
			name: 'description',
			content: 'A TypeScript kernel for typed agent profiles and deterministic turns.',
		},
	];
}

export const handle = {
	th30Page: () => ({
		title: 'Home',
		summary:
			"The home page opens on the Theorem wordmark over a valley video, with the package version and the line 'Typed, composable agents for text, image, speech, and live voice — guarded on every turn.' Scrolling contracts that valley footage into the Built-in boundaries still, uncovering the screen underneath, and the wordmark fades as the frame settles. What it uncovers is a split. On the left: 'Agents are probabilistic.' in a lighter weight, then 'Your architecture shouldn’t be.' in bold, with shouldn’t underlined, and the description of Theorem as an open-source TypeScript agent builder types itself out, one character at a time, then stays. On the right, three stills stacked. Each shows an icon and a title — Predictable structure over drying saffron plots, Less plumbing over a single river in an orange canyon, Built-in boundaries over that same valley — and the longer note for that idea appears when the still is hovered or focused. The agents showcase is the next page. The rail still opens the playground and the docs as their own pages.",
	}),
} satisfies Th30PageHandle;

export function loader() {
	return { version: getKernelPackageVersion() };
}

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

/** Landing: the hero scrolls away, then the centred stage, then the agents showcase. */
export default function Home({ loaderData }: Route.ComponentProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const { hash } = useLocation();

	useEffect(() => {
		const id = decodeURIComponent(hash.replace(/^#/, ''));
		const scroller = scrollRef.current;
		if (!id || !scroller) return;
		scroller.querySelector<HTMLElement>(`#${CSS.escape(id)}`)?.scrollIntoView({ block: 'start' });
	}, [hash]);

	return (
		<div className="home-scroll" ref={scrollRef}>
			<RetiredHashRedirect />
			<HomeStage version={loaderData.version} />
			<section className="home-page" id="examples" aria-label="Examples">
				<ExamplesBoard />
			</section>
		</div>
	);
}
