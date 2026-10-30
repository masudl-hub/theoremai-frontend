/**
 * The rounded polyline a docs figure draws between its steps.
 */

export interface MapPlace {
	x: number;
	y: number;
}

/** A line through `points`, each corner turned by `radius`, or less where a run is short. */
export function mapPolyline(points: readonly MapPlace[], radius: number): string {
	const first = points.at(0);
	if (!first) return '';
	let d = `M ${String(first.x)} ${String(first.y)}`;
	points.slice(1, -1).forEach((corner, index) => {
		const before = points[index] ?? corner;
		const after = points[index + 2] ?? corner;
		const into = Math.hypot(corner.x - before.x, corner.y - before.y);
		const out = Math.hypot(after.x - corner.x, after.y - corner.y);
		const round = Math.min(radius, into / 2, out / 2);
		if (round <= 0) {
			d += ` L ${String(corner.x)} ${String(corner.y)}`;
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
		d += ` L ${String(enter.x)} ${String(enter.y)} Q ${String(corner.x)} ${String(corner.y)}, ${String(leave.x)} ${String(leave.y)}`;
	});
	const last = points[points.length - 1] ?? first;
	return points.length > 1 ? `${d} L ${String(last.x)} ${String(last.y)}` : d;
}
