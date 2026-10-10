import { BENCHMARKS } from '../lib/home-benchmarks';
import { StatDots, StatRange, StatRing, StatTile } from './stat-tiles/stat-tile';

const percent = (share: number) => String(Math.round(share * 1000) / 10);

/** The costs beat's readouts, laid over the still. */
export function GoalStats() {
	const b = BENCHMARKS;
	return (
		<>
			<StatTile label="Average latency" value={String(b.latencyMessageMs)} unit="ms">
				<StatRange
					low={b.latencyMessageMs}
					high={b.latencyDocumentMs}
					lowLabel="Message"
					highLabel={`Large document ${String(b.latencyDocumentMs)} ms`}
				/>
			</StatTile>
			<StatTile label="Boundaries checked" value={String(b.boundariesChecked)}>
				<StatDots count={b.boundariesTotal} fill={b.boundariesChecked} columns={10} />
			</StatTile>
			<StatTile label="Accuracy" value={percent(b.accuracy)} unit="%">
				<StatRing share={b.accuracy} caption="across our datasets" />
			</StatTile>
			<StatTile label="False positives" value={percent(b.falsePositive)} unit="%">
				<StatDots count={100} fill={Math.max(1, Math.round(b.falsePositive * 100))} columns={20} />
			</StatTile>
		</>
	);
}
