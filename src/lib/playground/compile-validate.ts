import { conflictingOutputRoles } from './outputs';
import {
	parseList,
	validateCustomToolsAllow,
	validateGeminiModelSpec,
	validateOpenRouterModelSpec,
} from './playground-policy';
import { parseJsonSchema, zodExprFromJsonSchema } from './tool-schema';
import type {
	CompileIssue,
	FacetData,
	GuardrailsData,
	IdentityData,
	InputsData,
	ModelSpecData,
	ModelsData,
	OutputsData,
	PlaygroundNode,
	ToolRegistration,
	ToolSpecData,
	ToolsData,
} from './types';

export type ValidatedPlayground = {
	identity: IdentityData;
	models: ModelsData;
	tools: ToolsData;
	inputs: InputsData;
	outputs: OutputsData;
	guardrails: GuardrailsData;
	specs: Array<{ id: string; data: ModelSpecData }>;
	customTools: ToolRegistration[];
};

function asKind<T extends FacetData['kind']>(
	nodes: PlaygroundNode[],
	kind: T,
): Extract<FacetData, { kind: T }> | undefined {
	const node = nodes.find((n) => n.data.kind === kind);
	return node?.data as Extract<FacetData, { kind: T }> | undefined;
}

function allOfKind<T extends FacetData['kind']>(
	nodes: PlaygroundNode[],
	kind: T,
): Array<{ id: string; data: Extract<FacetData, { kind: T }> }> {
	return nodes
		.filter((n) => n.data.kind === kind)
		.map((n) => ({ id: n.id, data: n.data as Extract<FacetData, { kind: T }> }));
}

function compileToolSpec(
	id: string,
	data: ToolSpecData,
	issues: CompileIssue[],
): ToolRegistration | null {
	const name = data.toolName.trim();
	if (!name) {
		issues.push({ nodeId: id, facet: 'toolSpec', message: 'tool name is required.' });
		return null;
	}
	if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
		issues.push({
			nodeId: id,
			facet: 'toolSpec',
			message: `tool name '${name}' must be an identifier (letters, digits, underscore).`,
		});
		return null;
	}
	const builtinErr = validateCustomToolsAllow(name);
	if (builtinErr) {
		issues.push({ nodeId: id, facet: 'toolSpec', message: builtinErr });
		return null;
	}
	if (!data.description.trim()) {
		issues.push({ nodeId: id, facet: 'toolSpec', message: 'description is required.' });
		return null;
	}

	const inputParsed = parseJsonSchema(data.inputJson, 'input');
	if (!inputParsed.ok) {
		issues.push({ nodeId: id, facet: 'toolSpec', message: inputParsed.error });
		return null;
	}
	const outputParsed = parseJsonSchema(data.outputJson, 'output');
	if (!outputParsed.ok) {
		issues.push({ nodeId: id, facet: 'toolSpec', message: outputParsed.error });
		return null;
	}

	const paths = parseList(data.paths);
	return {
		type: 'function',
		name,
		description: data.description.trim(),
		category: data.category.trim() || 'playground',
		access: data.access,
		permission: data.permission,
		loadTier: data.loadTier,
		paths: paths.length ? paths : ['*'],
		inputSchema: inputParsed.schema,
		outputSchema: outputParsed.schema,
	};
}

