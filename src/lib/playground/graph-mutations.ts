import { nextBranchSpecPosition } from './layout';
import { DRAG_HANDLE, type FacetData, type PlaygroundEdge, type PlaygroundNode } from './types';

export function appendChildSpecNode(
	nodes: PlaygroundNode[],
	edges: PlaygroundEdge[],
	opts: {
		parentId: string;
		idPrefix: string;
		hubPosition: { x: number; y: number };
		specs: PlaygroundNode[];
		data: FacetData;
	},
): { nodes: PlaygroundNode[]; edges: PlaygroundEdge[]; id: string } {
	const id = `${opts.idPrefix}-${crypto.randomUUID().slice(0, 8)}`;
	const position = nextBranchSpecPosition(opts.hubPosition, opts.specs);
	const nextNodes: PlaygroundNode[] = [
		...nodes,
		{
			id,
			type: 'facet',
			position,
			dragHandle: DRAG_HANDLE,
			data: opts.data,
		},
	];
	const nextEdges: PlaygroundEdge[] = [
		...edges,
		{
			id: `e-${opts.parentId}-${id}`,
			source: opts.parentId,
			target: id,
			sourceHandle: 'branch',
			targetHandle: 'in-left',
			type: 'smoothstep',
		},
	];
	const expanded = nextNodes.map((n) =>
		n.id === id
			? { ...n, zIndex: Date.now(), data: { ...n.data, expanded: true } }
			: n.data.expanded
				? { ...n, zIndex: 0, data: { ...n.data, expanded: false } }
				: { ...n, zIndex: 0 },
	);
	return { nodes: expanded, edges: nextEdges, id };
}
