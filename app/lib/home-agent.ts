/**
 * The one agent the goals screen edits and runs: the studio's travel concierge, pared to what a
 * first version has. Its draft, compiler, printer and reader are the studio's own. This file adds
 * the starting draft and what each token changes in it.
 */
import {
	agentDraft,
	compileWorkspace,
	createBlankDraft,
	createExampleDraft,
	readStudioSource,
	type StudioDraft,
	type StudioIssue,
	type StudioRunPayload,
	type StudioSourceError,
	type StudioSourceSpan,
	type StudioWorkspace,
	setProfileType,
	studioSource,
	withAgentDraft,
	workspaceFromDraft,
	workspaceRunAgent,
} from '@theoremjs/studio';
import type { GoalTokenId } from './home-goals';

const SYSTEM = [
	'You are a travel concierge.',
	'Give the recommendation first, in a few short lines.',
	'Call get_weather before you say anything about the weather.',
	'When a file is attached, say what you can use from it.',
].join('\n');

const MEDIA = { attachmentsAccept: ['image/*'], voiceAccept: ['audio/*'] };
const NO_MEDIA = { attachmentsAccept: [], voiceAccept: [] };
const WEATHER_HOSTS = ['api.open-meteo.com'];

const TRIP_STYLES = JSON.stringify({ style: ['budget', 'comfort', 'splurge'] });
const MEDIA_LIMITS = JSON.stringify({ 'image/*': 512_000, 'audio/*': 2_000_000 });
const ITINERARY = JSON.stringify({
	type: 'object',
	properties: {
		days: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					day: { type: 'number' },
					stops: { type: 'array', items: { type: 'string' } },
				},
				required: ['day', 'stops'],
			},
		},
	},
	required: ['days'],
});

function createHomeDraft(): StudioDraft {
	const concierge = createExampleDraft();
	return {
		...concierge,
		identity: { ...concierge.identity, system: SYSTEM },
		...modelsFor({ isOpen: false, isPicked: false }),
		tools: { ...concierge.tools, t2Loader: '' },
		toolSpecs: concierge.toolSpecs.filter(({ toolName }) => toolName === 'get_weather'),
		inputs: {
			...concierge.inputs,
			...NO_MEDIA,
			limitsByMimeJson: MEDIA_LIMITS,
		},
		// The kernel's own defaults, so each boundary token is a change the file shows.
		outputs: { ...concierge.outputs, streamMode: 'buffered' },
		guardrails: { ...createBlankDraft().guardrails, allowedHosts: WEATHER_HOSTS },
	};
}

/** The workspace on screen. `text` is the text agent set aside while a picture or a call is on. */
export type HomeAgent = { workspace: StudioWorkspace; text?: StudioWorkspace };

const keyOf = (workspace: StudioWorkspace) => workspace.chatWith;

function draftOf(workspace: StudioWorkspace): StudioDraft {
	const draft = agentDraft(workspace, keyOf(workspace));
	if (!draft) throw new Error('The goals screen has no agent.');
	return draft;
}

const edited = (workspace: StudioWorkspace, edit: (draft: StudioDraft) => StudioDraft) =>
	withAgentDraft(workspace, keyOf(workspace), edit(draftOf(workspace)));

export type DraftEdit = (draft: StudioDraft) => StudioDraft;

/** A change that holds whatever the agent makes. It is written to the text agent set aside too. */
type FieldEdit = { isOn: (draft: StudioDraft) => boolean; on: DraftEdit; off: DraftEdit };

const sameList = (a: readonly string[], b: readonly string[]) =>
	a.length === b.length && a.every((value, index) => value === b[index]);

function detectEdit(
	detector: 'credentials' | 'injection',
	boundary: 'reply' | 'tool_output_http',
): FieldEdit {
	const rest = createBlankDraft().guardrails.detect[detector][boundary];
	const set = (action: typeof rest): DraftEdit => {
		return (draft) => ({
			...draft,
			guardrails: {
				...draft.guardrails,
				detect: {
					...draft.guardrails.detect,
					[detector]: { ...draft.guardrails.detect[detector], [boundary]: action },
				},
			},
		});
	};
	return {
		isOn: (draft) => draft.guardrails.detect[detector][boundary] === 'block',
		on: set('block'),
		off: set(rest),
	};
}

