import { type RefObject, useEffect, useState } from 'react';

/**
 * Whether the landing page opened on a screen `isScreen` names, with the loading mark still up.
 * Its pieces then load at once and hold the mark, so the screen is whole when the mark gives way.
 * Read in an effect: the hash is not on the server.
 */
export function openedOn(isScreen: (id: string) => boolean): boolean {
	if (!document.documentElement.hasAttribute('data-boot-pending')) return false;
	return isScreen(decodeURIComponent(window.location.hash.replace(/^#/, '')));
}

/** Whether every box has drawn something: a piece that renders nothing until it is ready has not. */
export function useDrawn(boxes: readonly RefObject<HTMLElement | null>[]): boolean {
	const [isDrawn, setIsDrawn] = useState(false);
	useEffect(() => {
		const shown = boxes.map((box) => box.current).filter((box) => box !== null);
		const check = () => {
			if (shown.every((box) => box.firstElementChild !== null)) setIsDrawn(true);
		};
		const observer = new MutationObserver(check);
		for (const box of shown) observer.observe(box, { childList: true });
		check();
		return () => {
			observer.disconnect();
		};
	}, [boxes]);
	return isDrawn;
}
