import { BARS, BENCHMARKS } from '../lib/home-benchmarks';
import { BOUNDARY_TOTAL, CHECKS_BY_DEFAULT, DEFAULT_READS } from '../lib/home-guardrail-checks';
import { StatDial, StatNote, StatPair, StatTicks, StatTile } from './stat-tiles/stat-tile';

const percent = (share: number) => String(Math.round(share * 1000) / 10);

/** The costs beat's readouts, laid over the still. */
export function GoalStats() {
	const b = BENCHMARKS;
	return (
		<>
			<StatTile label="Average latency" value={String(b.latencyMessageMs)} unit="ms">
				<StatDial
					near={b.latencyMessageMs / b.dialMaxMs}
					far={b.latencyDocumentMs / b.dialMaxMs}
					caption={`Message ${String(b.latencyMessageMs)} ms, document ${String(b.latencyDocumentMs)} ms`}
				/>
			</StatTile>
			<StatTile label="Accuracy" value={percent(b.accuracy)} unit="%">
				<StatTicks count={BARS} fill={Math.round(b.accuracy * BARS)} />
			</StatTile>
			<StatTile label="Checks run by default" value={String(CHECKS_BY_DEFAULT)}>
				<StatPair
					first={{
						weight: DEFAULT_READS.length,
						label: `${String(DEFAULT_READS.length)} detectors`,
					}}
					second={{ weight: BOUNDARY_TOTAL, label: `${String(BOUNDARY_TOTAL)} boundaries` }}
				/>
			</StatTile>
			<StatTile label="False positives" value={percent(b.falsePositive)} unit="%">
				<StatTicks count={BARS} fill={Math.max(1, Math.round(b.falsePositive * BARS))} />
			</StatTile>
			<StatNote
				value="0, 1, reason"
				title="Deterministic by design"
				text="Patterns you can inspect and modify"
			/>
		</>
	);
}
