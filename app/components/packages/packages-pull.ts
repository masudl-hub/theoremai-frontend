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

/** The agents map's reveal, from 0 closed to 1 open. */
export type PackagesReveal = Pick<PackagesPull, 'get' | 'subscribe'>;

/** How long the agents map takes to open whole: the card grows, then the map draws out from its agent. */
const REVEAL_MS = 6400;
/** How long it takes to close whole, faster: the way back is not something to watch. */
const CLOSE_MS = 900;

/**
 * The agents map's reveal, on a clock of its own: the pull says which way the scroll is headed, and
 * the reveal goes there at an even pace, so a fast snap does not rush it. Turned back, it goes back
 * from where it is. With reduced motion it is where the scroll is headed at once.
 */
export function createPackagesReveal(pull: PackagesPull): PackagesReveal {
	let reveal = pull.get();
	let target = reveal;
	let last = reveal;
	let from = reveal;
	let start = 0;
	let frame = 0;
	const listeners = new Set<() => void>();
	const show = (next: number) => {
		reveal = next;
		for (const listener of listeners) listener();
	};
	const step = (now: number) => {
		const span = Math.abs(target - from) * (target > from ? REVEAL_MS : CLOSE_MS);
		const at = span === 0 ? 1 : Math.min(1, (now - start) / span);
		show(from + (target - from) * at);
		frame = at < 1 ? requestAnimationFrame(step) : 0;
	};
	const head = (next: number) => {
		if (next === target) return;
		target = next;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
			cancelAnimationFrame(frame);
			frame = 0;
			show(target);
			return;
		}
		from = reveal;
		start = performance.now();
		if (frame === 0) frame = requestAnimationFrame(step);
	};
	pull.subscribe(() => {
		const now = pull.get();
		// why: The scroll comes to rest on a stop, so the way it moves says which.
		if (now === 1 || now > last) head(1);
		else if (now === 0 || now < last) head(0);
		last = now;
	});
	return {
		get: () => reveal,
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
