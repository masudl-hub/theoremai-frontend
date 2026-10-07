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
			"The home page opens on a full-bleed shell panel: the favicon mark draws, then the title card with playground and docs links, package links, a copyable npm install line, the lowercase theorem wordmark, and the tagline 'Typed, composable agents for text, image, speech, and live voice — guarded on every turn.' A scroll snaps to the claim — the panel contracts to the rail on the way. On the left: 'Agents are probabilistic.' then 'Your architecture shouldn’t be.', and the line about an experience people can understand and trust, built around a clear agent contract, types itself out. On the right, three goals. Each is a square still with a large icon on it — One source of truth over a single river in an orange canyon, Room to experiment over drying saffron plots, Built-in boundaries over obsidian shores — and the title and note sit beside the square. Another scroll snaps to the agents showcase.",
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
