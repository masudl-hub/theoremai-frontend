/**
 * What the costs screen reads out. PLACEHOLDER VALUES: none of these is measured, and the
 * comparison names no real product. Replace each with the figure from a real run, and name that
 * run and the product, before this ships.
 */
export const BENCHMARKS = {
	latencyMessageMs: 180,
	latencyDocumentMs: 950,
	accuracy: 0.97,
	falsePositive: 0.01,
	compared: { name: 'A larger provider', messageMs: 400, documentMs: 2100 },
} as const;
