import { estimateFacetNodeHeight } from './facet-ui.ts';
import type { FacetData } from './types.ts';

/** Fraction of workspace width used by the facet panel when open. */
export const PLAYGROUND_PANEL_WIDTH_RATIO = 1 / 3;

export const PLAYGROUND_ORIGIN = { x: 40, y: 40 };

/** Vertical trunk line — facets branch horizontally from here. */
export const PLAYGROUND_SPINE_LINE_X = PLAYGROUND_ORIGIN.x + 16;

/** Identity hub sits above the trunk, slightly left. */
export const PLAYGROUND_IDENTITY_X = PLAYGROUND_SPINE_LINE_X - 24;

/** Canvas viewport anchor — identity hub top-left on load / graph reset. */
export const PLAYGROUND_VIEW_ANCHOR = {
	x: PLAYGROUND_IDENTITY_X,
	y: PLAYGROUND_ORIGIN.y,
};

/** Padding from the flow pane edge to the anchor point. */
export const PLAYGROUND_VIEW_PADDING = { x: 40, y: 40 };

export const PLAYGROUND_VIEW_ZOOM = 1;

export type PlaygroundViewport = { x: number; y: number; zoom: number };

/** Viewport that places the graph origin (identity) near the top-left of the pane. */
export function playgroundViewportForAnchor(
	zoom = PLAYGROUND_VIEW_ZOOM,
	padding = PLAYGROUND_VIEW_PADDING,
): PlaygroundViewport {
	return {
		x: padding.x - PLAYGROUND_VIEW_ANCHOR.x * zoom,
		y: padding.y - PLAYGROUND_VIEW_ANCHOR.y * zoom,
		zoom,
	};
}

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

/** Stack a branch spec below prior siblings using measured facet height. */
export function stackBranchSpecPosition(
	hubX: number,
	hubY: number,
	priorSpecs: ReadonlyArray<{ data: FacetData; position: { y: number } }>,
): { x: number; y: number } {
	const x = branchColumnX(hubX);
	if (priorSpecs.length === 0) return { x, y: hubY };
	const last = priorSpecs[priorSpecs.length - 1];
	const lastHeight = estimateFacetNodeHeight(last.data);
	return { x, y: last.position.y + lastHeight + PLAYGROUND_BRANCH_GAP_PX };
}

/** Next branch spec slot when appending to a hub. */
export function nextBranchSpecPosition(
	hubPosition: { x: number; y: number },
	existingSpecs: ReadonlyArray<{ data: FacetData; position: { y: number } }>,
): { x: number; y: number } {
	return stackBranchSpecPosition(hubPosition.x, hubPosition.y, existingSpecs);
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

/** Vertical step for branch specs when height is unknown. */
export const PLAYGROUND_BRANCH_ROW_PX = PLAYGROUND_NODE_HEIGHT_PX + PLAYGROUND_BRANCH_GAP_PX;
