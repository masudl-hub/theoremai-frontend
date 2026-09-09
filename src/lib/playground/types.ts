import type { Edge, Node } from '@xyflow/svelte';
import type { ProfileDefinition, ProfileLiveSpec, ProfileSpeechSpec, ProfileType } from 'theorum';
import type {
	AuthUnauthenticatedPolicy,
	ContinueStopKind,
	CustomToolType,
	EgressOnBlock,
	HttpMethod,
	LiveActivityHandling,
	LiveSpeechSensitivity,
	OverflowKeySlot,
	PlaygroundAuthType,
	ProfileGraphFacetId,
	Protocol,
	Provider,
	SchemaEnforcement,
	StreamMode,
	ThinkingLevel,
	ToolAccess,
	ToolAuthType,
	ToolLoadTier,
	ToolPermission,
} from 'theorum/schema';
import { PROFILE_GRAPH, TOOL_ACCESS, TOOL_LOAD_TIERS, TOOL_PERMISSION } from 'theorum/schema';
import { DEFAULT_TOOL_INPUT_SCHEMA, DEFAULT_TOOL_OUTPUT_SCHEMA } from './tool-schema';

export type {
	CustomToolType,
	HttpMethod,
	PlaygroundAuthType,
	ProfileType,
	ToolAccess,
	ToolAuthType,
	ToolPermission,
};

/**
 * Canvas node kinds — imported from the kernel profile-graph catalog.
 * Use `ProfileGraphFacetId` from `theorum/schema` directly; do not define aliases.
 */

export type IdentityData = {
	kind: 'identity';
	expanded: boolean;
	agentId: string;
	profileType: ProfileType | '';
	handle: string;
	system: string;
	/**
	 * Optional spine facets the user has explicitly included on the graph.
	 * Driven by PROFILE_GRAPH optional facets. When a facet id is present,
	 * the spine node is shown; when absent, the section is omitted from compile.
	 */
	includedOptionalFacets: ProfileGraphFacetId[];
};

/** Profile-level model policy — `defaultModel`, `allowModelSelect`, `maxSteps`, `key`. */
export type ModelsData = {
	kind: 'models';
	expanded: boolean;
	/** When true, hide model binding nodes on the canvas. */
	branchCollapsed: boolean;
	defaultModel: string;
	allowModelSelect: boolean;
	/** Omit (empty string / undefined) → kernel unbounded. Positive number = ceiling. */
	maxSteps: number | '';
	key: OverflowKeySlot | '';
};

/** One entry in `profile.models[id]` — `ModelBinding`. */
export type ModelBindingData = {
	kind: 'modelBinding';
	expanded: boolean;
	modelId: string;
	protocol: Protocol;
	provider: Provider;
	apiId: string;
	/** Effort alias → thinking level. */
	efforts: Record<string, ThinkingLevel>;
	defaultEffort: string;
	allowEffortSelect: boolean;
	summaries: boolean;
	temperature?: number;
	/** Empty = omit (provider default). */
	maxOutputTokens: number | '';
	builtInTools: string;
};
/** Hub for custom tools — allow is derived from child toolSpec nodes. */
export type ToolsData = {
	kind: 'tools';
	expanded: boolean;
	/** When true, hide tool spec nodes on the canvas. */
	branchCollapsed: boolean;
	/** Designated function tool id for T2 promotion (must return { loaded: string[] }). */
	t2Loader: string;
};

