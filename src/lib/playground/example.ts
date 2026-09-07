import { DEMO_CONCIERGE_SYSTEM, demoToolSeeds } from './demo-example';
import { layoutPlaygroundGraph } from './graph-layout';
import { PLAYGROUND_IDENTITY_X, PLAYGROUND_ORIGIN } from './layout';
import { DRAG_HANDLE, type IdentityData, type PlaygroundEdge, type PlaygroundNode } from './types';

export { branchEdge, spineEdge } from './graph-layout';

/** Initial graph shown on playground load — only the profile box, panel open. */
export function createInitialGraph(): { nodes: PlaygroundNode[]; edges: PlaygroundEdge[] } {
	const nodes: PlaygroundNode[] = [
		{
			id: 'identity',
			type: 'facet',
			position: { x: PLAYGROUND_IDENTITY_X, y: PLAYGROUND_ORIGIN.y },
			dragHandle: DRAG_HANDLE,
			zIndex: 1,
			data: {
				kind: 'identity',
				expanded: true,
				agentId: '',
				profileType: '',
				handle: '',
				system: '',
				chat: false,
				includeTools: true,
				includeInputs: true,
				includeOutputs: true,
				includeGuardrails: true,
			},
		},
	];
	return { nodes, edges: [] };
}

/** Synchronize canvas nodes and edges to reflect the profile definition and modality. */
export function syncGraphForProfile(
	currentNodes: PlaygroundNode[],
	_currentEdges: PlaygroundEdge[],
	identity: IdentityData,
	opts?: { preservePositions?: boolean },
): { nodes: PlaygroundNode[]; edges: PlaygroundEdge[] } {
	return layoutPlaygroundGraph(currentNodes, identity, DRAG_HANDLE, opts);
}

function demoSeedNodes(): PlaygroundNode[] {
	const toolNodes: PlaygroundNode[] = demoToolSeeds().map((seed) => ({
		id: seed.id,
		type: 'facet',
		position: { x: 0, y: 0 },
		dragHandle: DRAG_HANDLE,
		data: seed.data,
	}));

	return [
		{
			id: 'models',
			type: 'facet',
			position: { x: 0, y: 0 },
			dragHandle: DRAG_HANDLE,
			data: {
				kind: 'models',
				expanded: false,
				protocol: 'openAi',
				provider: 'openrouter',
				thinking: 'minimal',
				maxSteps: 8,
				thinkingControl: false,
				key: '',
			},
		},
		{
			id: 'tools',
			type: 'facet',
			position: { x: 0, y: 0 },
			dragHandle: DRAG_HANDLE,
			data: {
				kind: 'tools',
				expanded: false,
				t2Loader: 'discover_tools',
			},
		},
		{
			id: 'guardrails',
			type: 'facet',
			position: { x: 0, y: 0 },
			dragHandle: DRAG_HANDLE,
			data: {
				kind: 'guardrails',
				expanded: false,
				canary: true,
				sanitizeInput: true,
				redactSensitive: true,
				quotaEnabled: false,
				perDay: 100,
				egressMode: 'default',
				onBlock: 'refuse_to_user',
				egressMaxRetries: 2,
				allowedHosts:
					'api.open-meteo.com, geocoding-api.open-meteo.com, api.frankfurter.app, pokeapi.co, catfact.ninja, official-joke-api.appspot.com',
			},
		},
		...toolNodes,
	];
}

/** Starter graph — travel concierge demo with live HTTP APIs and T2 tool discovery. */
export function createExampleGraph(): { nodes: PlaygroundNode[]; edges: PlaygroundEdge[] } {
	const initial = createInitialGraph();
	const identity: IdentityData = {
		...(initial.nodes[0].data as IdentityData),
		profileType: 'text',
		agentId: 'travel.concierge',
		handle: 'concierge',
		system: DEMO_CONCIERGE_SYSTEM,
		chat: true,
	};

	const nodes: PlaygroundNode[] = [{ ...initial.nodes[0], data: identity }, ...demoSeedNodes()];

	return syncGraphForProfile(nodes, [], identity);
}

/** Blank graph with profile node ready for user input. */
export function createBlankGraph(): { nodes: PlaygroundNode[]; edges: PlaygroundEdge[] } {
	return createInitialGraph();
}
