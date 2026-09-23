import { HTTP_METHODS } from '@theoremai/agents/schema';
import { isValidProfileProtocol, protocolsForProfileType } from './compat';
import {
	LIVE_TOOL_LOAD_TIERS,
	parseList,
	validateCustomToolsAllow,
	validateGeminiModelBinding,
	validateOpenRouterModelBinding,
} from './playground-policy';
import { buildRemoteToolAuth, parseHeadersJson } from './remote-tool-auth';
import { parseJsonSchema, zodExprFromJsonSchema } from './tool-schema';
import type {
	CompileIssue,
	FacetData,
	GuardrailsData,
	IdentityData,
	ImageData,
	InputsData,
	LiveData,
	ModelBindingData,
	ModelsData,
	ObservabilityData,
	OutputsData,
	PlaygroundNode,
	SpeechData,
	ToolRegistration,
	ToolSpecData,
	ToolsData,
	TurnBehaviourData,
} from './types';

function toolRegistrationBase(
	data: ToolSpecData,
	name: string,
	paths: string[],
	inputSchema: ToolRegistration['inputSchema'],
	outputSchema: ToolRegistration['outputSchema'],
) {
	return {
		name,
		description: data.description.trim(),
		category: data.category.trim() || 'playground',
		access: data.access,
		permission: data.permission,
		loadTier: data.loadTier,
		paths: paths.length ? paths : ['*'],
		inputSchema,
		outputSchema,
	};
}

function parseOptionalHeadersJson(
	raw: string | undefined,
	issues: CompileIssue[],
	id: string,
	label: string,
): Record<string, string> | undefined | null {
	if (!raw?.trim()) return undefined;
	const parsedHeaders = parseHeadersJson(raw);
	if (!parsedHeaders) {
		issues.push({
			nodeId: id,
			facet: 'toolSpec',
			message: `${label} headers must be valid JSON object.`,
		});
		return null;
	}
	return parsedHeaders;
}

export type ValidatedPlayground = {
	identity: IdentityData;
	models: ModelsData;
	tools?: ToolsData;
	inputs?: InputsData;
	outputs?: OutputsData;
	turnBehaviour?: TurnBehaviourData;
	guardrails?: GuardrailsData;
	observability?: ObservabilityData;
	image?: ImageData;
	speech?: SpeechData;
	live?: LiveData;
	specs: Array<{ id: string; data: ModelBindingData }>;
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
	const toolType = data.toolType;

	let stubResponse: Record<string, unknown> | undefined;
	if (toolType === 'function' && data.stubOutputJson?.trim()) {
		try {
			const parsed = JSON.parse(data.stubOutputJson) as unknown;
			if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
				issues.push({
					nodeId: id,
					facet: 'toolSpec',
					message: 'stub output must be a JSON object.',
				});
				return null;
			}
			stubResponse = parsed as Record<string, unknown>;
		} catch {
			issues.push({
				nodeId: id,
				facet: 'toolSpec',
				message: 'stub output is not valid JSON.',
			});
			return null;
		}
	}

	if (toolType === 'http') {
		const endpoint = data.endpoint?.trim() ?? '';
		if (!endpoint) {
			issues.push({ nodeId: id, facet: 'toolSpec', message: 'HTTP endpoint URL is required.' });
			return null;
		}

		const headers = parseOptionalHeadersJson(data.headersJson, issues, id, 'HTTP');
		if (headers === null) return null;

		const pathParams = parseList(data.pathParams ?? '');
		const queryParams = parseList(data.queryParams ?? '');
		const bodyParam = data.bodyParam?.trim() || undefined;

		return {
			type: 'http',
			...toolRegistrationBase(data, name, paths, inputParsed.schema, outputParsed.schema),
			endpoint,
			method: data.method ?? HTTP_METHODS[0],
			headers,
			mapping: {
				pathParams: pathParams.length ? pathParams : undefined,
				queryParams: queryParams.length ? queryParams : undefined,
				bodyParam,
			},
			auth: buildRemoteToolAuth(data),
		};
	}

	if (toolType === 'mcp') {
		const serverUrl = data.serverUrl?.trim() ?? '';
		if (!serverUrl) {
			issues.push({ nodeId: id, facet: 'toolSpec', message: 'MCP server URL is required.' });
			return null;
		}
		const mcpToolName = data.mcpToolName?.trim() ?? '';
		if (!mcpToolName) {
			issues.push({ nodeId: id, facet: 'toolSpec', message: 'MCP tool name is required.' });
			return null;
		}

		const headers = parseOptionalHeadersJson(data.headersJson, issues, id, 'MCP');
		if (headers === null) return null;

		return {
			type: 'mcp',
			...toolRegistrationBase(data, name, paths, inputParsed.schema, outputParsed.schema),
			serverUrl,
			mcpToolName,
			headers,
			auth: buildRemoteToolAuth(data),
		};
	}

	return {
		type: 'function',
		...toolRegistrationBase(data, name, paths, inputParsed.schema, outputParsed.schema),
		stubResponse,
	};
}