/** One custom tool — compiles to registerTool + tools.allow entry. */
export type ToolSpecData = {
	kind: 'toolSpec';
	expanded: boolean;
	toolName: string;
	toolType: CustomToolType;
	description: string;
	category: string;
	access: ToolAccess;
	permission: ToolPermission;
	loadTier: ToolLoadTier;
	/** Comma-separated paths; `*` = all. */
	paths: string;
	/** JSON Schema object as text. */
	inputJson: string;
	outputJson: string;

	/** Playground-only: fixed JSON object returned by function tool stubs. */
	stubOutputJson?: string;

	// Declarative HTTP Tool properties
	endpoint?: string;
	method?: HttpMethod;
	headersJson?: string;
	pathParams?: string;
	queryParams?: string;
	bodyParam?: string;

	// Remote MCP Tool properties
	serverUrl?: string;
	mcpToolName?: string;

	// Shared Auth properties for HTTP and MCP tools
	authType?: PlaygroundAuthType;
	authSlot?: string;
	authHeaderName?: string;
	authHeaderPrefix?: string;
	authUnauthenticated?: AuthUnauthenticatedPolicy;
	authScopes?: string;
	authClientId?: string;
	authRedirectUri?: string;
};

export type InputsData = {
	kind: 'inputs';
	expanded: boolean;
	/** Omit → kernel enables text (`inputs?.text !== false`). Explicit false opts out. */
	text?: boolean;
	attachmentsAccept: string[];
	voiceAccept: string[];
	maxFiles: number;
	maxBytes: number;
	maxTurnBytes: number;
};

/**
 * Profile `outputs` — structured is a registered schema id (or null).
 * Schema bodies live in `registerStructured`, not on the profile.
 * Resume / continue fields live on `TurnBehaviourData`, not here.
 */
export type OutputsData = {
	kind: 'outputs';
	expanded: boolean;
	mode: 'text' | 'structured';
	schemaId: string;
	/** Optional body for export: emits registerStructured(schemaId, …) */
	schemaEnforced: SchemaEnforcement;
	schemaJson: string;
	/** Empty = omit streaming from profile (kernel defaults to SSE). */
	streamMode: '' | StreamMode;
	streamThoughts: boolean;
	validationEnabled: boolean;
	maxRetries: number;
	repairGuidance: string;
};

export type GuardrailsData = {
	kind: 'guardrails';
	expanded: boolean;
	/** Omit → kernel defaults true. Explicit false opts out. */
	canary?: boolean;
	/** Omit → kernel defaults true. Explicit false opts out. */
	sanitizeInput?: boolean;
	/** Omit → kernel defaults true. Explicit false opts out. */
	redactSensitive?: boolean;
	quotaEnabled: boolean;
	perDay?: number;
	/** When true, compile wires `standardEgressEnforce`. When false/omit, egress section omitted. */
	hasEgress?: boolean;
	onBlock?: EgressOnBlock;
	egressMaxRetries?: number;
	allowPrivateNetworks?: boolean;
	allowedHosts?: string;
};

export type ImageData = {
	kind: 'image';
	expanded: boolean;
	/** Empty = omit (provider default). */
	aspectRatio: string;
	/** Empty = omit (provider default). */
	size: string;
	/** Empty = omit (provider default). */
	mimeType: string;
	/** 0 = omit. */
	maxInputImages: number;
	includeText: boolean;
};

export type SpeechData = {
	kind: 'speech';
	expanded: boolean;
	voice: string;
	/** Empty = omit (provider default). */
	format: '' | NonNullable<ProfileSpeechSpec['format']>;
};

export type LiveData = {
	kind: 'live';
	expanded: boolean;
	/** Realtime mic ingress (`live.ingress.audio`). */
	ingressAudio: boolean;
	/** Webcam JPEG frame ingress (`live.ingress.video`). */
	ingressVideo: boolean;
	/** Typed text ingress (`live.ingress.text`). */
	ingressText: boolean;
	voice: NonNullable<ProfileLiveSpec['voice']>;
	sessionResumption: NonNullable<ProfileLiveSpec['sessionResumption']>;
	/** When true, wire `proactivity.proactiveAudio`. When false, omit (provider default). */
	proactiveAudio: boolean;
	contextCompression: '' | NonNullable<ProfileLiveSpec['contextCompression']>;
	transcriptionInput: boolean;
	transcriptionOutput: boolean;
	/**
	 * When false, omit `live.vad` entirely (provider defaults).
	 * When true, only non-empty VAD fields are compiled onto the profile.
	 */
	vadEnabled: boolean;
	vadActivityHandling: '' | LiveActivityHandling;
	vadStartSensitivity: '' | LiveSpeechSensitivity;
	vadEndSensitivity: '' | LiveSpeechSensitivity;
	/** Empty string = omit; otherwise milliseconds. */
	vadPrefixPaddingMs: number | '';
	vadSilenceDurationMs: number | '';
};

