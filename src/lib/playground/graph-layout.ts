import type { ProfileGraphFacetId, ProfileType, Protocol, Provider } from 'theorum/schema';
import { spineFacetsForProfileType } from 'theorum/schema';
import { resolveNodeCollisions } from './graph-collision';
import {
	branchSpecPosition,
	PLAYGROUND_FACET_X,
	PLAYGROUND_IDENTITY_X,
	PLAYGROUND_ORIGIN,
	PLAYGROUND_ROW_PX,
	stackBranchSpecPosition,
} from './layout';
import { LIVE_TOOL_LOAD_TIERS, OPENROUTER_PLAYGROUND_API_ID } from './playground-policy';
import {
	defaultImageSpec,
	defaultLiveSpec,
	defaultModelBinding,
	defaultObservabilityData,
	defaultSpeechSpec,
	defaultTurnBehaviourData,
	type FacetData,
	type IdentityData,
	type ModelBindingData,
	type PlaygroundEdge,
	type PlaygroundNode,
	type ToolSpecData,
} from './types';

/**
 * Spine facet kinds derived from the kernel profile-graph catalog.
 * Use `ProfileGraphFacetId` directly — do not define local aliases.
 */

export function spineEdge(source: string, target: string): PlaygroundEdge {
	return {
		id: `e-${source}-${target}`,
		source,
		target,
		sourceHandle: 'out',
		targetHandle: 'in-left',
		type: 'smoothstep',
	};
}

export function branchEdge(source: string, target: string, hidden = false): PlaygroundEdge {
	return {
		id: `e-${source}-${target}`,
		source,
		target,
		sourceHandle: 'branch',
		targetHandle: 'in-left',
		type: 'smoothstep',
		hidden,
	};
}

/**
 * Spine facet ids visible for a profile type, in catalog order.
 * Required facets always appear; optional facets appear when the user
 * included them in `identity.includedOptionalFacets`.
 */
export function spineFacetKinds(identity: IdentityData): ProfileGraphFacetId[] {
	const type = identity.profileType;
	if (!type) return [];

	const included = new Set(identity.includedOptionalFacets);
	const profileType: ProfileType = type;
	return spineFacetsForProfileType(profileType)
		.filter((f) => f.role === 'spine')
		.filter((f) => !f.optional || included.has(f.id))
		.map((f) => f.id);
}

function identityPosition(): { x: number; y: number } {
	return { x: PLAYGROUND_IDENTITY_X, y: PLAYGROUND_ORIGIN.y };
}

function facetDataForKind(
	colKind: ProfileGraphFacetId,
	type: IdentityData['profileType'],
	existing: PlaygroundNode | undefined,
): FacetData {
	if (existing && existing.data.kind === colKind) {
		if (existing.data.kind === 'models') {
			return { ...existing.data, expanded: false };
		}
		if (existing.data.kind === 'live') {
			return { ...defaultLiveSpec(), ...existing.data, expanded: false };
		}
		if (existing.data.kind === 'image') {
			return { ...defaultImageSpec(), ...existing.data, expanded: false };
		}
		if (existing.data.kind === 'speech') {
			return { ...defaultSpeechSpec(), ...existing.data, expanded: false };
		}
		if (existing.data.kind === 'tools') {
			return {
				...existing.data,
				...(type === 'live' ? { t2Loader: '' } : {}),
				expanded: false,
			};
		}
		return { ...existing.data, expanded: false };
	}

	switch (colKind) {
		case 'models':
			return {
				kind: 'models',
				expanded: false,
				branchCollapsed: false,
				defaultModel: '',
				allowModelSelect: false,
				maxSteps: '',
				key: type === 'live' ? 'slotA' : '',
			};
		case 'image':
			return defaultImageSpec();
		case 'speech':
			return defaultSpeechSpec();
		case 'live':
			return defaultLiveSpec();
		case 'tools':
			return {
				kind: 'tools',
				expanded: false,
				branchCollapsed: false,
				t2Loader: '',
			};
		case 'inputs':
			return {
				kind: 'inputs',
				expanded: false,
				attachmentsAccept: [],
				voiceAccept: [],
				maxFiles: 0,
				maxBytes: 0,
				maxTurnBytes: 0,
			};
		case 'outputs':
			return {
				kind: 'outputs',
				expanded: false,
				mode: 'text',
				schemaId: '',
				schemaEnforced: 'responseFormat',
				schemaJson: '',
				streamMode: '',
				streamThoughts: false,
				validationEnabled: false,
				maxRetries: 2,
				repairGuidance: '',
			};
		case 'turnBehaviour':
			return defaultTurnBehaviourData();
		case 'guardrails':
			return {
				kind: 'guardrails',
				expanded: false,
				quotaEnabled: false,
			};
		case 'observability':
			return defaultObservabilityData();
		case 'identity':
		case 'modelBinding':
		case 'toolSpec':
			throw new Error(`facetDataForKind: '${colKind}' is not a spine facet`);
		default: {
			const _exhaustive: never = colKind;
			throw new Error(`Unknown facet kind: ${String(_exhaustive)}`);
		}
	}
}

