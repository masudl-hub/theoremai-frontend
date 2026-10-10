/**
 * What the costs screen reads out. PLACEHOLDER VALUES: none of these is measured. Replace each
 * with the figure from a real run, and name that run, before this ships.
 */
export const BENCHMARKS = {
	latencyMessageMs: 180,
	latencyDocumentMs: 950,
	accuracy: 0.97,
	falsePositive: 0.01,
} as const;

/** The places text crosses in one turn, in order. These are the boundaries of the guardrails docs. */
export const BOUNDARIES = ['To the model', 'Tool call', 'Tool result', 'To the person'] as const;
