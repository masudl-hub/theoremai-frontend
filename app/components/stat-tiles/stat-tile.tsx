import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import type { ReactNode } from 'react';
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

/** A row of rounded bars, the first `fill` of `count` solid. */
export function StatTicks({ count, fill }: { count: number; fill: number }) {
	const ticks = Array.from({ length: count }, (_, at) => at);
	return (
		<div className="stat-ticks" aria-hidden>
			{ticks.map((tick) => (
				<span key={tick} className="stat-tick" data-on={tick < fill ? '' : undefined} />
			))}
		</div>
	);
}

const DIAL = { x: 180, y: 200, radius: 190, half: 48.9 };

const onDial = (share: number) => {
	const angle = ((-DIAL.half + 2 * DIAL.half * share) * Math.PI) / 180;
	return { x: DIAL.x + DIAL.radius * Math.sin(angle), y: DIAL.y - DIAL.radius * Math.cos(angle) };
};

/**
 * A shallow dial. The track runs the whole scale. A coloured stroke runs from the start to `far`,
 * and a white one over it to `near`, each with a dot inside its end. Both are shares of the scale
 * (0 to 1).
 */
export function StatDial({ near, far, caption }: { near: number; far: number; caption: string }) {
	const begin = onDial(0);
	const end = onDial(1);
	const path = `M ${String(begin.x)} ${String(begin.y)} A ${String(DIAL.radius)} ${String(DIAL.radius)} 0 0 1 ${String(end.x)} ${String(end.y)}`;
	const nearDot = onDial(near);
	const farDot = onDial(far);
	return (
		<div className="stat-dial">
			<svg viewBox="0 0 360 100" aria-hidden>
				<path d={path} className="stat-dial-track" />
				<path
					d={path}
					className="stat-dial-far"
					pathLength={1}
					strokeDasharray={`${String(far)} 1`}
				/>
				<path
					d={path}
					className="stat-dial-near"
					pathLength={1}
					strokeDasharray={`${String(near)} 1`}
				/>
				<circle cx={farDot.x} cy={farDot.y} r="6" className="stat-dial-dot" />
				<circle cx={nearDot.x} cy={nearDot.y} r="6" className="stat-dial-dot" />
			</svg>
			<span className="stat-dial-caption">{caption}</span>
		</div>
	);
}

/** Two pills on one row, each as wide as its weight, each named underneath. The second is blue. */
export function StatPair({
	first,
	second,
}: {
	first: { weight: number; label: string };
	second: { weight: number; label: string };
}) {
	return (
		<div className="stat-pair">
			<div className="stat-pair-bars">
				<span className="stat-pair-first" style={{ flexGrow: first.weight }} />
				<span className="stat-pair-second" style={{ flexGrow: second.weight }} />
			</div>
			<div className="stat-pair-names">
				<span style={{ flexGrow: first.weight }}>{first.label}</span>
				<span style={{ flexGrow: second.weight }}>{second.label}</span>
			</div>
		</div>
	);
}
