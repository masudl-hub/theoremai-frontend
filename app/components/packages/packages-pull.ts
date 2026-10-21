/** The packages run's pull, from 0 on the packages to 1 on agents, for a tile that follows it frame by frame. */
export interface PackagesPull {
	get: () => number;
	subscribe: (listener: () => void) => () => void;
	set: (pull: number) => void;
}

export function createPackagesPull(): PackagesPull {
	let pull = 0;
	const listeners = new Set<() => void>();
	return {
		get: () => pull,
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		set: (next) => {
			if (next === pull) return;
			pull = next;
			for (const listener of listeners) listener();
		},
	};
}
