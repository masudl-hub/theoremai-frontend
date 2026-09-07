import { PLAYGROUND_COL_PX, PLAYGROUND_ORIGIN, PLAYGROUND_ROW_PX } from './layout';
import { OPENROUTER_PLAYGROUND_API_ID } from './playground-policy';
import {
	DRAG_HANDLE,
	defaultImageSpec,
	defaultLiveSpec,
	defaultModelSpec,
	defaultSpeechSpec,
	defaultToolSpec,
	type FacetData,
	type IdentityData,
	type ModelSpecData,
	type PlaygroundEdge,
	type PlaygroundNode,
	type ToolSpecData,
} from './types';

export function edge(source: string, target: string): PlaygroundEdge {
	return {
		id: `e-${source}-${target}`,
		source,
		target,
		sourceHandle: 'out',
		targetHandle: 'in',
		type: 'smoothstep',
	};
}

/** Initial graph shown on playground load — only the profile box, panel open. */
export function createInitialGraph(): { nodes: PlaygroundNode[]; edges: PlaygroundEdge[] } {
	const nodes: PlaygroundNode[] = [
		{
			id: 'identity',
			type: 'facet',
			position: { x: PLAYGROUND_ORIGIN.x + PLAYGROUND_COL_PX * 2, y: PLAYGROUND_ORIGIN.y },
			dragHandle: DRAG_HANDLE,
			zIndex: 1,
			data: {
				kind: 'identity',
				expanded: true,
				agentId: 'sales.agent',
				profileType: '',
				handle: 'sales',
				system: 'Qualify leads. Never invent pricing.',
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
): { nodes: PlaygroundNode[]; edges: PlaygroundEdge[] } {
	const type = identity.profileType;

	// If no type is selected yet, show only the profile node
	if (!type) {
		const identityNode: PlaygroundNode = {
			id: 'identity',
			type: 'facet',
			position: { x: PLAYGROUND_ORIGIN.x + PLAYGROUND_COL_PX * 2, y: PLAYGROUND_ORIGIN.y },
			dragHandle: DRAG_HANDLE,
			zIndex: 1,
			data: { ...identity, expanded: true },
		};
		return { nodes: [identityNode], edges: [] };
	}

	// Determine active Row 1 column kinds based on type and toggles
	const cols: Array<
		'models' | 'image' | 'speech' | 'live' | 'tools' | 'inputs' | 'outputs' | 'guardrails'
	> = [];

	cols.push('models');

	if (type === 'image') {
		cols.push('image');
	} else if (type === 'speech') {
		cols.push('speech');
	} else if (type === 'live') {
		cols.push('live');
	}

	if (type !== 'speech' && identity.includeTools !== false) {
		cols.push('tools');
	}

	if (type !== 'speech' && type !== 'live' && identity.includeInputs !== false) {
		cols.push('inputs');
	}

	if (type !== 'live' && identity.includeOutputs !== false) {
		cols.push('outputs');
	}

	if (identity.includeGuardrails !== false) {
		cols.push('guardrails');
	}

	const findNode = (id: string) => currentNodes.find((n) => n.id === id);

	const nodes: PlaygroundNode[] = [];
	const edges: PlaygroundEdge[] = [];

	// Centered Profile Node at Row 0
	const centerX = PLAYGROUND_ORIGIN.x + Math.max(0, (cols.length - 1) / 2) * PLAYGROUND_COL_PX;
	nodes.push({
		id: 'identity',
		type: 'facet',
		position: { x: centerX, y: PLAYGROUND_ORIGIN.y },
		dragHandle: DRAG_HANDLE,
		zIndex: 1,
		data: { ...identity, expanded: true },
	});

	// Place each column node in Row 1
	cols.forEach((colKind, idx) => {
		const colX = PLAYGROUND_ORIGIN.x + idx * PLAYGROUND_COL_PX;
		const colY = PLAYGROUND_ORIGIN.y + PLAYGROUND_ROW_PX;
		const nodeId = colKind;

		let data: FacetData;
		const existing = findNode(nodeId);

		if (existing && existing.data.kind === colKind) {
			if (existing.data.kind === 'models') {
				// Reconcile protocol/provider/key when switching to/from live
				const targetProtocol = type === 'live' ? 'geminiLive' : 'openAi';
				const targetProvider = type === 'live' ? 'google' : 'openrouter';
				const existingModels = existing.data;
				const protocolMatch =
					type === 'live'
						? existingModels.protocol === 'geminiLive'
						: existingModels.protocol !== 'geminiLive';
				data = protocolMatch
					? { ...existingModels, expanded: false }
					: {
							...existingModels,
							expanded: false,
							protocol: targetProtocol,
							provider: targetProvider,
							key: type === 'live' ? 'slotA' : '',
						};
			} else if (existing.data.kind === 'live') {
				data = { ...defaultLiveSpec(), ...existing.data, expanded: false };
			} else if (existing.data.kind === 'image') {
				data = { ...defaultImageSpec(), ...existing.data, expanded: false };
			} else if (existing.data.kind === 'speech') {
				data = { ...defaultSpeechSpec(), ...existing.data, expanded: false };
			} else {
				data = { ...existing.data, expanded: false };
			}
		} else {
			switch (colKind) {
				case 'models':
					data = {
						kind: 'models',
						expanded: false,
						protocol: type === 'live' ? 'geminiLive' : 'openAi',
						provider: type === 'live' ? 'google' : 'openrouter',
						thinking: 'minimal',
						maxSteps: 1,
						thinkingControl: false,
						key: type === 'live' ? 'slotA' : '',
					};
					break;
				case 'image':
					data = defaultImageSpec();
					break;
				case 'speech':
					data = defaultSpeechSpec();
					break;
				case 'live':
					data = defaultLiveSpec();
					break;
				case 'tools':
					data = {
						kind: 'tools',
						expanded: false,
						t2Loader: '',
					};
					break;
				case 'inputs':
					data = {
						kind: 'inputs',
						expanded: false,
						text: true,
						attachmentsAccept: type === 'image' ? ['image/png', 'image/jpeg'] : [],
						voiceAccept: [],
						maxFiles: type === 'image' ? 3 : 0,
						maxBytes: 0,
						maxTurnBytes: 0,
					};
					break;
				case 'outputs':
					data = {
						kind: 'outputs',
						expanded: false,
						mode: 'text',
						schemaId: '',
						schemaEnforced: 'responseFormat',
						schemaJson: '',
						streamMode: 'sse',
						streamThoughts: false,
						validationEnabled: false,
						maxRetries: 2,
						repairGuidance: '',
						imageEnabled: type === 'image',
						imageAspectRatio: '1:1',
						imageSize: '1K',
						imageMimeType: 'image/png',
						imageMaxInputImages: 3,
						imageIncludeText: false,
						speechEnabled: type === 'speech',
						speechVoice: '',
						speechFormat: 'pcm',
						resumeEnabled: false,
						allowContinue: ['length', 'stream_incomplete', 'provider_error'],
						autoContinue: ['length', 'stream_incomplete'],
					};
					break;
				case 'guardrails':
					data = {
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
					};
					break;
			}
		}

		nodes.push({
			id: nodeId,
			type: 'facet',
			position: { x: colX, y: colY },
			dragHandle: DRAG_HANDLE,
			data,
		});

		edges.push(edge('identity', nodeId));

		// Models child specs in Row 2+
		if (colKind === 'models') {
			const existingSpecs = currentNodes.filter(
				(n): n is PlaygroundNode & { data: ModelSpecData } => n.data.kind === 'modelSpec',
			);
			const needsModelSwap =
				(type === 'live' &&
					existingSpecs.some((s) => s.data.apiId !== 'gemini-3.1-flash-live-preview')) ||
				(type !== 'live' &&
					existingSpecs.some((s) => s.data.apiId === 'gemini-3.1-flash-live-preview'));

			const specsToUse =
				existingSpecs.length && !needsModelSwap
					? existingSpecs
					: [
							{
								id: type === 'live' ? 'model-live' : 'model-fast',
								type: 'facet' as const,
								position: { x: colX, y: colY + PLAYGROUND_ROW_PX },
								dragHandle: DRAG_HANDLE,
								data: defaultModelSpec({
									modelId: type === 'live' ? 'live' : 'fast',
									apiId:
										type === 'live'
											? 'gemini-3.1-flash-live-preview'
											: OPENROUTER_PLAYGROUND_API_ID,
									selectLabel: type === 'live' ? 'live' : 'fast',
								}),
							},
						];

			specsToUse.forEach((specNode, sIdx) => {
				const specId = specNode.id;
				nodes.push({
					...specNode,
					position: { x: colX, y: colY + PLAYGROUND_ROW_PX * (sIdx + 1) },
					data: { ...specNode.data, expanded: false },
				});
				edges.push(edge('models', specId));
			});
		}

		// Tools child specs in Row 2+
		if (colKind === 'tools') {
			const existingTools = currentNodes.filter(
				(n): n is PlaygroundNode & { data: ToolSpecData } => n.data.kind === 'toolSpec',
			);
			const toolsToUse = existingTools.length
				? existingTools
				: [
						{
							id: 'tool-lookup-crm',
							type: 'facet' as const,
							position: { x: colX, y: colY + PLAYGROUND_ROW_PX },
							dragHandle: DRAG_HANDLE,
							data: defaultToolSpec({
								toolName: 'lookup_crm',
								description: 'Look up a CRM contact by email or id.',
								loadTier: 'T0',
							}),
						},
						{
							id: 'tool-draft-quote',
							type: 'facet' as const,
							position: { x: colX, y: colY + PLAYGROUND_ROW_PX * 2 - 40 },
							dragHandle: DRAG_HANDLE,
							data: defaultToolSpec({
								toolName: 'draft_quote',
								description: 'Draft a quote from qualified lead fields.',
								loadTier: 'T0',
								inputJson: `{\n  "type": "object",\n  "properties": {\n    "accountId": { "type": "string" },\n    "sku": { "type": "string" }\n  },\n  "required": ["accountId"]\n}`,
								outputJson: `{\n  "type": "object",\n  "properties": {\n    "quoteId": { "type": "string" },\n    "total": { "type": "number" }\n  },\n  "required": ["quoteId", "total"]\n}`,
							}),
						},
					];

			toolsToUse.forEach((toolNode, tIdx) => {
				const toolId = toolNode.id;
				nodes.push({
					...toolNode,
					position: { x: colX, y: colY + PLAYGROUND_ROW_PX * (tIdx + 1) - (tIdx > 0 ? 40 : 0) },
					data: { ...toolNode.data, expanded: false },
				});
				edges.push(edge('tools', toolId));
			});
		}
	});

	return { nodes, edges };
}

/** Starter graph — sales.agent with full text profile. */
export function createExampleGraph(): { nodes: PlaygroundNode[]; edges: PlaygroundEdge[] } {
	const initial = createInitialGraph();
	const identity = {
		...(initial.nodes[0].data as IdentityData),
		profileType: 'text' as const,
	};
	return syncGraphForProfile(initial.nodes, [], identity);
}

/** Blank graph with profile node ready for user input. */
export function createBlankGraph(): { nodes: PlaygroundNode[]; edges: PlaygroundEdge[] } {
	return createInitialGraph();
}
