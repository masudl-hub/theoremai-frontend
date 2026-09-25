import { MediaTheme } from '@astryxdesign/core/theme';
import { type CSSProperties, type ReactNode, useEffect, useRef } from 'react';
import { useNavigation } from 'react-router';
import './hero-video.css';

export interface HeroVideoProps {
	/** Encoded video; plays through once, then holds on its last frame. */
	src: string;
	/** Still of the first frame: shown until playback starts, and in its place under reduced motion. */
	poster: string;
	children: ReactNode;
}

/**
 * Full-bleed background footage behind `children`. The dim is a plain layer in
 * this component, present on the first frame. The still is the frame's own
 * background, so an empty video never drops the picture to black.
 * Playback starts from script, and never under reduced motion, which keeps the still.
 */
export function HeroVideo({ src, poster, children }: HeroVideoProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const navigation = useNavigation();
	const still = { '--hero-still': `url("${poster}")` } as CSSProperties;

	useEffect(() => {
		const video = videoRef.current;
		if (!video || navigation.state !== 'loading') return;
		video.pause();
	}, [navigation.state]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const tryPlay = () => {
			video.play().catch(() => {});
		};
		tryPlay();
		video.addEventListener('loadeddata', tryPlay);
		video.addEventListener('canplay', tryPlay);
		return () => {
			video.removeEventListener('loadeddata', tryPlay);
			video.removeEventListener('canplay', tryPlay);
		};
	}, []);

	return (
		<div className="hero-video-frame" style={still}>
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
			<div className="hero-scrim">
				<MediaTheme mode="dark">{children}</MediaTheme>
			</div>
		</div>
	);
}
