import type { SVGProps } from 'react';
import { THEOREM_MARK } from './theorem-mark';

/** Theorem mark for the rail: same paths as the favicon, in the mark's own 24×24 box. */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
	const { cx, cy, r } = THEOREM_MARK.dot;
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
			<path d={THEOREM_MARK.rise} />
			<path d={THEOREM_MARK.fall} />
			<circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
		</svg>
	);
}
