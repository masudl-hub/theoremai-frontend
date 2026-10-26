/**
 * Exact curve and rail geometry engine adapted from `@theoremjs/studio/map-line.ts`.
 *
 * Provides Bézier spline and orthogonal rail generation for Astryx documentation diagrams.
 */

export interface MapPlace {
	x: number;
	y: number;
}

export interface MapCurve {
	d: string;
	/** The point `t` of the way along, from 0 to 1. */
	at(t: number): MapPlace;
}

/**
 * The line every map draws between two nodes: level as it leaves and as it arrives, turning at
 * `via`, which is halfway between them unless specified.
 */
export function mapCurve(from: MapPlace, to: MapPlace, via = (from.x + to.x) / 2): MapCurve {
	return {
		d: `M ${from.x} ${from.y} C ${via} ${from.y}, ${via} ${to.y}, ${to.x} ${to.y}`,
		at(t) {
			const u = 1 - t;
			return {
				x: u * u * u * from.x + 3 * u * t * via + t * t * t * to.x,
				y: (u * u * u + 3 * u * u * t) * from.y + (3 * u * t * t + t * t * t) * to.y,
			};
		},
	};
}

/**
 * A line that runs level from `from` to `rail`, straight up or down it, and level to `to`, its two
 * corners rounded by `radius`. Lines that share an end and a rail are one line along both.
 */
export function mapRail(from: MapPlace, to: MapPlace, rail: number, radius: number): MapCurve {
	const lead = Math.abs(rail - from.x);
	const rise = Math.abs(to.y - from.y);
	const tail = Math.abs(to.x - rail);
	const length = lead + rise + tail;
	const along = Math.sign(to.x - from.x) || 1;
	const up = Math.sign(to.y - from.y) || 1;
	const round = Math.min(radius, rise / 2, lead, tail);
	const corners =
		` L ${rail - along * round} ${from.y} Q ${rail} ${from.y}, ${rail} ${from.y + up * round}` +
		` L ${rail} ${to.y - up * round} Q ${rail} ${to.y}, ${rail + along * round} ${to.y}`;
	return {
		d: `M ${from.x} ${from.y}${round > 0 ? corners : ''} L ${to.x} ${to.y}`,
		at(t) {
			const run = t * length;
			if (run < lead) return { x: from.x + along * run, y: from.y };
			if (run > lead + rise) return { x: to.x - along * (length - run), y: to.y };
			return { x: rail, y: from.y + up * (run - lead) };
		},
	};
}

/**
 * A line between two places in one column: level out from `from` to `rail`, right of them both,
 * up or down it, and level back to `to`, its two corners rounded by `radius`.
 */
export function mapBracket(from: MapPlace, to: MapPlace, rail: number, radius: number): string {
	const up = Math.sign(to.y - from.y) || 1;
	const round = Math.max(
		0,
		Math.min(radius, Math.abs(to.y - from.y) / 2, rail - from.x, rail - to.x),
	);
	return (
		`M ${from.x} ${from.y} L ${rail - round} ${from.y} Q ${rail} ${from.y}, ${rail} ${from.y + up * round}` +
		` L ${rail} ${to.y - up * round} Q ${rail} ${to.y}, ${rail - round} ${to.y} L ${to.x} ${to.y}`
	);
}

/** A line through `points`, each corner turned by `radius`, or less where a run is short. */
export function mapPolyline(points: readonly MapPlace[], radius: number): string {
	const first = points[0];
	if (!first) return '';
	let d = `M ${first.x} ${first.y}`;
	points.slice(1, -1).forEach((corner, index) => {
		const before = points[index] ?? corner;
		const after = points[index + 2] ?? corner;
		const into = Math.hypot(corner.x - before.x, corner.y - before.y);
		const out = Math.hypot(after.x - corner.x, after.y - corner.y);
		const round = Math.min(radius, into / 2, out / 2);
		if (round <= 0) {
			d += ` L ${corner.x} ${corner.y}`;
			return;
		}
		const enter = {
			x: corner.x - ((corner.x - before.x) / into) * round,
			y: corner.y - ((corner.y - before.y) / into) * round,
		};
		const leave = {
			x: corner.x + ((after.x - corner.x) / out) * round,
			y: corner.y + ((after.y - corner.y) / out) * round,
		};
		d += ` L ${enter.x} ${enter.y} Q ${corner.x} ${corner.y}, ${leave.x} ${leave.y}`;
	});
	const last = points[points.length - 1] ?? first;
	return points.length > 1 ? `${d} L ${last.x} ${last.y}` : d;
}
