/**
 * What the costs screen reads out. PLACEHOLDER VALUES: none of these is measured. Replace each
 * with the figure from a real run, and name that run, before this ships.
 */
/** Detectors across boundaries: the package's own count. */
export const BOUNDARIES_CHECKED = 170;

/** How many bars each bar tile draws. */
export const BARS = 30;

export const BENCHMARKS = {
	latencyMessageMs: 180,
	latencyDocumentMs: 950,
	dialMaxMs: 1200,
	accuracy: 0.97,
	falsePositive: 0.01,
} as const;
