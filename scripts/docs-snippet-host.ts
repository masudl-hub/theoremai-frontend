/**
 * What the host owns in a /docs sample: names the sample uses but never defines. Each is typed
 * from the package, so a sample that misuses one still fails to type-check. Everything else a
 * sample uses must come from `@theoremjs/agents` or `zod`, or be defined in the sample.
 */
import type { invokeTool } from '@theoremjs/agents';
import type {
	ImageProfileDefinition,
	LiveProfileDefinition,
	ProviderHostOptions,
	Profile,
	SpeechProfileDefinition,
	TranscriptionProfileDefinition,
	TextProfileDefinition,
	TurnEvent,
	TurnHistoryMessage,
	TurnRequest,
} from '@theoremjs/agents';
import { z } from 'zod';
import type {
	DecisionProfileDefinition,
	EmbeddingProfileDefinition,
	HostProfileDefinition,
} from '@theoremjs/agents/kernel';

export declare const profile: Profile;
export declare const desk: Profile;
export declare const hostOptions: ProviderHostOptions;
export declare const callId: string;
export declare const clipBase64: string;
export declare const input: unknown;
export declare const history: TurnHistoryMessage[];
export declare const manifestBase64: string;
export declare const gateId: string;
export declare const operationId: string;
export declare const onEvent: (event: unknown) => void;
export declare const transport: {
	invoke(request: import('@theoremjs/react').TheoremInvokeRequest, onEvent: (event: unknown) => void): Promise<void>;
};
export declare const request: TurnRequest;
export declare const secrets: { oauthStateSecret: string };
export declare const session: { id: string };
export declare const user: { id: string };
export declare const params: URLSearchParams;
export declare function redirect(url: string): void;
export declare function send(event: unknown): void;
export declare function vaultCredentials(userId: string): NonNullable<Parameters<typeof invokeTool>[0]['credentials']>;
export declare const gated: {
	name: string;
	arguments: Record<string, unknown>;
	snapshot: NonNullable<Parameters<typeof invokeTool>[0]['snapshot']>;
};
export declare const base64JpegBytes: string;
export declare const base64PcmChunk: string;
export declare const partialReplyText: string;
export declare const sessionId: string;
export declare const currentHistory: TurnHistoryMessage[];
export declare const previousMessages: TurnHistoryMessage[];
export declare const previousDoneEvent: { stop: string };
export declare const doneEvent: Extract<TurnEvent, { type: 'done' }>;
export declare function saveImage(data: string, path: string): void;
export declare function playAudio(mimeType: string, data: string): void;
export declare function playSpeakerAudio(chunk: string): void;
export declare function saveSessionHistory(id: string, history: unknown): Promise<void>;
export declare function fetchShipment(
	id: string,
	opts?: { signal?: AbortSignal },
): Promise<{ status: 'hold' | 'cleared' | 'in_transit'; holdReason?: string }>;
export declare const db: { query(q: string): Promise<{ rows: unknown[] }> };
export declare function computeTrajectory(routeId: string, opts?: { signal?: AbortSignal }): Promise<unknown>;
export declare const remoteClient: { fetchBlob(): Promise<unknown> };
export declare const userSessionId: string;
export declare const currentUserId: string;
export declare const userSecretInput: string;
export declare const userCredentials: import('@theoremjs/agents/kernel').ToolCredentialSource;
export declare const callbackParams: URLSearchParams;
export declare const ctx: { stage: string; tool: string };
export declare const kmsClient: {
	fetchSecret(slot: string, opts?: { signal?: AbortSignal }): Promise<import('@theoremjs/agents').KeyCredential>;
};
export declare const secureVault: {
	load(userId: string, slot: string): Promise<import('@theoremjs/agents/kernel').ToolCredential | undefined>;
	save(userId: string, slot: string, cred: import('@theoremjs/agents/kernel').ToolCredential): Promise<void>;
};

