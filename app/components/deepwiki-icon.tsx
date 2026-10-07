import type { SVGProps } from 'react';

/**
 * DeepWiki's mark as its site icon draws it: three nodes joined at a point. Traced to a
 * 24-unit box and filled in the current colour, like the JSR mark beside it.
 */
export function IconDeepWiki(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
			<circle cx="7" cy="6" r="3.4" />
			<circle cx="18" cy="11" r="3.4" />
			<circle cx="7" cy="18" r="3.4" />
			<path
				d="M7 6 18 11 7 18"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
