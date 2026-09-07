/** Shared timing for panel layout transitions. */
export const PLAYGROUND_PANEL_EASE_MS = 320;

export const PLAYGROUND_ORIGIN = { x: 40, y: 40 };

/** Vertical trunk line — facets branch horizontally from here. */
export const PLAYGROUND_SPINE_LINE_X = PLAYGROUND_ORIGIN.x + 16;

/** Identity hub sits above the trunk, slightly left. */
export const PLAYGROUND_IDENTITY_X = PLAYGROUND_SPINE_LINE_X - 24;

/** Spine facet cards sit to the right of the trunk line. */
export const PLAYGROUND_FACET_X = PLAYGROUND_SPINE_LINE_X + 72;

/** @deprecated Use PLAYGROUND_FACET_X */
export const PLAYGROUND_SPINE_X = PLAYGROUND_FACET_X;

/** X for the branch column immediately right of a hub. */
export function branchColumnX(hubX: number): number {
	return hubX + PLAYGROUND_COL_PX;
}

/** Position for a branch spec: one column right of hub, stacked vertically. */
export function branchSpecPosition(
	hubX: number,
	hubY: number,
	specIndex: number,
): { x: number; y: number } {
	return {
		x: branchColumnX(hubX),
		y: hubY + PLAYGROUND_BRANCH_ROW_PX * specIndex,
	};
}

/** Next branch spec slot when appending to a hub. */
export function nextBranchSpecPosition(
	hubPosition: { x: number; y: number },
	existingSpecCount: number,
): { x: number; y: number } {
	return branchSpecPosition(hubPosition.x, hubPosition.y, existingSpecCount);
}

/** Vertical position for the next child spec under a hub node. */
export function nextChildSpecY(specPositions: Array<{ y: number }>, hubY: number): number {
	const baseY = hubY + PLAYGROUND_BRANCH_ROW_PX;
	if (specPositions.length === 0) return baseY;
	const lastSpecY = Math.max(...specPositions.map((p) => p.y));
	return lastSpecY + PLAYGROUND_BRANCH_ROW_PX;
}

/** Facet node width (15rem) plus breathing room between columns. */
export const PLAYGROUND_NODE_WIDTH_PX = 240;

/** Gap between facet cards — matches the canvas background grid. */
export const PLAYGROUND_NODE_GAP_PX = 56;

export const PLAYGROUND_COL_PX = PLAYGROUND_NODE_WIDTH_PX + PLAYGROUND_NODE_GAP_PX;

/** Approximate card height plus vertical gap between spine facets. */
export const PLAYGROUND_ROW_PX = 220;

/** Compact facet card height (head + one chip row + shell padding). */
export const PLAYGROUND_NODE_HEIGHT_PX = 64;

/** Tight gap between specs stacked in a branch column. */
export const PLAYGROUND_BRANCH_GAP_PX = 8;

/** Vertical step for branch specs — much tighter than spine row spacing. */
export const PLAYGROUND_BRANCH_ROW_PX = PLAYGROUND_NODE_HEIGHT_PX + PLAYGROUND_BRANCH_GAP_PX;
