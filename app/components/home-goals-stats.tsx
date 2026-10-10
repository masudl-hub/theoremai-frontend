import { BENCHMARKS } from '../lib/home-benchmarks';
import { StatRange, StatTicks, StatTile } from './stat-tiles/stat-tile';

const percent = (share: number) => String(Math.round(share * 1000) / 10);

/** The costs beat's readouts, laid over the still. */
export function GoalStats() {
	const b = BENCHMARKS;
	return (
		<>
			<StatTile label="Accuracy" value={percent(b.accuracy)} unit="%">
				<StatTicks count={10} fill={Math.floor(b.accuracy * 10)} />
			</StatTile>
			<StatTile label="Average latency" value={String(b.latencyMessageMs)} unit="ms">
				<StatRange
					low={b.latencyMessageMs}
					high={b.latencyDocumentMs}
					lowLabel="Message"
					highLabel={`Large document ${String(b.latencyDocumentMs)} ms`}
				/>
			</StatTile>
			<StatTile label="Boundaries checked" value={String(b.boundariesChecked)}>
				<StatTicks count={b.boundariesTotal} fill={b.boundariesChecked} />
			</StatTile>
			<StatTile label="False positives" value={percent(b.falsePositive)} unit="%">
				<StatTicks count={100} fill={Math.max(1, Math.round(b.falsePositive * 100))} />
			</StatTile>
		</>
	);
}