function validateIdentity(identity: IdentityData | undefined, issues: CompileIssue[]): void {
	if (!identity) {
		issues.push({
			nodeId: 'identity',
			facet: 'identity',
			message: 'Profile node is missing.',
		});
		return;
	}
	if (!identity.agentId.trim()) {
		issues.push({ nodeId: 'identity', facet: 'identity', message: 'id is required.' });
	}
	if (!identity.profileType) {
		issues.push({
			nodeId: 'identity',
			facet: 'identity',
			message: 'Select a profile modality (text, image, speech, live).',
		});
	}
	if (!identity.handle.trim()) {
		issues.push({
			nodeId: 'identity',
			facet: 'identity',
			message: 'identity.handle is required.',
		});
	}
	/* system is optional in the kernel; omit validation — an empty agent is unusual but legal. */
}

function validateModels(
	identity: IdentityData | undefined,
	models: ModelsData | undefined,
	specs: Array<{ id: string; data: ModelBindingData }>,
	issues: CompileIssue[],
): void {
	if (!models) {
		issues.push({
			nodeId: 'models',
			facet: 'models',
			message: 'Models node is missing. Select a modality to create it.',
		});
		return;
	}

	if (!specs.length) {
		issues.push({
			nodeId: 'models',
			facet: 'models',
			message: 'Add at least one model binding node.',
		});
	}

	const seenIds = new Set<string>();
	for (const { id, data } of specs) {
		const mid = data.modelId.trim();
		if (!mid) {
			issues.push({ nodeId: id, facet: 'modelBinding', message: 'model id is required.' });
		} else if (seenIds.has(mid)) {
			issues.push({
				nodeId: id,
				facet: 'modelBinding',
				message: `Duplicate model id '${mid}'.`,
			});
		} else {
			seenIds.add(mid);
		}

		if (identity?.profileType) {
			if (!isValidProfileProtocol(identity.profileType, data.protocol)) {
				const valid = protocolsForProfileType(identity.profileType).join(', ');
				issues.push({
					nodeId: id,
					facet: 'modelBinding',
					message: `Profile type "${identity.profileType}" cannot use protocol "${data.protocol}". Supported protocols: ${valid}.`,
				});
			}
		}

		if (!data.apiId.trim()) {
			issues.push({
				nodeId: id,
				facet: 'modelBinding',
				message: 'Model wire id is required.',
			});
		} else {
			const err =
				data.protocol === 'openAi' && data.provider === 'openrouter'
					? validateOpenRouterModelBinding(data.apiId)
					: (data.protocol === 'geminiInteractions' || data.protocol === 'geminiLive') &&
							data.provider === 'google'
						? validateGeminiModelBinding(data.apiId, data.builtInTools, data.protocol)
						: null;
			if (err) {
				issues.push({ nodeId: id, facet: 'modelBinding', message: err });
			}
		}

		const effortKeys = Object.keys(data.efforts).filter((k) => k.trim());
		if (data.allowEffortSelect && effortKeys.length < 2) {
			issues.push({
				nodeId: id,
				facet: 'modelBinding',
				message: 'allowEffortSelect requires at least two effort aliases.',
			});
		}
		const defaultEffort = data.defaultEffort.trim();
		if (defaultEffort && !effortKeys.includes(defaultEffort)) {
			issues.push({
				nodeId: id,
				facet: 'modelBinding',
				message: `defaultEffort '${defaultEffort}' is not declared in efforts.`,
			});
		}
	}

	const defaultModel = models.defaultModel.trim();
	if (specs.length > 1 && !defaultModel) {
		issues.push({
			nodeId: 'models',
			facet: 'models',
			message: 'defaultModel is required when more than one model is declared.',
		});
	}
	if (defaultModel && !seenIds.has(defaultModel)) {
		issues.push({
			nodeId: 'models',
			facet: 'models',
			message: `defaultModel '${defaultModel}' is not declared.`,
		});
	}
	if (models.allowModelSelect && specs.length < 2) {
		issues.push({
			nodeId: 'models',
			facet: 'models',
			message: 'allowModelSelect requires at least two models.',
		});
	}

	const hasGoogleTransport = specs.some(
		({ data }) =>
			data.provider === 'google' &&
			(data.protocol === 'geminiInteractions' || data.protocol === 'geminiLive'),
	);
	if (hasGoogleTransport && !models.key) {
		issues.push({
			nodeId: 'models',
			facet: 'models',
			message: 'profile.key is required for Google transports (slotA, slotB, or slotC).',
		});
	}
}

