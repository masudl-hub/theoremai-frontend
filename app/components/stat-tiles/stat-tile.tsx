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

const polar = (radius: number, degrees: number, centre = 50) => ({
	x: centre + radius * Math.cos((degrees * Math.PI) / 180),
	y: centre + radius * Math.sin((degrees * Math.PI) / 180),
});

const SWEEP = 270;
const START = 135;

/** An open-bottom dial: a track, a fill to `share` (0 to 1), a needle on it, and ticks around. */
export function StatDial({ share, caption }: { share: number; caption: string }) {
	const clamped = Math.min(Math.max(share, 0), 1);
	const begin = polar(38, START);
	const end = polar(38, START + SWEEP);
	const path = `M ${String(begin.x)} ${String(begin.y)} A 38 38 0 1 1 ${String(end.x)} ${String(end.y)}`;
	const tip = polar(30, START + SWEEP * clamped);
	const ticks = Array.from({ length: 11 }, (_, at) => START + (SWEEP * at) / 10);
	return (
		<div className="stat-dial">
			<svg viewBox="0 0 100 100" aria-hidden>
				{ticks.map((degrees) => {
					const from = polar(46, degrees);
					const to = polar(49, degrees);
					return (
						<line
							key={degrees}
							x1={from.x}
							y1={from.y}
							x2={to.x}
							y2={to.y}
							className="stat-dial-tick"
						/>
					);
				})}
				<path d={path} className="stat-dial-track" pathLength={1} />
				<path
					d={path}
					className="stat-dial-fill"
					pathLength={1}
					strokeDasharray={`${String(clamped)} 1`}
				/>
				<line x1="50" y1="50" x2={tip.x} y2={tip.y} className="stat-dial-needle" />
				<circle cx="50" cy="50" r="4" className="stat-dial-hub" />
			</svg>
			<span className="stat-dial-caption">{caption}</span>
		</div>
	);
}

/**
 * Rings around a centre, one per layer, innermost first. Each ring has a marker on it, with its
 * name drawn out to the right.
 */
export function StatOrbit({ layers }: { layers: readonly string[] }) {
	const step = 44 / layers.length;
	const rise = 100 / (layers.length + 1);
	return (
		<svg className="stat-orbit" viewBox="0 0 220 100" aria-hidden>
			<circle cx="50" cy="50" r="5" className="stat-orbit-core" />
			{layers.map((layer, at) => {
				const radius = 11 + step * at;
				const labelY = rise * (at + 1);
				const at2 = polar(radius, at % 2 ? 35 : -35);
				return (
					<g key={layer}>
						<circle cx="50" cy="50" r={radius} className="stat-orbit-ring" />
						<line x1={at2.x} y1={at2.y} x2="112" y2={labelY} className="stat-orbit-lead" />
						<circle cx={at2.x} cy={at2.y} r="2.6" className="stat-orbit-mark" />
						<text x="117" y={labelY} className="stat-orbit-label">
							{layer}
						</text>
					</g>
				);
			})}
		</svg>
	);
}
