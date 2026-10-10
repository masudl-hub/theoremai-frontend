/**
 * How many boundaries each built-in detector reads at when a profile sets no `guardrails.detect`:
 * the boundaries where its default action is not `ignore`. A test holds this to the package.
 */
export const DEFAULT_READS: readonly { detector: string; count: number }[] = [
	{ detector: 'ids', count: 22 },
	{ detector: 'financial', count: 22 },
	{ detector: 'network', count: 22 },
	{ detector: 'credentials', count: 22 },
	{ detector: 'injection', count: 18 },
	{ detector: 'tool_instructions', count: 6 },
	{ detector: 'canary_leak', count: 8 },
	{ detector: 'prompt_leak', count: 8 },
	{ detector: 'marker_leak', count: 4 },
	{ detector: 'ungiven_images', count: 4 },
	{ detector: 'ungiven_links', count: 0 },
	{ detector: 'tool_leak', count: 4 },
];

/** How many boundaries there are. */
export const BOUNDARY_TOTAL = 26;

/** Every detector at every boundary it reads at, with nothing set. */
export const CHECKS_BY_DEFAULT = DEFAULT_READS.reduce((sum, { count }) => sum + count, 0);
