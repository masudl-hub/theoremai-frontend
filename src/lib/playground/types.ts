import type { Edge, Node } from '@xyflow/svelte';
import type {
	EgressOnBlock,
	GeminiFreeBucket,
	Protocol,
	Provider,
	SchemaEnforcement,
	SpeechAudioFormat,
	StreamMode,
	SummaryMode,
	ThinkingLevel,
	ToolLoadTier,
} from 'theorum/schema';
import { DEFAULT_TOOL_INPUT_SCHEMA, DEFAULT_TOOL_OUTPUT_SCHEMA } from './tool-schema';

/**
 * Canvas node kinds.
 * Multiples nest as children (e.g. models → modelSpec, tools → toolSpec).
 */
export type FacetKind =
	| 'identity'
	| 'models'
	| 'modelSpec'
	| 'tools'
	| 'toolSpec'
	| 'inputs'
	| 'outputs'
	| 'guardrails';

export type IdentityData = {
	kind: 'identity';
	expanded: boolean;
	agentId: string;
	handle: string;
	system: string;
	chat: boolean;
};

/** Top-level `profile.model` — protocol/provider/allow/select/thinking/maxSteps. */
export type ModelsData = {
	kind: 'models';
	expanded: boolean;
	protocol: Protocol;
	provider: Provider;
	thinking: ThinkingLevel;
	maxSteps: number;
	/** `model.controls` — only ControlId `'thinking'` today */
	thinkingControl: boolean;
	key: GeminiFreeBucket | '';
};

/** One entry in `profile.model.config[id]` (+ allow/select). */
export type ModelSpecData = {
	kind: 'modelSpec';
	expanded: boolean;
	modelId: string;
	apiId: string;
	temperature: number;
	maxOutputTokens: number;
	thinkingOn: ThinkingLevel;
	thinkingOff: ThinkingLevel;
	thinkingLevels: ThinkingLevel[];
	summariesOn: SummaryMode;
	summariesOff: SummaryMode;
	builtInTools: string;
	selectLabel: string;
};

/** Hub for custom tools — allow is derived from child toolSpec nodes. */
export type ToolsData = {
	kind: 'tools';
	expanded: boolean;
	/** Designated function tool id for T2 promotion (must return { loaded: string[] }). */
	t2Loader: string;
};

export type PlaygroundToolType = 'function';

export type ToolAccessValue = 'read-only' | 'read-write' | 'destructive';
export type ToolPermissionValue = 'auto' | 'session_consent' | 'always_confirm';

/** One custom tool — compiles to registerTool + tools.allow entry. */
export type ToolSpecData = {
	kind: 'toolSpec';
	expanded: boolean;
	toolName: string;
	toolType: PlaygroundToolType;
	description: string;
	category: string;
	access: ToolAccessValue;
	permission: ToolPermissionValue;
	loadTier: ToolLoadTier;
	/** Comma-separated paths; `*` = all. */
	paths: string;
	/** JSON Schema object as text. */
	inputJson: string;
	outputJson: string;
};

export type InputsData = {
	kind: 'inputs';
	expanded: boolean;
	text: boolean;
	attachmentsAccept: string[];
	voiceAccept: string[];
	maxFiles: number;
	maxBytes: number;
	maxTurnBytes: number;
};

/**
 * Profile `outputs` — structured is a registered schema id (or null).
 * Schema bodies live in `registerStructured`, not on the profile.
 */
export type OutputsData = {
	kind: 'outputs';
	expanded: boolean;
	mode: 'text' | 'structured';
	schemaId: string;
	/** Optional body for export: emits registerStructured(schemaId, …) */
	schemaEnforced: SchemaEnforcement;
	schemaJson: string;
	streamMode: StreamMode;
	streamThoughts: boolean;
	gateMedia: boolean;
	validationEnabled: boolean;
	maxRetries: number;
	repairGuidance: string;
	imageEnabled: boolean;
	imageAspectRatio: string;
	imageSize: string;
	imageMimeType: string;
	imageMaxInputImages: number;
	speechEnabled: boolean;
	speechVoice: string;
	speechFormat: SpeechAudioFormat;
	resumeEnabled: boolean;
	allowContinue: string[];
	autoContinue: string[];
};

export type GuardrailsData = {
	kind: 'guardrails';
	expanded: boolean;
	canary: boolean;
	sanitizeInput: boolean;
	redactSensitive: boolean;
	quotaEnabled: boolean;
	perDay: number;
	egressMode: 'default' | 'none' | 'custom';
	onBlock: EgressOnBlock;
	egressMaxRetries: number;
};

export type FacetData =
	| IdentityData
	| ModelsData
	| ModelSpecData
	| ToolsData
	| ToolSpecData
	| InputsData
	| OutputsData
	| GuardrailsData;

export type PlaygroundNode = Node<FacetData, 'facet'>;
export type PlaygroundEdge = Edge;

export type CompileIssue = {
	nodeId: string;
	facet: FacetKind;
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
export type ToolRegistration = {
	type: PlaygroundToolType;
	name: string;
	description: string;
	category: string;
	access: ToolAccessValue;
	permission: ToolPermissionValue;
	loadTier: ToolLoadTier;
	paths: string[];
	inputSchema: Record<string, unknown>;
	outputSchema: Record<string, unknown>;
};

export type CompileResult =
	| {
			ok: true;
			agentId: string;
			profile: Record<string, unknown>;
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

export const FACET_LABEL: Record<FacetKind, string> = {
	identity: 'Describe agent',
	models: 'Models',
	modelSpec: 'Model',
	tools: 'Tools',
	toolSpec: 'Tool',
	inputs: 'Inputs',
	outputs: 'Outputs',
	guardrails: 'Guardrails',
};

export const DRAG_HANDLE = '.facet-head';

export function defaultModelSpec(partial?: Partial<ModelSpecData>): ModelSpecData {
	return {
		kind: 'modelSpec',
		expanded: false,
		modelId: 'fast',
		apiId: '',
		temperature: 0.3,
		maxOutputTokens: 2048,
		thinkingOn: 'high',
		thinkingOff: 'minimal',
		thinkingLevels: ['minimal', 'low', 'medium', 'high'],
		summariesOn: 'auto',
		summariesOff: 'none',
		builtInTools: '',
		selectLabel: 'fast',
		...partial,
	};
}

export function defaultToolSpec(partial?: Partial<ToolSpecData>): ToolSpecData {
	const toolType: PlaygroundToolType = 'function';
	const base: ToolSpecData = {
		kind: 'toolSpec',
		expanded: false,
		toolName: 'lookup_crm',
		toolType,
		description: 'Playground stub tool — returns a fixed result.',
		category: 'playground',
		access: 'read-only',
		permission: 'auto',
		loadTier: 'T0',
		paths: '*',
		inputJson: DEFAULT_TOOL_INPUT_SCHEMA,
		outputJson: DEFAULT_TOOL_OUTPUT_SCHEMA,
	};
	return {
		...base,
		...partial,
		toolType,
		loadTier: partial?.loadTier ?? base.loadTier,
	};
}