/** Lay out identity + spine facets vertically; branch specs stack in a column right of their hub. */
export function layoutPlaygroundGraph(
	currentNodes: PlaygroundNode[],
	identity: IdentityData,
	dragHandle: string,
	opts?: { preservePositions?: boolean },
): { nodes: PlaygroundNode[]; edges: PlaygroundEdge[] } {
	const preservePositions = opts?.preservePositions ?? false;
	const type = identity.profileType;
	if (!type) {
		return {
			nodes: [
				{
					id: 'identity',
					type: 'facet',
					position: identityPosition(),
					dragHandle,
					zIndex: 1,
					data: { ...identity, expanded: true },
				},
			],
			edges: [],
		};
	}

	const findNode = (id: string) => currentNodes.find((n) => n.id === id);
	const spineKinds = spineFacetKinds(identity);
	const nodes: PlaygroundNode[] = [];
	const edges: PlaygroundEdge[] = [];

	const existingIdentity = findNode('identity');
	nodes.push({
		id: 'identity',
		type: 'facet',
		position:
			preservePositions && existingIdentity ? existingIdentity.position : identityPosition(),
		dragHandle,
		zIndex: 1,
		data: { ...identity, expanded: true },
	});

	let spineY = PLAYGROUND_ORIGIN.y + PLAYGROUND_ROW_PX;

	spineKinds.forEach((colKind) => {
		const nodeId = colKind;
		const existing = findNode(nodeId);
		const data = facetDataForKind(colKind, type, existing);
		const colX = PLAYGROUND_FACET_X;
		const colY = spineY;

		nodes.push({
			id: nodeId,
			type: 'facet',
			position: preservePositions && existing ? existing.position : { x: colX, y: colY },
			dragHandle,
			data,
		});

		edges.push(spineEdge('identity', nodeId));

		const branchCollapsed =
			(data.kind === 'models' || data.kind === 'tools') && data.branchCollapsed;

		if (colKind === 'models') {
			const targetProtocol: Protocol = type === 'live' ? 'geminiLive' : 'openAi';
			const targetProvider: Provider = type === 'live' ? 'google' : 'openrouter';
			const existingSpecs = currentNodes.filter(
				(n): n is PlaygroundNode & { data: ModelBindingData } => n.data.kind === 'modelBinding',
			);
			const needsModelSwap =
				(type === 'live' &&
					existingSpecs.some((s) => s.data.apiId !== 'gemini-3.1-flash-live-preview')) ||
				(type !== 'live' &&
					existingSpecs.some((s) => s.data.apiId === 'gemini-3.1-flash-live-preview'));

			const specsToUse =
				existingSpecs.length && !needsModelSwap
					? existingSpecs
					: branchCollapsed
						? []
						: [
								{
									id: type === 'live' ? 'model-live' : 'model-fast',
									type: 'facet' as const,
									position: branchSpecPosition(colX, colY, 0),
									dragHandle,
									data: defaultModelBinding({
										modelId: type === 'live' ? 'live' : 'fast',
										protocol: targetProtocol,
										provider: targetProvider,
										apiId:
											type === 'live'
												? 'gemini-3.1-flash-live-preview'
												: OPENROUTER_PLAYGROUND_API_ID,
									}),
								},
							];

			const placedModelSpecs: PlaygroundNode[] = [];
			specsToUse.forEach((specNode) => {
				const specId = specNode.id;
				const existingSpec = findNode(specId);
				const defaultPos =
					preservePositions && existingSpec
						? existingSpec.position
						: stackBranchSpecPosition(colX, colY, placedModelSpecs);
				const node: PlaygroundNode = {
					...specNode,
					position: defaultPos,
					hidden: branchCollapsed,
					data: { ...specNode.data, expanded: false },
				};
				nodes.push(node);
				placedModelSpecs.push(node);
				edges.push(branchEdge('models', specId, branchCollapsed));
			});
		}

		if (colKind === 'tools') {
			const existingTools = currentNodes.filter(
				(n): n is PlaygroundNode & { data: ToolSpecData } => n.data.kind === 'toolSpec',
			);
			const toolsToUse = existingTools.length ? existingTools : branchCollapsed ? [] : [];

			const placedToolSpecs: PlaygroundNode[] = [];
			toolsToUse.forEach((toolNode) => {
				const toolId = toolNode.id;
				const existingTool = findNode(toolId);
				const defaultPos =
					preservePositions && existingTool
						? existingTool.position
						: stackBranchSpecPosition(colX, colY, placedToolSpecs);
				const node: PlaygroundNode = {
					...toolNode,
					position: defaultPos,
					hidden: branchCollapsed,
					data: {
						...toolNode.data,
						...(type === 'live' ? { loadTier: LIVE_TOOL_LOAD_TIERS[0] } : {}),
						expanded: false,
					},
				};
				nodes.push(node);
				placedToolSpecs.push(node);
				edges.push(branchEdge('tools', toolId, branchCollapsed));
			});
		}

		spineY += PLAYGROUND_ROW_PX;
	});

	return { nodes: resolveNodeCollisions(nodes), edges };
}
