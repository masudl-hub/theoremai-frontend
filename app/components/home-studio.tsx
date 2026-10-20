import { lazy, type RefObject, Suspense, useEffect, useRef, useState } from 'react';

const HomeStudioScreen = lazy(() =>
	import('./home-studio-screen').then(({ HomeStudioScreen }) => ({ default: HomeStudioScreen })),
);

/**
 * The last landing screen: the studio itself. Its code loads once the screen before it is in
 * view, so the rest of the page never waits on it.
 */
export function HomeStudio({ scrollRoot }: { scrollRoot: RefObject<HTMLElement | null> }) {
	const ref = useRef<HTMLElement>(null);
	const [near, setNear] = useState(false);
	useEffect(() => {
		const section = ref.current;
		if (!section || near) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) setNear(true);
			},
			{ root: scrollRoot.current, rootMargin: '100% 0px' },
		);
		observer.observe(section);
		return () => {
			observer.disconnect();
		};
	}, [near, scrollRoot]);
	return (
		<section className="home-page home-studio" id="studio" aria-label="Studio" ref={ref}>
			{near ? (
				<Suspense fallback={null}>
					<HomeStudioScreen />
				</Suspense>
			) : null}
		</section>
	);
}
