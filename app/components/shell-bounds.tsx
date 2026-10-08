import { useEffect } from 'react';

const MAIN_ID = 'astryx-app-shell-main';
const VARS = ['top', 'right', 'bottom', 'left'] as const;

/**
 * Publishes where the shell's page sits as `--shell-top|right|bottom|left` (distance from each
 * viewport edge). Popups live in the browser's top layer, which a clip cannot reach, so shell.css
 * insets them to this box and the browser flips and shifts them inside it.
 */
export function ShellBounds() {
	useEffect(() => {
		const root = document.documentElement;
		const main = document.getElementById(MAIN_ID);
		if (!main) return;
		const measure = () => {
			const box = main.getBoundingClientRect();
			const edges = {
				top: box.top,
				right: window.innerWidth - box.right,
				bottom: window.innerHeight - box.bottom,
				left: box.left,
			};
			for (const edge of VARS)
				root.style.setProperty(`--shell-${edge}`, `${String(Math.max(0, edges[edge]))}px`);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(main);
		window.addEventListener('resize', measure);
		/* The shell moves between pages without resizing; re-measure as a popup opens. */
		document.addEventListener('beforetoggle', measure, true);
		return () => {
			observer.disconnect();
			window.removeEventListener('resize', measure);
			document.removeEventListener('beforetoggle', measure, true);
			for (const edge of VARS) root.style.removeProperty(`--shell-${edge}`);
		};
	}, []);
	return null;
}
