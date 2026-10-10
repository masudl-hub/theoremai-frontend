import { BENCHMARKS } from '../lib/home-benchmarks';
import { BOUNDARY_NAMES, DETECTOR_CHECKS } from '../lib/home-guardrail-checks';
import {
	StatCompare,
	StatDial,
	StatDots,
	StatMatrix,
	StatSticks,
	StatTile,
} from './stat-tiles/stat-tile';

const percent = (share: number) => String(Math.round(share * 1000) / 10);

const CHECKS = DETECTOR_CHECKS.reduce((sum, { at }) => sum + at.length, 0);
const ROWS = DETECTOR_CHECKS.map(({ detector, at }) => ({
	key: detector,
	cells: BOUNDARY_NAMES.map((boundary) => ({ key: boundary, isOn: at.includes(boundary) })),
}));

/** The costs beat's readouts, laid over the still. */
export function GoalStats() {
	const b = BENCHMARKS;
	return (
		<>
			<StatTile label="Average latency" value={String(b.latencyMessageMs)} unit="ms">
				<StatDial
					share={b.latencyMessageMs / b.compared.messageMs}
					caption={`${b.compared.name}: ${String(b.compared.messageMs)} ms`}
				/>
			</StatTile>
			<StatTile label="Large document" value={String(b.latencyDocumentMs)} unit="ms">
				<StatCompare
					ours={b.latencyDocumentMs}
					theirs={b.compared.documentMs}
					oursLabel="Theorem"
					theirsLabel={`${b.compared.name} ${String(b.compared.documentMs)} ms`}
				/>
			</StatTile>
			<StatTile label="Checks on every turn" value={String(CHECKS)}>
				<StatMatrix rows={ROWS} />
			</StatTile>
			<StatTile label="Accuracy" value={percent(b.accuracy)} unit="%">
				<StatSticks count={25} fill={Math.round(b.accuracy * 25)} />
			</StatTile>
			<StatTile label="False positives" value={percent(b.falsePositive)} unit="%">
				<StatDots count={100} fill={Math.max(1, Math.round(b.falsePositive * 100))} columns={20} />
			</StatTile>
		</>
	);
}
