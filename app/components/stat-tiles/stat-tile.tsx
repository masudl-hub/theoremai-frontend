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

/** Two ends of a range on one bar: the first fades up into the second. */
export function StatRange({
	low,
	high,
	lowLabel,
	highLabel,
}: {
	low: number;
	high: number;
	lowLabel: string;
	highLabel: string;
}) {
	const share = Math.min(Math.max(low / high, 0.05), 1) * 100;
	return (
		<div className="stat-range">
			<div className="stat-range-bars">
				<span className="stat-range-fade" style={{ width: `${String(share)}%` }} />
				<span className="stat-range-rest" />
			</div>
			<div className="stat-range-ends">
				<span>{lowLabel}</span>
				<span>{highLabel}</span>
			</div>
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

/** A ring filled to `share` (0 to 1), with a caption beneath. */
export function StatRing({ share, caption }: { share: number; caption: string }) {
	const clamped = Math.min(Math.max(share, 0), 1);
	return (
		<div className="stat-ring">
			<svg viewBox="0 0 100 100" aria-hidden>
				<circle cx="50" cy="50" r="40" className="stat-ring-track" />
				<circle
					cx="50"
					cy="50"
					r="40"
					className="stat-ring-fill"
					pathLength={1}
					strokeDasharray={`${String(clamped)} 1`}
				/>
			</svg>
			<span className="stat-ring-caption">{caption}</span>
		</div>
	);
}