const inputsEdit = (inputs: Partial<StudioDraft['inputs']>): DraftEdit => {
	return (draft) => ({ ...draft, inputs: { ...draft.inputs, ...inputs } });
};

const outputsEdit = (outputs: Partial<StudioDraft['outputs']>): DraftEdit => {
	return (draft) => ({ ...draft, outputs: { ...draft.outputs, ...outputs } });
};

const FIELD_EDITS: Partial<Record<GoalTokenId, FieldEdit>> = {
	'allow-media': {
		isOn: (draft) =>
			sameList(draft.inputs.attachmentsAccept, MEDIA.attachmentsAccept) &&
			sameList(draft.inputs.voiceAccept, MEDIA.voiceAccept),
		on: inputsEdit(MEDIA),
		off: inputsEdit(NO_MEDIA),
	},
	'stream-reply': {
		isOn: (draft) => draft.outputs.streamMode === 'sse',
		on: outputsEdit({ streamMode: 'sse' }),
		off: outputsEdit({ streamMode: 'buffered' }),
	},
	'typed-choice': {
		isOn: (draft) => draft.inputs.slotsJson.trim() !== '',
		on: inputsEdit({ slotsJson: TRIP_STYLES }),
		off: inputsEdit({ slotsJson: '' }),
	},
	'declared-shape': {
		isOn: (draft) => draft.outputs.mode === 'structured',
		on: (draft) => ({
			...draft,
			outputs: {
				...draft.outputs,
				mode: 'structured',
				schemaId: 'itinerary',
				schemaJson: ITINERARY,
			},
		}),
		off: (draft) => ({
			...draft,
			outputs: { ...draft.outputs, mode: 'text', schemaId: '', schemaJson: '' },
		}),
	},
	'block-secret': detectEdit('credentials', 'reply'),
	'block-injection': detectEdit('injection', 'tool_output_http'),
	'refuse-after-read': {
		isOn: (draft) => draft.guardrails.taintAfterRemoteRead === 'write',
		on: (draft) => ({
			...draft,
			guardrails: { ...draft.guardrails, taintAfterRemoteRead: 'write' },
		}),
		off: (draft) => ({ ...draft, guardrails: { ...draft.guardrails, taintAfterRemoteRead: '' } }),
	},
};

const MODEL_TOKENS = { openrouter: 'isOpen', 'pick-model': 'isPicked' } as const;

type ModelToken = keyof typeof MODEL_TOKENS;
type ModelChoice = { isOpen: boolean; isPicked: boolean };

const isModelToken = (id: GoalTokenId): id is ModelToken => id in MODEL_TOKENS;

/** Which of the two model changes a text agent has, read from its models. */
const modelChoice = (draft: StudioDraft): ModelChoice => ({
	isOpen: draft.modelBindings.some(({ provider }) => provider === 'openrouter'),
	isPicked: draft.models.allowModelSelect,
});

/**
 * The models for each pair of changes, from the concierge's own three. One model has no picker.
 * A picker has two models, and an effort to pick on each model that takes more than one.
 */
function modelsFor({
	isOpen,
	isPicked,
}: ModelChoice): Pick<StudioDraft, 'models' | 'modelBindings'> {
	const { models, modelBindings } = createExampleDraft();
	const named = (id: string) => modelBindings.filter(({ modelId }) => modelId === id);
	const plain = (binding: StudioDraft['modelBindings'][number]) => ({
		...binding,
		efforts: [],
		defaultEffort: '',
		allowEffortSelect: false,
		summaries: null,
	});
	const first = isOpen
		? named('open')
		: named('smart').map(isPicked ? (binding) => binding : plain);
	const second = isPicked ? named(isOpen ? 'smart' : 'fast') : [];
	return {
		models: { ...models, defaultModel: isOpen ? 'open' : 'smart', allowModelSelect: isPicked },
		modelBindings: [...first, ...second],
	};
}

const TYPES: Partial<Record<GoalTokenId, 'image' | 'live'>> = {
	picture: 'image',
	'live-call': 'live',
};

const typeOf = (workspace: StudioWorkspace) => draftOf(workspace).identity.profileType;