function validateToolsAndCustom(
	tools: ToolsData | undefined,
	toolSpecs: Array<{ id: string; data: ToolSpecData }>,
	issues: CompileIssue[],
	identity: IdentityData | undefined,
): ToolRegistration[] {
	const customTools: ToolRegistration[] = [];
	if (!tools) return customTools;

	const seenToolNames = new Set<string>();
	for (const { id, data } of toolSpecs) {
		if (
			identity?.profileType === 'live' &&
			!(LIVE_TOOL_LOAD_TIERS as readonly string[]).includes(data.loadTier)
		) {
			issues.push({
				nodeId: id,
				facet: 'toolSpec',
				message: `Live profiles only support loadTier T0 (Gemini Live fixes function declarations at session setup) — '${data.toolName || id}' is ${data.loadTier}.`,
			});
		}
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

	if (tools.t2Loader.trim() && identity?.profileType === 'live') {
		issues.push({
			nodeId: 'tools',
			facet: 'tools',
			message:
				'tools.t2Loader is not supported on live — function declarations are fixed at session setup.',
		});
	} else if (tools.t2Loader.trim() && identity?.profileType !== 'live') {
		const loaderId = tools.t2Loader.trim();
		if (!customTools.some((t) => t.name === loaderId)) {
			issues.push({
				nodeId: 'tools',
				facet: 'tools',
				message: `tools.t2Loader "${loaderId}" must match a custom tool on the canvas.`,
			});
		}
	}
	return customTools;
}

function validateModalityAndOutputs(
	identity: IdentityData | undefined,
	image: ImageData | undefined,
	speech: SpeechData | undefined,
	live: LiveData | undefined,
	outputs: OutputsData | undefined,
	guardrails: GuardrailsData | undefined,
	issues: CompileIssue[],
): void {
	if (identity?.profileType === 'image' && !image) {
		issues.push({
			nodeId: 'identity',
			facet: 'identity',
			message: 'Image specification is missing.',
		});
	}

	if (identity?.profileType === 'speech' && !speech) {
		issues.push({
			nodeId: 'identity',
			facet: 'identity',
			message: 'Speech specification is missing.',
		});
	}

	if (identity?.profileType === 'live' && !live) {
		issues.push({
			nodeId: 'identity',
			facet: 'identity',
			message: 'Live specification is missing.',
		});
	}

	if (
		identity?.profileType !== 'live' &&
		outputs &&
		outputs.mode === 'structured' &&
		!outputs.schemaId.trim()
	) {
		issues.push({
			nodeId: 'outputs',
			facet: 'outputs',
			message: 'outputs.structured schema id is required when mode is structured.',
		});
	}

	if (
		guardrails?.quotaEnabled &&
		(!Number.isFinite(guardrails.perDay ?? 0) || (guardrails.perDay ?? 0) < 1)
	) {
		issues.push({
			nodeId: 'guardrails',
			facet: 'guardrails',
			message: 'guardrails.quota.perDay must be ≥ 1 when quota is enabled.',
		});
	}

	if (guardrails?.hasEgress === true && !guardrails.onBlock) {
		issues.push({
			nodeId: 'guardrails',
			facet: 'guardrails',
			message: 'guardrails.egress.onBlock is required when egress is enabled.',
		});
	}
}

/** Validate graph facets and collect custom tool registrations. */
export function validatePlaygroundGraph(
	nodes: PlaygroundNode[],
): { ok: true; value: ValidatedPlayground } | { ok: false; issues: CompileIssue[] } {
	const issues: CompileIssue[] = [];

	const identity = asKind(nodes, 'identity');
	const models = asKind(nodes, 'models');
	const specs = allOfKind(nodes, 'modelBinding');
	const tools = asKind(nodes, 'tools');
	const toolSpecs = allOfKind(nodes, 'toolSpec');
	const inputs = asKind(nodes, 'inputs');
	const outputs = asKind(nodes, 'outputs');
	const turnBehaviour = asKind(nodes, 'turnBehaviour');
	const guardrails = asKind(nodes, 'guardrails');
	const observability = asKind(nodes, 'observability');
	const image = asKind(nodes, 'image');
	const speech = asKind(nodes, 'speech');
	const live = asKind(nodes, 'live');

	validateIdentity(identity, issues);
	validateModels(identity, models, specs, issues);
	const customTools = validateToolsAndCustom(tools, toolSpecs, issues, identity);
	validateModalityAndOutputs(identity, image, speech, live, outputs, guardrails, issues);

	if (issues.length || !identity || !models || !specs.length) {
		return { ok: false, issues };
	}

	return {
		ok: true,
		value: {
			identity,
			models,
			tools,
			inputs,
			outputs,
			turnBehaviour,
			guardrails,
			observability,
			image,
			speech,
			live,
			specs,
			customTools,
		},
	};
}

function hasEntries(record: Record<string, string> | undefined): boolean {
	return record !== undefined && Object.keys(record).length > 0;
}

/** A pretty-printed `key: value,` source line, or none when the value is absent. */
function jsonFieldLine(key: string, value: unknown): string[] {
	return value ? [`  ${key}: ${JSON.stringify(value, null, 2)},`] : [];
}

function registerToolSource(
	type: ToolRegistration['type'],
	common: string,
	extra: string[],
): string {
	return `registerTool({
  type: "${type}",
${common}
${extra.join('\n')}
});
`;
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

	if (tool.type === 'http') {
		const hasMapping = Boolean(
			tool.mapping?.pathParams || tool.mapping?.queryParams || tool.mapping?.bodyParam,
		);
		return registerToolSource('http', common, [
			`  endpoint: ${JSON.stringify(tool.endpoint)},`,
			`  method: ${JSON.stringify(tool.method)},`,
			...jsonFieldLine('headers', hasEntries(tool.headers) ? tool.headers : undefined),
			...jsonFieldLine('mapping', hasMapping ? tool.mapping : undefined),
			...jsonFieldLine('auth', tool.auth),
		]);
	}

	if (tool.type === 'mcp') {
		return registerToolSource('mcp', common, [
			`  serverUrl: ${JSON.stringify(tool.serverUrl)},`,
			`  mcpToolName: ${JSON.stringify(tool.mcpToolName)},`,
			...jsonFieldLine('headers', hasEntries(tool.headers) ? tool.headers : undefined),
			...jsonFieldLine('auth', tool.auth),
		]);
	}

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

	return registerToolSource('function', common, [
		`  handler: async () => (${JSON.stringify(stub)}),`,
	]);
}
