import { type RefObject, useEffect, useRef, useState } from 'react';
import { PrefetchPageLinks, useNavigate } from 'react-router';
import { leaveWithShell } from './shell-motion';

/** How far from the stop, in px, still counts as resting on it. */
const REST_PX = 4;

/**
 * The stop after contribute. Contribute holds still over it, and when the scroll comes to rest
 * here the site moves on to the studio as the rail's link does: contribute fades out, the shell
 * takes the studio's shape, and the studio fades in. The studio's code is fetched once contribute
 * is reached, so the move rarely waits on it.
 */
export function HomeStudioStop({ scrollRoot }: { scrollRoot: RefObject<HTMLElement | null> }) {
	const ref = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();
	const [near, setNear] = useState(false);
	useEffect(() => {
		const scroller = scrollRoot.current;
		const stop = ref.current;
		if (!scroller || !stop) return;
		let leaving = false;
		const onScrollEnd = () => {
			const ahead = stop.offsetTop - scroller.scrollTop;
			if (ahead <= scroller.clientHeight + REST_PX) setNear(true);
			if (leaving || Math.abs(ahead) > REST_PX) return;
			leaving = true;
			leaveWithShell('/', window.location.hash, () => {
				void navigate('/studio');
			});
		};
		scroller.addEventListener('scrollend', onScrollEnd);
		return () => {
			scroller.removeEventListener('scrollend', onScrollEnd);
		};
	}, [navigate, scrollRoot]);
	return (
		<>
			<div ref={ref} className="home-page home-studio-stop" aria-hidden="true" />
			{near ? <PrefetchPageLinks page="/studio" /> : null}
		</>
	);
}
