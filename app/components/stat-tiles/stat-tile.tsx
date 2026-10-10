import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import type { CSSProperties, ReactNode } from 'react';
import './stat-tile.css';

/**
 * A readout: a label, one large value, and a small drawing of it. Built from Astryx's Card and
 * Text, with no app code in it, so it can move into Astryx as it is.
 */
export function StatTile({
	label,
	value,
	unit,
	children,
}: {
	label: string;
	value: string;
	unit?: string;
	children?: ReactNode;
}) {
	return (
		<Card variant="glass" padding={0} elevation="med" className="stat-tile">
			<div className="stat-tile-read">
				<Text size="sm" color="secondary">
					{label}
				</Text>
				<span className="stat-tile-value">
					{value}
					{unit ? <span className="stat-tile-unit">{unit}</span> : null}
				</span>
			</div>
			{children ? <div className="stat-tile-draw">{children}</div> : null}
		</Card>
	);
}

const polar = (radius: number, degrees: number) => ({
	x: 50 + radius * Math.cos((degrees * Math.PI) / 180),
	y: 50 + radius * Math.sin((degrees * Math.PI) / 180),
});

/** An open-bottom dial: a thick track, filled to `share` (0 to 1). Nothing else on it. */
export function StatDial({ share, caption }: { share: number; caption: string }) {
	const clamped = Math.min(Math.max(share, 0), 1);
	const begin = polar(38, 135);
	const end = polar(38, 405);
	const path = `M ${String(begin.x)} ${String(begin.y)} A 38 38 0 1 1 ${String(end.x)} ${String(end.y)}`;
	return (
		<div className="stat-dial">
			<svg viewBox="0 0 100 100" aria-hidden>
				<path d={path} className="stat-dial-track" pathLength={1} />
				<path
					d={path}
					className="stat-dial-fill"
					pathLength={1}
					strokeDasharray={`${String(clamped)} 1`}
				/>
			</svg>
			<span className="stat-dial-caption">{caption}</span>
		</div>
	);
}

/** Two bars on one scale: ours, then the one we are compared to. */
export function StatCompare({
	ours,
	theirs,
	oursLabel,
	theirsLabel,
}: {
	ours: number;
	theirs: number;
	oursLabel: string;
	theirsLabel: string;
}) {
	const scale = Math.max(ours, theirs);
	return (
		<div className="stat-compare">
			<span
				className="stat-compare-bar"
				data-ours=""
				style={{ width: `${String((ours / scale) * 100)}%` }}
			>
				{oursLabel}
			</span>
			<span className="stat-compare-bar" style={{ width: `${String((theirs / scale) * 100)}%` }}>
				{theirsLabel}
			</span>
		</div>
	);
}

/** Upright sticks, the first `fill` of `count` solid. */
export function StatSticks({ count, fill }: { count: number; fill: number }) {
	const style = { '--sticks': count, '--sticks-on': fill } as CSSProperties;
	return (
		<div className="stat-sticks" style={style} aria-hidden>
			<span className="stat-sticks-on" />
		</div>
	);
}

/** A grid of dots: one row for each name, lit where its cells are on. */
export function StatMatrix({
	rows,
}: {
	rows: readonly { key: string; cells: readonly { key: string; isOn: boolean }[] }[];
}) {
	const style = { '--matrix-columns': rows[0]?.cells.length ?? 0 } as CSSProperties;
	return (
		<div className="stat-matrix" style={style} aria-hidden>
			{rows.flatMap((row) =>
				row.cells.map((cell) => (
					<span
						key={`${row.key}:${cell.key}`}
						className="stat-matrix-dot"
						data-on={cell.isOn ? '' : undefined}
					/>
				)),
			)}
		</div>
	);
}

/** A field of dots, the first `fill` of `count` solid. With a few filled, it shows how rare they are. */
export function StatDots({
	count,
	fill,
	columns,
}: {
	count: number;
	fill: number;
	columns: number;
}) {
	const dots = Array.from({ length: count }, (_, at) => at);
	const style = { '--dot-columns': columns } as CSSProperties;
	return (
		<div className="stat-dots" style={style} aria-hidden>
			{dots.map((dot) => (
				<span key={dot} className="stat-dot" data-on={dot < fill ? '' : undefined} />
			))}
		</div>
	);
}
