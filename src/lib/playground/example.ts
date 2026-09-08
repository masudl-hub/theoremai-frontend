import {
	DEMO_ALLOWED_HOSTS,
	DEMO_CONCIERGE_SYSTEM,
	demoInputsSeed,
	demoToolSeeds,
} from './demo-example';
import { layoutPlaygroundGraph } from './graph-layout';
import { PLAYGROUND_IDENTITY_X, PLAYGROUND_ORIGIN } from './layout';
import {
	GEMINI_PLAYGROUND_DEFAULT_API_ID,
	OPENROUTER_PLAYGROUND_API_ID,
} from './playground-policy';
import {
	DRAG_HANDLE,
	defaultModelBinding,
	type IdentityData,
	type PlaygroundEdge,
	type PlaygroundNode,
} from './types';

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

function demoModelBindingNodes(): PlaygroundNode[] {
	return [
		{
			id: 'model-fast',
			type: 'facet',
			position: { x: 0, y: 0 },
			dragHandle: DRAG_HANDLE,
			data: defaultModelBinding({
				modelId: 'fast',
				protocol: 'geminiInteractions',
				provider: 'google',
				apiId: GEMINI_PLAYGROUND_DEFAULT_API_ID,
				efforts: { fast: 'minimal', deep: 'high' },
				defaultEffort: 'fast',
				allowEffortSelect: true,
				summaries: true,
			}),
		},
		{
			id: 'model-smart',
			type: 'facet',
			position: { x: 0, y: 0 },
			dragHandle: DRAG_HANDLE,
			data: defaultModelBinding({
				modelId: 'smart',
				protocol: 'geminiInteractions',
				provider: 'google',
				apiId: 'gemini-3.5-flash-lite',
				efforts: { normal: 'low', deep: 'high' },
				defaultEffort: 'normal',
				allowEffortSelect: true,
				summaries: true,
			}),
		},
		{
			id: 'model-open',
			type: 'facet',
			position: { x: 0, y: 0 },
			dragHandle: DRAG_HANDLE,
			data: defaultModelBinding({
				modelId: 'open',
				protocol: 'openAi',
				provider: 'openrouter',
				apiId: OPENROUTER_PLAYGROUND_API_ID,
				efforts: { default: 'minimal' },
				defaultEffort: 'default',
				allowEffortSelect: false,
			}),
		},
	];
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
			id: 'inputs',
			type: 'facet',
			position: { x: 0, y: 0 },
			dragHandle: DRAG_HANDLE,
			data: demoInputsSeed(),
		},
		{
			id: 'models',
			type: 'facet',
			position: { x: 0, y: 0 },
			dragHandle: DRAG_HANDLE,
			data: {
				kind: 'models',
				expanded: false,
				branchCollapsed: false,
				defaultModel: 'fast',
				allowModelSelect: true,
				maxSteps: 12,
				key: 'slotA',
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
				branchCollapsed: false,
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
				allowedHosts: DEMO_ALLOWED_HOSTS,
			},
		},
		...demoModelBindingNodes(),
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
