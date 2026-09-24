import { Overlay } from '@astryxdesign/core/Overlay';
import { type ReactNode, useEffect, useRef } from 'react';
import './hero-video.css';

export interface HeroVideoProps {
	/** Encoded video; plays through once, then holds on its last frame. */
	src: string;
	/** Still of the first frame: shown until playback starts, and in its place under reduced motion. */
	poster: string;
	children: ReactNode;
}

/**
 * Full-bleed background footage behind `children`, which sit on Astryx's dark
 * overlay scrim so they read on the footage in either mode.
 * Playback starts from script, and never under reduced motion, which keeps the still poster.
 */
export function HeroVideo({ src, poster, children }: HeroVideoProps) {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		// Autoplay can still be refused (e.g. data saver); the poster stays up.
		video.play().catch(() => {});
	}, []);

	return (
		<Overlay className="hero-video-frame" content={children} align="start">
			<video
				ref={videoRef}
				className="hero-video"
				src={src}
				poster={poster}
				muted
				playsInline
				preload="auto"
				aria-hidden
			/>
		</Overlay>
	);
}
