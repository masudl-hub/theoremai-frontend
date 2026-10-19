import { startTransition, useEffect, useState, useSyncExternalStore } from 'react';

/** One value held outside React, for components that do not share a parent to read and set. */
export function createSharedValue<T>(initial: T) {
	let value = initial;
	const listeners = new Set<() => void>();
	const subscribe = (listener: () => void) => {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	};
	return {
		get: () => value,
		set: (next: T) => {
			if (next === value) return;
			value = next;
			for (const listener of listeners) listener();
		},
		/** The value now. The server renders the first one. */
		use: (): T =>
			useSyncExternalStore(
				subscribe,
				() => value,
				() => initial,
			),
		/**
		 * The value, rendered as a transition: React renders a change in slices between frames, so a
		 * heavy tree that follows it never holds a frame back. The server renders the first one.
		 */
		useInTransition: (): T => {
			const [shown, setShown] = useState(initial);
			useEffect(() => {
				const show = () => {
					startTransition(() => {
						setShown(value);
					});
				};
				show();
				return subscribe(show);
			}, []);
			return shown;
		},
	};
}
