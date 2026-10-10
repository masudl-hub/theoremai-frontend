/**
 * How many boundaries each built-in detector reads at, as the kernel's `DETECTOR_BOUNDARIES` has
 * them. A test holds this to the package, so the total on the costs screen is the package's own.
 */
export const DETECTOR_BOUNDARY_COUNTS: readonly { detector: string; count: number }[] = [
	{ detector: 'ids', count: 26 },
	{ detector: 'financial', count: 26 },
	{ detector: 'network', count: 26 },
	{ detector: 'credentials', count: 26 },
	{ detector: 'injection', count: 26 },
	{ detector: 'tool_instructions', count: 8 },
	{ detector: 'canary_leak', count: 8 },
	{ detector: 'prompt_leak', count: 8 },
	{ detector: 'marker_leak', count: 4 },
	{ detector: 'ungiven_images', count: 4 },
	{ detector: 'ungiven_links', count: 4 },
	{ detector: 'tool_leak', count: 4 },
];

/** The boundaries there are: the detectors that read at all of them have this count. */
export const BOUNDARY_TOTAL = 26;

/** Every check: each detector at each boundary it reads at. */
export const BOUNDARIES_CHECKED = DETECTOR_BOUNDARY_COUNTS.reduce(
	(sum, { count }) => sum + count,
	0,
);
