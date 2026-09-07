import { estimateFacetNodeHeight } from './facet-ui.ts';
import { PLAYGROUND_NODE_WIDTH_PX } from './layout.ts';
import type { PlaygroundNode } from './types.ts';

/** Only separate when boxes overlap by more than this many pixels on both axes. */
const MIN_OVERLAP_PX = 24;

function nodeSize(node: PlaygroundNode): { w: number; h: number } {
	return {
		w: PLAYGROUND_NODE_WIDTH_PX,
		h: estimateFacetNodeHeight(node.data),
	};
}

function overlapAmount(a: PlaygroundNode, b: PlaygroundNode): { x: number; y: number } {
	const aSize = nodeSize(a);
	const bSize = nodeSize(b);
	const overlapX =
		Math.min(a.position.x + aSize.w, b.position.x + bSize.w) - Math.max(a.position.x, b.position.x);
	const overlapY =
		Math.min(a.position.y + aSize.h, b.position.y + bSize.h) - Math.max(a.position.y, b.position.y);
	return { x: overlapX, y: overlapY };
}

function separatePair(a: PlaygroundNode, b: PlaygroundNode): boolean {
	const { x: overlapX, y: overlapY } = overlapAmount(a, b);
	if (overlapX < MIN_OVERLAP_PX || overlapY < MIN_OVERLAP_PX) return false;

	if (overlapX <= overlapY) {
		if (b.position.x >= a.position.x) {
			b.position.x += overlapX;
		} else {
			b.position.x -= overlapX;
		}
	} else if (b.position.y >= a.position.y) {
		b.position.y += overlapY;
	} else {
		b.position.y -= overlapY;
	}

	return true;
}

/** Nudge only when cards are genuinely stacked — not when layout places them close. */
export function resolveNodeCollisions(nodes: PlaygroundNode[]): PlaygroundNode[] {
	const next = nodes.map((n) => ({ ...n, position: { ...n.position } }));

	for (let iter = 0; iter < 4; iter++) {
		let moved = false;
		for (let i = 0; i < next.length; i++) {
			for (let j = i + 1; j < next.length; j++) {
				if (separatePair(next[i], next[j])) moved = true;
			}
		}
		if (!moved) break;
	}

	return next;
}