/** A valid profile of each type: `profile:<type>` samples spread it, then add their own members. */
export const base: {
	text: TextProfileDefinition;
	image: ImageProfileDefinition;
	speech: SpeechProfileDefinition;
	transcription: TranscriptionProfileDefinition;
	live: LiveProfileDefinition;
	decision: DecisionProfileDefinition;
	embedding: EmbeddingProfileDefinition;
	host: HostProfileDefinition;
} = {
	text: {
		type: 'text',
		id: 'snippet.text',
		identity: { handle: 'snippet', system: 'You help.' },
		models: {
			main: { protocol: 'openRouterOpenAi', provider: 'openrouter', apiId: 'openrouter/free', keySlot: 'openrouter' },
		},
		tools: { allow: [] },
		inputs: {},
	},
	image: {
		type: 'image',
		id: 'snippet.image',
		identity: { handle: 'snippet', system: 'Draw.' },
		models: {
			main: {
				protocol: 'geminiInteractions',
				provider: 'gemini',
				apiId: 'gemini-2.5-flash-image',
				keySlot: 'gemini',
			},
		},
		tools: { allow: [] },
		inputs: {},
		image: {},
	},
	speech: {
		type: 'speech',
		id: 'snippet.speech',
		identity: { handle: 'snippet' },
		models: {
			main: {
				protocol: 'geminiInteractions',
				provider: 'gemini',
				apiId: 'gemini-3.1-flash-tts-preview',
				keySlot: 'gemini',
			},
		},
		speech: {},
	},
	live: {
		type: 'live',
		id: 'snippet.live',
		identity: { handle: 'snippet', system: 'You talk.' },
		models: {
			main: { protocol: 'geminiLive', provider: 'gemini', apiId: 'gemini-3.1-flash-live-preview', keySlot: 'gemini' },
		},
		tools: { allow: [] },
		live: {},
	},
	decision: {
		type: 'decision',
		id: 'snippet.decision',
		identity: { handle: 'snippet' },
		models: { jev: { protocol: 'systemOne', provider: 'typesafe', apiId: 'jev-latest', keySlot: 'typesafe' } },
		inputs: { state: 'json' },
		decision: { contract: 'snippet.v1' },
	},
	transcription: {
		type: 'transcription',
		id: 'snippet.transcription',
		identity: { handle: 'snippet' },
		models: {
			main: {
				protocol: 'openRouterTranscriptions',
				provider: 'openrouter',
				apiId: 'mistralai/voxtral-mini-transcribe-3-0',
				keySlot: 'openrouter',
			},
		},
		inputs: { voice: { accept: ['audio/*'] }, maxFiles: 1, maxBytes: 20971520, maxTurnBytes: 20971520 },
	},
	embedding: {
		type: 'embedding',
		id: 'snippet.embedding',
		identity: { handle: 'snippet' },
		models: {
			main: {
				protocol: 'geminiEmbeddings',
				provider: 'gemini',
				apiId: 'gemini-embedding-2-preview',
				keySlot: 'gemini',
			},
		},
		inputs: {},
	},
	host: {
		type: 'host',
		id: 'snippet.host',
		tools: { allow: [] },
	},
};

/** What a `models` sample leaves out of a binding. */
export const baseBinding = {
	protocol: 'openRouterOpenAi' as const,
	provider: 'openrouter',
	apiId: 'openrouter/free',
	keySlot: 'openrouter',
};

const tool = {
	name: 'snippet',
	description: 'A snippet.',
	input: z.object({}),
	output: z.string(),
	category: 'snippet',
	access: 'read-only' as const,
	paths: ['*'],
	loadTier: 'T0' as const,
	permission: 'auto' as const,
};

/** What a `tool:<type>` sample leaves out: every field a tool of that type needs. */
export const baseTool = {
	function: { ...tool, type: 'function' as const, handler: () => '' },
	http: { ...tool, type: 'http' as const, endpoint: 'https://example.com', method: 'GET' as const },
	mcp: {
		...tool,
		type: 'mcp' as const,
		serverUrl: 'https://example.com/mcp',
		mcpToolName: 'snippet',
	},
	agent: { ...tool, type: 'agent' as const, profile: 'snippet.agent' },
};
