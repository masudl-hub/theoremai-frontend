import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ExamplesBoard } from '../components/examples/board';
import { HomeStage } from '../components/home-stage';
import '../components/home-scroll.css';
import { SITE_REDIRECTS } from '../lib/docs/articles/chapters';
import type { Th30PageHandle } from '../lib/th30-page';
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
	homeImmersive: true,
	th30Page: () => ({
		title: 'Home',
		summary:
			"The home page opens on a full-bleed shell panel: the favicon mark draws, then the title card with playground and docs links, package links, a copyable npm install line, the lowercase theorem wordmark, and the tagline 'Typed, composable agents for text, image, speech, and live voice — guarded on every turn.' Scrolling contracts the panel to reveal the rail; those links move into their sidenav slots. The wordmark scrolls away into the claim — 'Agents are probabilistic.' then 'Your architecture shouldn’t be.' — and the open-source TypeScript agent builder line types itself out. The agents showcase is the next page.",
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

/** Landing: the hero scrolls away, then the centred stage, then the agents showcase. */
export default function Home() {
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
			<HomeStage scrollRoot={scrollRef} />
			<section className="home-page" id="examples" aria-label="Examples">
				<ExamplesBoard />
			</section>
		</div>
	);
}
