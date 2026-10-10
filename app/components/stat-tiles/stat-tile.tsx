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

/** A row of ticks, the first `fill` of `count` drawn solid. */
export function StatTicks({ count, fill }: { count: number; fill: number }) {
	const style = { '--ticks': count, '--ticks-on': fill } as CSSProperties;
	return (
		<div className="stat-ticks" style={style} aria-hidden>
			<span className="stat-ticks-on" />
		</div>
	);
}
