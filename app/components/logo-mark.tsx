import type { SVGProps } from 'react';

/** Placeholder Theorem mark: an italic math x with a superscript dot (𝑥˙). */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 24 24"
			width="1em"
			height="1em"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			aria-hidden
			{...props}
		>
			<path d="M4.5 18.5c2 0 3-1.2 4.2-3.4l2.6-5c1-1.9 2.1-3.1 4.2-3.1" />
			<path d="M5.5 8.2c1.6-.9 3.2-.4 3.8 1.6l2.3 6.6c.6 1.7 2.1 2.4 3.9 1.7" />
			<circle cx="19.5" cy="4.5" r="1.6" fill="currentColor" stroke="none" />
		</svg>
	);
}
