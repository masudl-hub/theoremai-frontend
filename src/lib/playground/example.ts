import { PLAYGROUND_COL_PX, PLAYGROUND_ORIGIN, PLAYGROUND_ROW_PX } from './layout';
import { OPENROUTER_PLAYGROUND_API_ID } from './playground-policy';
import { DRAG_HANDLE, defaultModelSpec, type PlaygroundEdge, type PlaygroundNode } from './types';

function edge(source: string, target: string): PlaygroundEdge {
	return {
		id: `e-${source}-${target}`,
		source,
		target,
		sourceHandle: 'out',
		targetHandle: 'in',
		type: 'smoothstep',
	};
}

/** Starter graph — sales.agent with one modelSpec child. */
export function createExampleGraph(): { nodes: PlaygroundNode[]; edges: PlaygroundEdge[] } {
	const nodes: PlaygroundNode[] = [
		{
			id: 'identity',
			type: 'facet',
			position: { x: PLAYGROUND_ORIGIN.x + PLAYGROUND_COL_PX * 2, y: PLAYGROUND_ORIGIN.y },
			dragHandle: DRAG_HANDLE,
			data: {
				kind: 'identity',
				expanded: false,
				agentId: 'sales.agent',
				handle: 'sales',
				system: 'Qualify leads. Never invent pricing.',
				chat: false,
			},
		},
		{
			id: 'models',
			type: 'facet',
			position: { x: PLAYGROUND_ORIGIN.x, y: PLAYGROUND_ORIGIN.y + PLAYGROUND_ROW_PX },
			dragHandle: DRAG_HANDLE,
			data: {
				kind: 'models',
				expanded: false,
				protocol: 'openAi',
				provider: 'openrouter',
				thinking: 'minimal',
				maxSteps: 1,
				thinkingControl: false,
				key: '',
			},
		},
		{
			id: 'model-fast',
			type: 'facet',
			position: { x: PLAYGROUND_ORIGIN.x, y: PLAYGROUND_ORIGIN.y + PLAYGROUND_ROW_PX * 2 },
			dragHandle: DRAG_HANDLE,
			data: defaultModelSpec({
				modelId: 'fast',
				apiId: OPENROUTER_PLAYGROUND_API_ID,
				selectLabel: 'fast',
			}),
		},
		{
			id: 'tools',
			type: 'facet',
			position: {
				x: PLAYGROUND_ORIGIN.x + PLAYGROUND_COL_PX,
				y: PLAYGROUND_ORIGIN.y + PLAYGROUND_ROW_PX,
			},
			dragHandle: DRAG_HANDLE,
			data: {
				kind: 'tools',
				expanded: false,
				allow: 'lookup_crm, draft_quote',
			},
		},
		{
			id: 'inputs',
			type: 'facet',
			position: {
				x: PLAYGROUND_ORIGIN.x + PLAYGROUND_COL_PX * 2,
				y: PLAYGROUND_ORIGIN.y + PLAYGROUND_ROW_PX,
			},
			dragHandle: DRAG_HANDLE,
			data: {
				kind: 'inputs',
				expanded: false,
				text: true,
				attachmentsAccept: [],
				voiceAccept: [],
				maxFiles: 0,
				maxBytes: 0,
				maxTurnBytes: 0,
			},
		},
		{
			id: 'outputs',
			type: 'facet',
			position: {
				x: PLAYGROUND_ORIGIN.x + PLAYGROUND_COL_PX * 3,
				y: PLAYGROUND_ORIGIN.y + PLAYGROUND_ROW_PX,
			},
			dragHandle: DRAG_HANDLE,
			data: {
				kind: 'outputs',
				expanded: false,
				mode: 'text',
				schemaId: '',
				schemaEnforced: 'responseFormat',
				schemaJson: '',
				streamMode: 'sse',
				streamThoughts: false,
				gateMedia: false,
				validationEnabled: false,
				maxRetries: 2,
				repairGuidance: '',
				imageEnabled: false,
				imageAspectRatio: '1:1',
				imageSize: '1K',
				imageMimeType: 'image/png',
				imageAllowsGrounding: true,
				imageMaxInputImages: 3,
				speechEnabled: false,
				speechVoice: '',
				speechFormat: 'pcm',
				resumeEnabled: false,
				allowContinue: ['length', 'stream_incomplete', 'provider_error'],
				autoContinue: ['length', 'stream_incomplete'],
			},
		},
		{
			id: 'guardrails',
			type: 'facet',
			position: {
				x: PLAYGROUND_ORIGIN.x + PLAYGROUND_COL_PX * 4,
				y: PLAYGROUND_ORIGIN.y + PLAYGROUND_ROW_PX,
			},
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
			},
		},
	];

	const edges: PlaygroundEdge[] = [
		edge('identity', 'models'),
		edge('identity', 'tools'),
		edge('identity', 'inputs'),
		edge('identity', 'outputs'),
		edge('identity', 'guardrails'),
		edge('models', 'model-fast'),
	];

	return { nodes, edges };
}

export function createBlankGraph(): { nodes: PlaygroundNode[]; edges: PlaygroundEdge[] } {
	const { nodes, edges } = createExampleGraph();
	return {
		edges: edges.map((e) => ({ ...e })),
		nodes: nodes.map((n) => {
			if (n.data.kind === 'identity') {
				return {
					...n,
					data: {
						...n.data,
						expanded: true,
						agentId: '',
						handle: '',
						system: '',
						chat: false,
					},
				};
			}
			if (n.data.kind === 'modelSpec') {
				return {
					...n,
					data: defaultModelSpec({
						modelId: 'fast',
						apiId: OPENROUTER_PLAYGROUND_API_ID,
						selectLabel: 'fast',
					}),
				};
			}
			if (n.data.kind === 'tools') {
				return { ...n, data: { ...n.data, allow: '', expanded: false } };
			}
			if (n.data.kind === 'outputs') {
				return {
					...n,
					data: {
						...n.data,
						expanded: false,
						mode: 'text',
						schemaId: '',
						schemaJson: '',
						validationEnabled: false,
						imageEnabled: false,
						speechEnabled: false,
						resumeEnabled: false,
					},
				};
			}
			return { ...n, data: { ...n.data, expanded: false } };
		}),
	};
}