/** A picture is made in one call, with no tools. The text agent keeps its own for the way back. */
const typed = (text: StudioWorkspace, type: 'image' | 'live') =>
	edited(text, (draft) =>
		type === 'image'
			? { ...setProfileType(draft, type), toolSpecs: [] }
			: setProfileType(draft, type),
	);

/** The text agent under whatever is on screen. */
function textOf(agent: HomeAgent): StudioWorkspace {
	if (agent.text) return agent.text;
	return typeOf(agent.workspace) === 'text'
		? agent.workspace
		: edited(agent.workspace, (draft) => setProfileType(draft, 'text'));
}

/** Whether the agent has a token's change now, read from the draft and never kept beside it. */
export function tokenIsOn(agent: HomeAgent, id: GoalTokenId): boolean {
	const draft = draftOf(agent.workspace);
	const field = FIELD_EDITS[id];
	if (field) return field.isOn(draft);
	const type = TYPES[id];
	if (type) return draft.identity.profileType === type;
	return isModelToken(id) && modelChoice(draftOf(textOf(agent)))[MODEL_TOKENS[id]];
}

/** A token with nothing to change: it only says what to try. */
export function tokenEdits(id: GoalTokenId): boolean {
	return id in FIELD_EDITS || id in MODEL_TOKENS || id in TYPES;
}

export function toggleToken(agent: HomeAgent, id: GoalTokenId): HomeAgent {
	const isOn = tokenIsOn(agent, id);
	const field = FIELD_EDITS[id];
	if (field) {
		const edit = isOn ? field.off : field.on;
		return {
			workspace: edited(agent.workspace, edit),
			text: agent.text && edited(agent.text, edit),
		};
	}
	const text = textOf(agent);
	const type = TYPES[id];
	if (type) return isOn ? { workspace: text } : { workspace: typed(text, type), text };
	if (!isModelToken(id)) return agent;
	const choice = modelChoice(draftOf(text));
	const next = edited(text, (draft) => ({
		...draft,
		...modelsFor({ ...choice, [MODEL_TOKENS[id]]: !isOn }),
	}));
	// The models are the text agent's. A picture or a call on screen stays on screen.
	const shown = typeOf(agent.workspace);
	return shown === 'image' || shown === 'live'
		? { workspace: typed(next, shown), text: next }
		: { workspace: next };
}

/** What the open agent compiles to: what runs, and the file the editor shows. */
export type HomeCompile =
	| { ok: true; payload: StudioRunPayload; source: string }
	| { ok: false; issues: StudioIssue[] };

export function compileHomeAgent({ workspace }: HomeAgent): HomeCompile {
	const compiled = compileWorkspace(workspace, 'demo');
	if (!compiled.ok) return { ok: false, issues: compiled.issues };
	const run = workspaceRunAgent(compiled, draftOf(workspace).identity.agentId.trim());
	if (!run) return { ok: false, issues: [] };
	const { agentId, profile, customTools, structured, questions, dependencies } = run;
	return {
		ok: true,
		payload: {
			agentId,
			profile,
			customTools,
			structured,
			questions,
			dependencies,
			connectionMode: 'demo',
		},
		source: studioSource(run),
	};
}

/** The editor's text read back into the agent. A text that cannot be read changes nothing. */
export function readHomeSource(
	agent: HomeAgent,
	text: string,
): { agent: HomeAgent; errors: StudioSourceError[]; spans: StudioSourceSpan[] } {
	const { workspace } = agent;
	const read = readStudioSource(text, {
		...draftOf(workspace),
		toolSpecs: workspace.toolSpecs,
	});
	if (!read.ok) return { agent, errors: read.errors, spans: [] };
	const next = withAgentDraft(workspace, keyOf(workspace), read.draft, read.registered);
	// A file that is typed by hand has no text agent to return to but itself.
	return { agent: { workspace: next }, errors: [], spans: read.spans };
}

export function createHomeAgent(): HomeAgent {
	return { workspace: workspaceFromDraft(createHomeDraft()) };
}

/** The draft changed by a form of the studio's. Like a file typed by hand, it has no text agent to return to. */
export function editHomeDraft(agent: HomeAgent, edit: DraftEdit): HomeAgent {
	return { workspace: edited(agent.workspace, edit) };
}

/** The agent as one draft, for the studio to open. */
export function homeAgentDraft(agent: HomeAgent): StudioDraft {
	return draftOf(agent.workspace);
}
