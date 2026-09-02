import { PLAYGROUND_COL_PX, PLAYGROUND_ORIGIN, PLAYGROUND_ROW_PX } from './layout';
import { OPENROUTER_PLAYGROUND_API_ID } from './playground-policy';
import {
	DRAG_HANDLE,
	defaultModelSpec,
	defaultToolSpec,
	type PlaygroundEdge,
	type PlaygroundNode,
} from './types';

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

/** Starter graph — sales.agent with modelSpec + toolSpec children. */
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
				t2Loader: '',
			},
		},
		{
			id: 'tool-lookup-crm',
			type: 'facet',
			position: {
				x: PLAYGROUND_ORIGIN.x + PLAYGROUND_COL_PX,
				y: PLAYGROUND_ORIGIN.y + PLAYGROUND_ROW_PX * 2,
			},
			dragHandle: DRAG_HANDLE,
			data: defaultToolSpec({
				toolName: 'lookup_crm',
				description: 'Look up a CRM contact by email or id.',
				loadTier: 'T0',
			}),
		},
		{
			id: 'tool-draft-quote',
			type: 'facet',
			position: {
				x: PLAYGROUND_ORIGIN.x + PLAYGROUND_COL_PX,
				y: PLAYGROUND_ORIGIN.y + PLAYGROUND_ROW_PX * 3 - 40,
			},
			dragHandle: DRAG_HANDLE,
			data: defaultToolSpec({
				toolName: 'draft_quote',
				description: 'Draft a quote from qualified lead fields.',
				loadTier: 'T0',
				inputJson: `{
  "type": "object",
  "properties": {
    "accountId": { "type": "string" },
    "sku": { "type": "string" }
  },
  "required": ["accountId"]
}`,
				outputJson: `{
  "type": "object",
  "properties": {
    "quoteId": { "type": "string" },
    "total": { "type": "number" }
  },
  "required": ["quoteId", "total"]
}`,
			}),
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
				imageMaxInputImages: 3,
				imageIncludeText: false,
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
		edge('tools', 'tool-lookup-crm'),
		edge('tools', 'tool-draft-quote'),
	];

	return { nodes, edges };
}

export function createBlankGraph(): { nodes: PlaygroundNode[]; edges: PlaygroundEdge[] } {
	const { nodes, edges } = createExampleGraph();
	return {
		edges: edges.filter((e) => !e.target.startsWith('tool-')),
		nodes: nodes
			.filter((n) => n.data.kind !== 'toolSpec')
			.map((n) => {
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
					return { ...n, data: { ...n.data, expanded: false, t2Loader: '' } };
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
							imageIncludeText: false,
							speechEnabled: false,
							resumeEnabled: false,
						},
					};
				}
				return { ...n, data: { ...n.data, expanded: false } };
			}),
	};
}
