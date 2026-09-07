import type { Edge, Node } from '@xyflow/svelte';
import type {
	ProfileDefinition,
	ProfileImageSpec,
	ProfileLiveSpec,
	ProfileSpeechSpec,
	ProfileType,
} from 'theorum';
import type {
	EgressOnBlock,
	LiveActivityHandling,
	LiveSpeechSensitivity,
	OverflowKeySlot,
	Protocol,
	Provider,
	SchemaEnforcement,
	SpeechAudioFormat,
	StreamMode,
	SummaryMode,
	ThinkingLevel,
	ToolLoadTier,
	TurnStopKind,
} from 'theorum/schema';
import { DEFAULT_TOOL_INPUT_SCHEMA, DEFAULT_TOOL_OUTPUT_SCHEMA } from './tool-schema';

export type { ProfileType };

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
	| 'guardrails'
	| 'image'
	| 'speech'
	| 'live';

export type IdentityData = {
	kind: 'identity';
	expanded: boolean;
	agentId: string;
	profileType: ProfileType | '';
	handle: string;
	system: string;
	chat: boolean;
	includeTools?: boolean;
	includeInputs?: boolean;
	includeOutputs?: boolean;
	includeGuardrails?: boolean;
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
	key: OverflowKeySlot | '';
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
	validationEnabled: boolean;
	maxRetries: number;
	repairGuidance: string;
	imageEnabled: boolean;
	imageAspectRatio: string;
	imageSize: string;
	imageMimeType: string;
	imageMaxInputImages: number;
	/** When true, request interleaved assistant text alongside generated images. */
	imageIncludeText: boolean;
	speechEnabled: boolean;
	speechVoice: string;
	speechFormat: SpeechAudioFormat;
	resumeEnabled: boolean;
	allowContinue: TurnStopKind[];
	autoContinue: TurnStopKind[];
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

export type ImageData = {
	kind: 'image';
	expanded: boolean;
	aspectRatio: NonNullable<ProfileImageSpec['aspectRatio']>;
	size: NonNullable<ProfileImageSpec['size']>;
	mimeType: NonNullable<ProfileImageSpec['mimeType']>;
	maxInputImages: NonNullable<ProfileImageSpec['maxInputImages']>;
	includeText: NonNullable<ProfileImageSpec['includeText']>;
};

export type SpeechData = {
	kind: 'speech';
	expanded: boolean;
	voice: NonNullable<ProfileSpeechSpec['voice']>;
	format: NonNullable<ProfileSpeechSpec['format']>;
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

export type FacetData =
	| IdentityData
	| ModelsData
	| ModelSpecData
	| ToolsData
	| ToolSpecData
	| InputsData
	| OutputsData
	| GuardrailsData
	| ImageData
	| SpeechData
	| LiveData;

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

export const FACET_LABEL: Record<FacetKind, string> = {
	identity: 'Profile',
	models: 'Models',
	modelSpec: 'Model',
	tools: 'Tools',
	toolSpec: 'Tool',
	inputs: 'Inputs',
	outputs: 'Outputs',
	guardrails: 'Guardrails',
	image: 'Image',
	speech: 'Speech',
	live: 'Live',
};

export const DRAG_HANDLE = '.facet-head';

export function defaultImageSpec(partial?: Partial<ImageData>): ImageData {
	return {
		kind: 'image',
		expanded: false,
		aspectRatio: '',
		size: '',
		mimeType: 'image/png',
		maxInputImages: 3,
		includeText: false,
		...partial,
	};
}

export function defaultSpeechSpec(partial?: Partial<SpeechData>): SpeechData {
	return {
		kind: 'speech',
		expanded: false,
		voice: '',
		format: 'pcm',
		...partial,
	};
}

export function defaultLiveSpec(partial?: Partial<LiveData>): LiveData {
	return {
		kind: 'live',
		expanded: false,
		ingressAudio: true,
		ingressVideo: false,
		ingressText: true,
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
