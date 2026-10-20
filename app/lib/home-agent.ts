import { resolveGuardrailPolicy } from '@theoremjs/agents';
import { DETECTORS } from '@theoremjs/agents/guardrails';
/**
 * The one agent the goals screen edits and runs: the studio's travel concierge, pared to what a
 * first version has. Its draft, compiler, printer and reader are the studio's own. This file adds
 * the starting draft and what each token changes in it.
 */
import {
	agentDraft,
	compileWorkspace,
	createBlankDraft,
	createConsoleExampleDraft,
	createDecisionExampleDraft,
	createExampleDraft,
	createGeminiEmbeddingExampleDraft,
	createNarratorExampleDraft,
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
import { SITE_KEYS } from './studio-keys';
import { ON_SITE } from './studio-supplies';

const SYSTEM = [
	'You are a travel concierge.',
	'Give the recommendation first, in a few short lines.',
	'Call get_weather before you say anything about the weather.',
	'When a file is attached, say what you can use from it.',
].join('\n');

const MEDIA = { attachmentsAccept: ['image/*', 'application/pdf'], voiceAccept: ['audio/*'] };
const NO_MEDIA = { attachmentsAccept: [], voiceAccept: [] };
const WEATHER_HOSTS = ['api.open-meteo.com'];

const TRIP_STYLES = JSON.stringify({
	style: ['budget', 'comfort', 'splurge'],
	pace: ['relaxed', 'balanced', 'packed'],
});
const MEDIA_LIMITS = JSON.stringify({
	'image/*': 512_000,
	'application/pdf': 2_000_000,
	'audio/*': 2_000_000,
});
const ITINERARY = JSON.stringify({
	type: 'object',
	properties: {
		destination: { type: 'string' },
		summary: { type: 'string' },
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
	required: ['destination', 'summary', 'days'],
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

const FIELD_EDITS: Partial<Record<GoalTokenId, FieldEdit>> = {
	'trip-brief': {
		isOn: (draft) =>
			draft.inputs.slotsJson === TRIP_STYLES && draft.outputs.schemaId === 'itinerary',
		on: (draft) => ({
			...draft,
			inputs: { ...draft.inputs, ...MEDIA, slotsJson: TRIP_STYLES },
			outputs: {
				...draft.outputs,
				mode: 'structured',
				schemaId: 'itinerary',
				schemaJson: ITINERARY,
			},
		}),
		off: (draft) => ({
			...draft,
			inputs: { ...draft.inputs, ...NO_MEDIA, slotsJson: '' },
			outputs: { ...draft.outputs, mode: 'text', schemaId: '', schemaJson: '' },
		}),
	},
	'approve-tools': {
		isOn: (draft) =>
			draft.toolSpecs.some(
				(tool) => tool.toolName === 'get_weather' && tool.permission === 'always_confirm',
			),
		on: (draft) => ({
			...draft,
			outputs: { ...draft.outputs, streamMode: 'sse' },
			guardrails: {
				...draft.guardrails,
				detect: {
					...draft.guardrails.detect,
					credentials: { ...draft.guardrails.detect.credentials, reply: 'block' },
				},
			},
			toolSpecs: draft.toolSpecs.map((tool) =>
				tool.toolName === 'get_weather'
					? {
							...tool,
							permission: 'always_confirm',
							activity: 'Checking the weather',
							activityPast: 'Weather checked',
						}
					: tool,
			),
		}),
		off: (draft) => ({
			...draft,
			outputs: { ...draft.outputs, streamMode: 'buffered' },
			guardrails: {
				...draft.guardrails,
				detect: {
					...draft.guardrails.detect,
					credentials: {
						...draft.guardrails.detect.credentials,
						reply: createBlankDraft().guardrails.detect.credentials.reply,
					},
				},
			},
			toolSpecs: draft.toolSpecs.map((tool) => {
				if (tool.toolName !== 'get_weather') return tool;
				const original = createExampleDraft().toolSpecs.find(
					(entry) => entry.toolName === 'get_weather',
				);
				return {
					...tool,
					permission: 'auto',
					activity: original?.activity,
					activityPast: original?.activityPast,
				};
			}),
		}),
	},
	'file-types': {
		isOn: (draft) =>
			draft.inputs.attachmentsAccept.join(',') === 'application/pdf,image/png,image/jpeg',
		on: (draft) => ({
			...draft,
			inputs: {
				...draft.inputs,
				attachmentsAccept: ['application/pdf', 'image/png', 'image/jpeg'],
			},
		}),
		off: (draft) => ({ ...draft, inputs: { ...draft.inputs, attachmentsAccept: [] } }),
	},
	'file-limits': {
		isOn: (draft) => draft.inputs.maxFiles === 1 && draft.inputs.maxBytes === 250_000,
		on: (draft) => ({
			...draft,
			inputs: {
				...draft.inputs,
				attachmentsAccept: ['application/pdf'],
				voiceAccept: [],
				maxFiles: 1,
				maxBytes: 250_000,
				maxTurnBytes: 250_000,
				limitsByMimeJson: JSON.stringify({ 'application/pdf': 250_000 }),
			},
		}),
		off: (draft) => ({
			...draft,
			inputs: {
				...draft.inputs,
				attachmentsAccept: [],
				maxFiles: createExampleDraft().inputs.maxFiles,
				maxBytes: createExampleDraft().inputs.maxBytes,
				maxTurnBytes: createExampleDraft().inputs.maxTurnBytes,
				limitsByMimeJson: MEDIA_LIMITS,
			},
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

type ModelChoice = { isOpen: boolean; isPicked: boolean };

/** Which of the two model changes a text agent has, read from its models. */
const modelChoice = (draft: StudioDraft): ModelChoice => ({
	isOpen: draft.modelBindings.some(({ provider }) => provider === 'openrouter'),
	isPicked: draft.models.allowModelSelect,
});

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
	const gemini = named('smart')[0];
	const additional = isPicked
		? [
				...named('smart'),
				...named('fast'),
				...['gemini-3.8-flash'].map((apiId) => ({
					...gemini,
					modelId: apiId.replace('gemini-', ''),
					apiId,
					efforts: [
						{ alias: 'Minimal', level: 'minimal' as const },
						{ alias: 'Medium', level: 'medium' as const },
						{ alias: 'High', level: 'high' as const },
					],
					defaultEffort: 'Medium',
					allowEffortSelect: true,
					summaries: true,
				})),
			].filter((binding) => !first.some(({ modelId }) => modelId === binding.modelId))
		: [];
	const modelNames: Record<string, string> = {
		'gemini-3.1-flash-lite': 'Gemini 3.1 Flash Lite',
		'gemini-3.5-flash-lite': 'Gemini 3.5 Flash Lite',
		'gemini-3.8-flash': 'Gemini 3.8 Flash',
		'openrouter/free': 'OpenRouter Free',
	};
	const bindings = [...first, ...additional].map((binding) => ({
		...binding,
		modelId: modelNames[binding.apiId] ?? binding.apiId,
		efforts: binding.efforts.map((effort) => ({ ...effort, alias: effort.level })),
		defaultEffort:
			binding.efforts.find(({ alias }) => alias === binding.defaultEffort)?.level ?? '',
	}));
	return {
		models: { ...models, defaultModel: bindings[0].modelId, allowModelSelect: isPicked },
		modelBindings: bindings,
	};
}

const EXAMPLE_DRAFTS: Partial<Record<GoalTokenId, () => StudioDraft | Promise<StudioDraft>>> = {
	decision: createDecisionExampleDraft,
	host: createConsoleExampleDraft,
	embedding: createGeminiEmbeddingExampleDraft,
	speech: createNarratorExampleDraft,
};

const TYPES: Partial<Record<GoalTokenId, 'image' | 'live'>> = {
	'live-call': 'live',
};

const typeOf = (workspace: StudioWorkspace) => draftOf(workspace).identity.profileType;

/** A picture is made in one call, with no tools. The text agent keeps its own for the way back. */
const typed = (text: StudioWorkspace, type: 'image' | 'live') =>
	edited(text, (draft) =>
		type === 'image'
			? { ...setProfileType(draft, type, SITE_KEYS), toolSpecs: [] }
			: {
					...setProfileType(draft, type, SITE_KEYS),
					live: {
						...draft.live,
						transcriptionInput: true,
						transcriptionOutput: true,
						vadActivityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
						greeting: 'Welcome the traveler to Lisbon and ask what they would like to explore.',
					},
				},
	);

/** The text agent under whatever is on screen. */
function textOf(agent: HomeAgent): StudioWorkspace {
	if (agent.text) return agent.text;
	return typeOf(agent.workspace) === 'text'
		? agent.workspace
		: edited(agent.workspace, (draft) => setProfileType(draft, 'text', SITE_KEYS));
}

/** Whether the agent has a token's change now, read from the draft and never kept beside it. */
export function tokenIsOn(agent: HomeAgent, id: GoalTokenId): boolean {
	const draft = draftOf(agent.workspace);
	const field = FIELD_EDITS[id];
	if (field) return draft.identity.profileType === 'text' && field.isOn(draft);
	const example = EXAMPLE_DRAFTS[id];
	if (example) return draft.identity.profileType === id;
	const type = TYPES[id];
	if (type) return draft.identity.profileType === type;
	if (id !== 'providers' || draft.identity.profileType !== 'text') return false;
	const { isOpen, isPicked } = modelChoice(draftOf(textOf(agent)));
	return isOpen && isPicked;
}

/** A token with nothing to change: it only says what to try. */
export function tokenEdits(id: GoalTokenId): boolean {
	return id in FIELD_EDITS || id === 'providers' || id in TYPES || id in EXAMPLE_DRAFTS;
}

/**
 * The example a token turns on, made ahead of {@link toggleToken}: the decision example loads its
 * pictures first. Nothing when the token is no example, or its example is already on.
 */
export async function exampleSeed(
	agent: HomeAgent,
	id: GoalTokenId,
): Promise<StudioDraft | undefined> {
	const example = EXAMPLE_DRAFTS[id];
	return example && !tokenIsOn(agent, id) ? await example() : undefined;
}

/** The input examples: one shows at a time. */
const INPUT_EXAMPLES: readonly GoalTokenId[] = ['trip-brief', 'file-types', 'file-limits'];

/** The text agent with every field token off and no model picked: where an example or type starts. */
function clearedText(agent: HomeAgent): StudioWorkspace {
	let text = textOf(agent);
	for (const [fieldId, field] of Object.entries(FIELD_EDITS)) {
		if (tokenIsOn({ workspace: text }, fieldId as GoalTokenId)) text = edited(text, field.off);
	}
	return edited(text, (draft) => ({
		...draft,
		...modelsFor({ isOpen: false, isPicked: false }),
	}));
}

/** The agent a token changes: a text token needs the text agent, a mode turning on a cleared one. */
function preparedFor(agent: HomeAgent, id: GoalTokenId): HomeAgent {
	const prepared =
		(id in FIELD_EDITS || id === 'providers') && typeOf(agent.workspace) !== 'text'
			? { workspace: textOf(agent) }
			: agent;
	const isMode = id in EXAMPLE_DRAFTS || id in TYPES;
	return isMode && !tokenIsOn(prepared, id) ? { workspace: clearedText(prepared) } : prepared;
}

/** The agent with every input example but `id` off. */
function withoutOtherInputs(agent: HomeAgent, id: GoalTokenId): HomeAgent {
	let next = agent;
	for (const other of INPUT_EXAMPLES) {
		const edit = FIELD_EDITS[other];
		if (other !== id && edit && tokenIsOn(next, other)) {
			next = { workspace: edited(next.workspace, edit.off) };
		}
	}
	return next;
}

/** The example `seed` in place of the text agent, keeping its agent id and its tools' keys. */
function seededExample(text: StudioWorkspace, id: GoalTokenId, seed?: StudioDraft): HomeAgent {
	const source = draftOf(text);
	if (!seed) throw new Error(`The ${id} example was not made first.`);
	if (!seed.identity.profileType) throw new Error('The example has no profile type.');
	const draft =
		seed.identity.profileType === 'host'
			? seed
			: setProfileType(seed, seed.identity.profileType, SITE_KEYS);
	return {
		workspace: edited(text, () => ({
			...draft,
			identity: { ...draft.identity, agentId: source.identity.agentId },
			toolSpecs: draft.toolSpecs.map((tool) => ({
				...tool,
				key: source.toolSpecs.find((entry) => entry.toolName === tool.toolName)?.key ?? tool.key,
			})),
		})),
		text,
	};
}

/** The agent with a token turned on or off. An example token turning on takes its {@link exampleSeed}. */
export function toggleToken(agent: HomeAgent, id: GoalTokenId, seed?: StudioDraft): HomeAgent {
	const prepared = preparedFor(agent, id);
	const isOn = tokenIsOn(prepared, id);
	const current =
		!isOn && INPUT_EXAMPLES.includes(id) ? withoutOtherInputs(prepared, id) : prepared;
	const field = FIELD_EDITS[id];
	if (field) {
		const edit = isOn ? field.off : field.on;
		return {
			workspace: edited(current.workspace, edit),
			text: current.text && edited(current.text, edit),
		};
	}
	const text = textOf(current);
	if (id in EXAMPLE_DRAFTS) return isOn ? { workspace: text } : seededExample(text, id, seed);
	const type = TYPES[id];
	if (type) return isOn ? { workspace: text } : { workspace: typed(text, type), text };
	if (id !== 'providers') return current;
	const next = edited(text, (draft) => ({
		...draft,
		...modelsFor({ isOpen: !isOn, isPicked: !isOn }),
	}));
	return { workspace: next };
}

/** What the open agent compiles to: what runs, and the file the editor shows. */
export type HomeCompile =
	| { ok: true; payload: StudioRunPayload; source: string }
	| { ok: false; issues: StudioIssue[] };

export function compileHomeAgent({ workspace }: HomeAgent): HomeCompile {
	const compiled = compileWorkspace(workspace, ON_SITE);
	if (!compiled.ok) return { ok: false, issues: compiled.issues };
	const run = workspaceRunAgent(compiled, draftOf(workspace).identity.agentId.trim());
	if (!run) return { ok: false, issues: [] };
	const { agentId, profile, customTools, structured, questions, dependencies } = run;
	const policy = resolveGuardrailPolicy(profile.guardrails);
	const declared = profile.guardrails?.detect;
	const detect = Object.fromEntries(
		DETECTORS.map((detector) => {
			const rule = typeof declared === 'object' ? declared[detector] : undefined;
			return [
				detector,
				{
					...(typeof rule === 'object' ? rule : {}),
					at: policy.detect[detector],
				},
			];
		}),
	);
	const printed = {
		...run,
		profile: {
			...profile,
			guardrails: {
				...profile.guardrails,
				detect: { ...(typeof declared === 'object' ? declared : {}), ...detect },
				blockedReply: policy.blockedReply,
			},
		},
	};
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
		source: studioSource(printed),
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