/**
 * Turn behaviour — resume/continue policy and steering.
 * Serializable subset of `ProfileTurnBehaviourSpec`; host-only flags omitted.
 */
export type TurnBehaviourData = {
	kind: 'turnBehaviour';
	expanded: boolean;
	resumeEnabled: boolean;
	allowContinue: ContinueStopKind[];
	autoContinue: ContinueStopKind[];
	/** Text only. Omit → default true. Explicit false disables steering. */
	allowSteering?: boolean;
};

/**
 * Observability — trace destination, sampling, include, scrub.
 * Matches the nested `ProfileObservabilitySpec` shape; host-only fields
 * (`onWriteError`, `TraceSink`) are not representable in the playground.
 */
export type ObservabilityData = {
	kind: 'observability';
	expanded: boolean;
	/** false = off; non-empty string = registered destination id; empty = omit (kernel default). */
	writeTo: false | string;
	sampleRate?: number;
	include?: {
		upstreamLog?: boolean;
		outboundWire?: boolean;
		evidenceRaw?: boolean;
		usage?: boolean;
		guardrailDecisions?: boolean;
		guardrailMatchPreview?: boolean;
	};
	scrub?: {
		sensitive?: boolean;
		injection?: boolean;
		canary?: boolean;
	};
	retainForDays?: number;
	rotateAfterMiB?: number;
};

export type FacetData =
	| IdentityData
	| ModelsData
	| ModelBindingData
	| ToolsData
	| ToolSpecData
	| InputsData
	| OutputsData
	| GuardrailsData
	| TurnBehaviourData
	| ObservabilityData
	| ImageData
	| SpeechData
	| LiveData;

export type PlaygroundNode = Node<FacetData, 'facet'>;
export type PlaygroundEdge = Edge;

export type CompileIssue = {
	nodeId: string;
	facet: ProfileGraphFacetId;
	message: string;
};

export type StructuredRegistration = {
	id: string;
	spec: {
		enforced: SchemaEnforcement;
		jsonSchema?: Record<string, unknown>;
	};
};

/** Compiled custom tool ready for host registerTool + export source. */
export type FunctionToolRegistration = {
	type: 'function';
	name: string;
	description: string;
	category: string;
	access: ToolAccess;
	permission: ToolPermission;
	loadTier: ToolLoadTier;
	paths: string[];
	inputSchema: Record<string, unknown>;
	outputSchema: Record<string, unknown>;
	/** Playground function stub payload when set (overrides generic stub). */
	stubResponse?: Record<string, unknown>;
};

export type HttpToolRegistration = {
	type: 'http';
	name: string;
	description: string;
	category: string;
	access: ToolAccess;
	permission: ToolPermission;
	loadTier: ToolLoadTier;
	paths: string[];
	endpoint: string;
	method: HttpMethod;
	headers?: Record<string, string>;
	mapping?: {
		pathParams?: string[];
		queryParams?: string[];
		bodyParam?: string;
	};
	auth?: {
		slot: string;
		type: ToolAuthType;
		headerName?: string;
		headerPrefix?: string;
		onUnauthenticated?: AuthUnauthenticatedPolicy;
		scopes?: string[];
		clientId?: string;
		redirectUri?: string;
	};
	inputSchema: Record<string, unknown>;
	outputSchema: Record<string, unknown>;
};

