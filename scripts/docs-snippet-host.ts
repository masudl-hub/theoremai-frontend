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
	TextProfileDefinition,
	TurnHistoryMessage,
	TurnRequest,
} from '@theoremjs/agents';
import type {
	DecisionProfileDefinition,
	HostProfileDefinition,
} from '@theoremjs/agents/kernel';

export declare const profile: Profile;
export declare const desk: Profile;
export declare const hostOptions: ProviderHostOptions;
export declare const callId: string;
export declare const input: unknown;
export declare const history: TurnHistoryMessage[];
export declare const manifestBase64: string;
export declare const gateId: string;
export declare const onEvent: (event: unknown) => void;
export declare const transport: {
	invoke(request: { gateId: string; decision: 'approve' | 'deny' }, onEvent: (event: unknown) => void): Promise<void>;
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

/** A valid profile of each type: `profile:<type>` samples spread it, then add their own members. */
export const base: {
	text: TextProfileDefinition;
	image: ImageProfileDefinition;
	speech: SpeechProfileDefinition;
	live: LiveProfileDefinition;
	decision: DecisionProfileDefinition;
	host: HostProfileDefinition;
} = {
	text: {
		type: 'text',
		id: 'snippet.text',
		identity: { handle: 'snippet', system: 'You help.' },
		models: { main: { provider: 'openrouter', apiId: 'openrouter/free', keySlot: 'openrouter' } },
		tools: { allow: [] },
		inputs: {},
	},
	image: {
		type: 'image',
		id: 'snippet.image',
		identity: { handle: 'snippet', system: 'Draw.' },
		models: {
			main: {
				provider: 'google',
				apiId: 'gemini-2.5-flash-image',
				keySlot: 'google',
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
				provider: 'google',
				apiId: 'gemini-3.1-flash-tts-preview',
				keySlot: 'google',
			},
		},
		speech: {},
	},
	live: {
		type: 'live',
		id: 'snippet.live',
		identity: { handle: 'snippet', system: 'You talk.' },
		models: { main: { provider: 'google', apiId: 'gemini-3.1-flash-live-preview', keySlot: 'google' } },
		tools: { allow: [] },
		live: {},
	},
	decision: {
		type: 'decision',
		id: 'snippet.decision',
		identity: { handle: 'snippet' },
		models: { jev: { provider: 'typesafe', apiId: 'jev-latest', keySlot: 'typesafe' } },
		inputs: { state: 'json' },
		decision: { contract: 'snippet.v1' },
	},
	host: {
		type: 'host',
		id: 'snippet.host',
		tools: { allow: [] },
	},
};