/** Validate graph facets and collect custom tool registrations. */
export function validatePlaygroundGraph(
	nodes: PlaygroundNode[],
): { ok: true; value: ValidatedPlayground } | { ok: false; issues: CompileIssue[] } {
	const issues: CompileIssue[] = [];

	const identity = asKind(nodes, 'identity');
	const models = asKind(nodes, 'models');
	const specs = allOfKind(nodes, 'modelSpec');
	const tools = asKind(nodes, 'tools');
	const toolSpecs = allOfKind(nodes, 'toolSpec');
	const inputs = asKind(nodes, 'inputs');
	const outputs = asKind(nodes, 'outputs');
	const guardrails = asKind(nodes, 'guardrails');

	if (!identity) {
		issues.push({
			nodeId: 'identity',
			facet: 'identity',
			message: 'Describe agent node is missing.',
		});
	} else {
		if (!identity.agentId.trim()) {
			issues.push({ nodeId: 'identity', facet: 'identity', message: 'id is required.' });
		}
		if (!identity.handle.trim()) {
			issues.push({
				nodeId: 'identity',
				facet: 'identity',
				message: 'identity.handle is required.',
			});
		}
		if (!identity.system.trim()) {
			issues.push({
				nodeId: 'identity',
				facet: 'identity',
				message: 'identity.system is required.',
			});
		}
	}

	if (!models) {
		issues.push({ nodeId: 'models', facet: 'models', message: 'Models hub is missing.' });
	}

	if (!specs.length) {
		issues.push({
			nodeId: 'models',
			facet: 'models',
			message: 'Add at least one model config node.',
		});
	}

	const seenIds = new Set<string>();
	for (const { id, data } of specs) {
		const mid = data.modelId.trim();
		if (!mid) {
			issues.push({ nodeId: id, facet: 'modelSpec', message: 'model id is required.' });
		} else if (seenIds.has(mid)) {
			issues.push({
				nodeId: id,
				facet: 'modelSpec',
				message: `Duplicate model id '${mid}'.`,
			});
		} else {
			seenIds.add(mid);
		}
		if (!data.apiId.trim()) {
			issues.push({
				nodeId: id,
				facet: 'modelSpec',
				message: 'Model wire id is required.',
			});
		} else if (models) {
			const err =
				models.protocol === 'openAi' && models.provider === 'openrouter'
					? validateOpenRouterModelSpec(data.apiId)
					: (models.protocol === 'geminiInteractions' || models.protocol === 'geminiLive') &&
							models.provider === 'google'
						? validateGeminiModelSpec(data.apiId, data.builtInTools)
						: null;
			if (err) {
				issues.push({ nodeId: id, facet: 'modelSpec', message: err });
			}
		}
	}

	if (!tools) {
		issues.push({ nodeId: 'tools', facet: 'tools', message: 'Tools node is missing.' });
	}

	const customTools: ToolRegistration[] = [];
	const seenToolNames = new Set<string>();
	for (const { id, data } of toolSpecs) {
		const reg = compileToolSpec(id, data, issues);
		if (!reg) continue;
		if (seenToolNames.has(reg.name)) {
			issues.push({
				nodeId: id,
				facet: 'toolSpec',
				message: `Duplicate tool name '${reg.name}'.`,
			});
			continue;
		}
		seenToolNames.add(reg.name);
		customTools.push(reg);
	}

	if (tools?.t2Loader.trim()) {
		const loaderId = tools.t2Loader.trim();
		if (!customTools.some((t) => t.name === loaderId)) {
			issues.push({
				nodeId: 'tools',
				facet: 'tools',
				message: `tools.t2Loader "${loaderId}" must match a custom tool on the canvas.`,
			});
		}
	}

	if (!inputs) {
		issues.push({ nodeId: 'inputs', facet: 'inputs', message: 'Inputs node is missing.' });
	}

	if (!outputs) {
		issues.push({ nodeId: 'outputs', facet: 'outputs', message: 'Outputs node is missing.' });
	} else if (outputs.mode === 'structured' && !outputs.schemaId.trim()) {
		issues.push({
			nodeId: 'outputs',
			facet: 'outputs',
			message: 'outputs.structured schema id is required when mode is structured.',
		});
	} else {
		const active = conflictingOutputRoles(outputs);
		if (active.length > 1) {
			issues.push({
				nodeId: 'outputs',
				facet: 'outputs',
				message: `Pick one primary output mode; active: ${active.join(', ')}.`,
			});
		}
	}

	if (!guardrails) {
		issues.push({
			nodeId: 'guardrails',
			facet: 'guardrails',
			message: 'Guardrails node is missing.',
		});
	} else if (
		guardrails.quotaEnabled &&
		(!Number.isFinite(guardrails.perDay) || guardrails.perDay < 1)
	) {
		issues.push({
			nodeId: 'guardrails',
			facet: 'guardrails',
			message: 'guardrails.quota.perDay must be ≥ 1 when quota is enabled.',
		});
	}

	if (
		issues.length ||
		!identity ||
		!models ||
		!specs.length ||
		!tools ||
		!inputs ||
		!outputs ||
		!guardrails
	) {
		return { ok: false, issues };
	}

	return {
		ok: true,
		value: { identity, models, tools, inputs, outputs, guardrails, specs, customTools },
	};
}

export function emitRegisterToolSource(tool: ToolRegistration): string {
	const inputZod = zodExprFromJsonSchema(tool.inputSchema);
	const outputZod = zodExprFromJsonSchema(tool.outputSchema);
	const common = `  name: ${JSON.stringify(tool.name)},
  description: ${JSON.stringify(tool.description)},
  category: ${JSON.stringify(tool.category)},
  access: ${JSON.stringify(tool.access)},
  paths: ${JSON.stringify(tool.paths)},
  loadTier: ${JSON.stringify(tool.loadTier)},
  permission: ${JSON.stringify(tool.permission)},
  input: ${inputZod},
  output: ${outputZod},`;

	const stub: Record<string, unknown> = {};
	const props = (tool.outputSchema.properties ?? {}) as Record<string, Record<string, unknown>>;
	for (const [key, prop] of Object.entries(props)) {
		const t = prop.type;
		if (t === 'number' || t === 'integer') stub[key] = 0;
		else if (t === 'boolean') stub[key] = false;
		else if (t === 'array') stub[key] = [];
		else if (t === 'object') stub[key] = {};
		else stub[key] = `playground:${key}`;
	}
	if (!Object.keys(stub).length) stub.result = 'playground stub';

	return `registerTool({
  type: "function",
${common}
  handler: async () => (${JSON.stringify(stub)}),
});
`;
}
