/** Shared timing for panel layout transitions. */
export const PLAYGROUND_PANEL_EASE_MS = 320;

/** Vertical position for the next child spec under a hub node. */
export function nextChildSpecY(specPositions: Array<{ y: number }>, hubY: number): number {
	const baseY = hubY + PLAYGROUND_ROW_PX;
	if (specPositions.length === 0) return baseY;
	const lastSpecY = Math.max(...specPositions.map((p) => p.y));
	return lastSpecY + PLAYGROUND_ROW_PX - 40;
}

/** Facet node width (15rem) plus breathing room between columns. */
export const PLAYGROUND_NODE_WIDTH_PX = 240;

/** Gap between facet cards — matches the canvas background grid. */
export const PLAYGROUND_NODE_GAP_PX = 56;

export const PLAYGROUND_COL_PX = PLAYGROUND_NODE_WIDTH_PX + PLAYGROUND_NODE_GAP_PX;

/** Approximate card height plus vertical gap. */
export const PLAYGROUND_ROW_PX = 220;

export const PLAYGROUND_ORIGIN = { x: 40, y: 40 };