export type McpToolRegistration = {
	type: 'mcp';
	name: string;
	description: string;
	category: string;
	access: ToolAccess;
	permission: ToolPermission;
	loadTier: ToolLoadTier;
	paths: string[];
	serverUrl: string;
	mcpToolName: string;
	headers?: Record<string, string>;
	auth?: {
		slot: string;
		type: ToolAuthType;
		headerName?: string;
		headerPrefix?: string;
		onUnauthenticated?: AuthUnauthenticatedPolicy;
		scopes?: string[];
		clientId?: string;
		redirectUri?: string;
	};
	inputSchema: Record<string, unknown>;
	outputSchema: Record<string, unknown>;
};

export type ToolRegistration =
	| FunctionToolRegistration
	| HttpToolRegistration
	| McpToolRegistration;

export type CompileResult =
	| {
			ok: true;
			agentId: string;
			profile: ProfileDefinition;
			source: string;
			message: string;
			structured?: StructuredRegistration;
			customTools: ToolRegistration[];
	  }
	| {
			ok: false;
			issues: CompileIssue[];
			message: string;
	  };

/** Labels derived from the kernel profile-graph catalog. */
export const FACET_LABEL: Record<ProfileGraphFacetId, string> = Object.fromEntries(
	PROFILE_GRAPH.map((facet) => [facet.id, facet.label]),
) as Record<ProfileGraphFacetId, string>;

export const DRAG_HANDLE = '.facet-head';

export function defaultImageSpec(partial?: Partial<ImageData>): ImageData {
	return {
		kind: 'image',
		expanded: false,
		aspectRatio: '',
		size: '',
		mimeType: '',
		maxInputImages: 0,
		includeText: false,
		...partial,
	};
}

export function defaultSpeechSpec(partial?: Partial<SpeechData>): SpeechData {
	return {
		kind: 'speech',
		expanded: false,
		voice: '',
		format: '',
		...partial,
	};
}

export function defaultLiveSpec(partial?: Partial<LiveData>): LiveData {
	return {
		kind: 'live',
		expanded: false,
		ingressAudio: true,
		ingressVideo: true,
		ingressText: false,
		voice: '',
		sessionResumption: false,
		proactiveAudio: false,
		contextCompression: '',
		transcriptionInput: false,
		transcriptionOutput: false,
		vadEnabled: false,
		vadActivityHandling: '',
		vadStartSensitivity: '',
		vadEndSensitivity: '',
		vadPrefixPaddingMs: '',
		vadSilenceDurationMs: '',
		...partial,
	};
}

export function defaultModelBinding(partial?: Partial<ModelBindingData>): ModelBindingData {
	return {
		kind: 'modelBinding',
		expanded: false,
		modelId: 'fast',
		protocol: 'openAi',
		provider: 'openrouter',
		apiId: '',
		efforts: {},
		defaultEffort: '',
		allowEffortSelect: false,
		summaries: false,
		maxOutputTokens: '',
		builtInTools: '',
		...partial,
	};
}
export function defaultToolSpec(partial?: Partial<ToolSpecData>): ToolSpecData {
	return {
		kind: 'toolSpec',
		expanded: false,
		toolName: 'my_tool',
		toolType: 'function',
		description: 'Playground stub tool — returns a fixed result.',
		category: 'playground',
		access: TOOL_ACCESS[0],
		permission: TOOL_PERMISSION[0],
		loadTier: TOOL_LOAD_TIERS[0],
		paths: '*',
		inputJson: DEFAULT_TOOL_INPUT_SCHEMA,
		outputJson: DEFAULT_TOOL_OUTPUT_SCHEMA,
		...partial,
	};
}

export function defaultTurnBehaviourData(partial?: Partial<TurnBehaviourData>): TurnBehaviourData {
	return {
		kind: 'turnBehaviour',
		expanded: false,
		resumeEnabled: false,
		allowContinue: [],
		autoContinue: [],
		...partial,
	};
}

export function defaultObservabilityData(partial?: Partial<ObservabilityData>): ObservabilityData {
	return {
		kind: 'observability',
		expanded: false,
		writeTo: '',
		...partial,
	};
}
