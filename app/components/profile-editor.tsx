import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Collapsible, CollapsibleGroup } from '@astryxdesign/core/Collapsible';
import { ComplexSelector } from '@astryxdesign/core/ComplexSelector';
import { FileInput } from '@astryxdesign/core/FileInput';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { List, ListItem } from '@astryxdesign/core/List';
import { Section } from '@astryxdesign/core/Section';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { StackItem } from '@astryxdesign/core/Stack';
import { pixel, proportional, Table } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { VStack } from '@astryxdesign/core/VStack';
import {
	IconAlertTriangle,
	IconAlignLeft,
	IconAntennaBars1,
	IconAntennaBars2,
	IconAntennaBars3,
	IconAntennaBars4,
	IconAntennaBars5,
	IconAntennaBarsOff,
	IconArrowDown,
	IconArrowUp,
	IconBandage,
	IconBiohazard,
	IconBolt,
	IconBraces,
	IconBroadcast,
	IconBulb,
	IconBulbOff,
	IconCertificate,
	IconChartBar,
	IconCircleDashed,
	IconDatabase,
	IconDatabaseOff,
	IconDeviceDesktop,
	IconEye,
	IconEyeOff,
	IconFeather,
	IconFlame,
	IconFlask,
	IconGauge,
	IconGitBranch,
	IconHandOff,
	IconHandStop,
	IconHourglass,
	IconHttpDelete,
	IconHttpGet,
	IconHttpPatch,
	IconHttpPost,
	IconHttpPut,
	IconInfoCircle,
	IconInputAi,
	IconKey,
	IconLetterT,
	IconLink,
	IconListCheck,
	IconLockOpen,
	IconMathFunction,
	IconMessage,
	IconMicrophone,
	IconNumber,
	IconPackage,
	IconPaperclip,
	IconPencil,
	IconPhoto,
	IconPlayerPause,
	IconPlayerPlay,
	IconPlayerTrackNext,
	IconPlugConnected,
	IconPlus,
	IconRefresh,
	IconSearch,
	IconSend,
	IconServer,
	IconShieldLock,
	IconSquareRoundedNumber0,
	IconSquareRoundedNumber1,
	IconSquareRoundedNumber2,
	IconTool,
	IconTrash,
	IconUser,
	IconUserCheck,
	IconVolume,
	IconWaveSine,
	IconWorld,
	IconX,
} from '@tabler/icons-react';
import {
	ATTACHMENT_ACCEPT_MIMES,
	type AuthUnauthenticatedPolicy,
	CONTINUE_STOP_KINDS,
	type ContinueStopKind,
	type CustomToolType,
	type EgressOnBlock,
	fieldMeta,
	GOOGLE_BUILTIN_TOOLS,
	GOOGLE_IMAGE_ASPECT_RATIOS,
	GOOGLE_IMAGE_OUTPUT_MIMES,
	GOOGLE_IMAGE_RESOLUTIONS,
	GOOGLE_SPEECH_VOICES,
	HTTP_METHODS,
	type HttpMethod,
	IMAGE_ATTACHMENT_ACCEPT_MIMES,
	LEXICON_KEYS,
	type LexiconKey,
	lexiconDefault,
	type PlaygroundAuthType,
	PROFILE_TYPE_PROTOCOLS,
	PROTOCOL_PROVIDERS,
	type ProfileGraphFacetId,
	type Protocol,
	type Provider,
	profileGraphFacet,
	THINKING_LEVELS,
	type ThinkingLevel,
	type ToolAccess,
	type ToolLoadTier,
	type ToolPermission,
	VOICE_ACCEPT_MIMES,
} from '@theoremjs/agents';
import {
	type AcceptSection,
	acceptSections,
	allowedBuiltinsForGemini,
	COMPACTION_DRAFT_DEFAULTS,
	type DecisionQuestionDraft,
	type DecisionQuestionType,
	defaultBindingForProfileType,
	defaultEffortRequired,
	defaultModelRequired,
	draftAllows,
	draftKey,
	expandAccept,
	GEMINI_PLAYGROUND_DEFAULT_API_ID,
	GEMINI_PLAYGROUND_LIVE_INPUT_TOKENS,
	GEMINI_PLAYGROUND_MODELS,
	type GuardrailsDraft,
	type ImageReferenceDraft,
	INLINE_WORDING,
	includableFacets,
	includeFacet,
	inputLimitsRequired,
	isGoogleTransport,
	isOpenRouterTransport,
	JEV_PLAYGROUND_API_ID,
	keySlotRequired,
	type ModelBindingDraft,
	modelBindingNodeId,
	newCriteria,
	newDecisionQuestion,
	newModelBinding,
	newToolSpec,
	nextAccept,
	type ObservabilityDraft,
	OPENROUTER_DECISION_MODELS,
	OPENROUTER_PLAYGROUND_API_ID,
	type OutputsDraft,
	PLAYGROUND_DECISION_MAX_CRITERIA,
	PLAYGROUND_DECISION_MAX_QUESTIONS,
	PLAYGROUND_DECISION_MAX_STATE_BYTES,
	PLAYGROUND_DECISION_TIMEOUT_MS,
	PLAYGROUND_TAINT_NOTE,
	PLAYGROUND_TRACE_DESTINATION,
	type PlaygroundDraft,
	type PlaygroundIssue,
	type PlaygroundProfileType,
	type PlaygroundTurnProfileType,
	playgroundNetworkNote,
	playgroundNodeRef,
	playgroundRunsTransport,
	removeModelBinding,
	sampleToolInput,
	sectionNote,
	setProfileType,
	type ToolSpecDraft,
	takesContinueInstruction,
	toolSpecNodeId,
	updateModelBinding,
} from '@theoremjs/playground';
import type { ListedProfileType } from '@theoremjs/playground/browser';
import {
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useContext,
	useState,
	useSyncExternalStore,
} from 'react';
import {
	setToolCredential,
	subscribeToolCredentials,
	toolCredential,
} from '../lib/tool-credentials';
import { type ProbeResult, runToolProbe } from '../lib/tool-probe';
import { IconGemini, IconGoogle, IconOpenAi, IconOpenRouter } from './brand-icons';
import {
	type Choice,
	ChoiceRow,
	InspectorRow,
	InspectorSection,
	ListRow,
	NamesRow,
	NumberRow,
	type Segment,
	SegmentedRow,
	SliderRow,
	SwitchRow,
	TextAreaRow,
	TextRow,
} from './inspector';
import {
	ConnectionMode,
	ISSUE_ROW_ATTRIBUTE,
	ListBadges,
	LocalConnection,
	NodeIssues,
	useFieldStatus,
} from './inspector-context';
import { IconMcp } from './mcp-icon';
import { slotDescription, useProviderModels } from './playground-connection';

export type SetDraft = Dispatch<SetStateAction<PlaygroundDraft>>;

/** The draft's sections that are one object of settings, rather than a list. */
type SettingsSection = Exclude<keyof PlaygroundDraft, 'included' | 'modelBindings' | 'toolSpecs'>;

/** Sets fields of one section of the draft, leaving the rest as it is. */
function patch<K extends SettingsSection>(setDraft: SetDraft, key: K) {
	return (change: Partial<PlaygroundDraft[K]>) => {
		setDraft((draft) => ({ ...draft, [key]: { ...draft[key], ...change } }));
	};
}

/** Each profile type's icon: the Type control's segments and the tree's Identity row. */
export const PROFILE_TYPE_ICON = {
	text: IconLetterT,
	image: IconPhoto,
	speech: IconVolume,
	live: IconBroadcast,
	decision: IconGitBranch,
	host: IconServer,
} satisfies Record<PlaygroundProfileType, unknown>;

const PROFILE_TYPE_SEGMENTS: Segment<PlaygroundProfileType>[] = [
	{ value: 'text', label: 'Text', icon: PROFILE_TYPE_ICON.text },
	{ value: 'image', label: 'Image', icon: PROFILE_TYPE_ICON.image },
	{ value: 'speech', label: 'Speech', icon: PROFILE_TYPE_ICON.speech },
	{ value: 'live', label: 'Live', icon: PROFILE_TYPE_ICON.live },
	{ value: 'decision', label: 'Decision', icon: PROFILE_TYPE_ICON.decision },
	{ value: 'host', label: 'Host', icon: PROFILE_TYPE_ICON.host },
];

const PROTOCOL_SEGMENT = {
	geminiInteractions: {
		value: 'geminiInteractions',
		label: 'Gemini Interactions',
		icon: IconGemini,
	},
	geminiLive: { value: 'geminiLive', label: 'Gemini Live', icon: IconGemini },
	openAi: { value: 'openAi', label: 'OpenAI-compatible', icon: IconOpenAi },
	decision: { value: 'decision', label: 'Decision', icon: IconGitBranch },
} satisfies { [P in Protocol]: Segment<P> };

const PROVIDER_SEGMENT = {
	google: { value: 'google', label: 'Google', icon: IconGoogle },
	openrouter: { value: 'openrouter', label: 'OpenRouter', icon: IconOpenRouter },
	local: { value: 'local', label: 'Local', icon: IconDeviceDesktop },
	typesafe: { value: 'typesafe', label: 'TypeSafe', icon: IconGitBranch },
} satisfies { [P in Provider]: Segment<P> };

const LEVEL_SEGMENT = {
	none: { label: 'None', icon: IconAntennaBarsOff },
	minimal: { label: 'Minimal', icon: IconAntennaBars1 },
	low: { label: 'Low', icon: IconAntennaBars2 },
	medium: { label: 'Medium', icon: IconAntennaBars3 },
	high: { label: 'High', icon: IconAntennaBars4 },
	xhigh: { label: 'Extra high', icon: IconAntennaBars5 },
	max: { label: 'Max', icon: IconFlame },
} satisfies Record<ThinkingLevel, Omit<Segment<ThinkingLevel>, 'value'>>;

const LEVEL_SEGMENTS: Segment<ThinkingLevel>[] = THINKING_LEVELS.map((value) => ({
	value,
	...LEVEL_SEGMENT[value],
}));

/** Thought summaries: on, off, or left to the provider (`null` in the draft). */
const SUMMARIES_SEGMENTS: Segment<'default' | 'on' | 'off'>[] = [
	{ value: 'default', label: 'Provider default', icon: IconCircleDashed },
	{ value: 'on', label: 'On', icon: IconBulb },
	{ value: 'off', label: 'Off', icon: IconBulbOff },
];
/** A setting left to the provider (`null` in the draft), on, or off. */
const PROVIDER_DEFAULT_SEGMENT = { default: null, on: true, off: false } as const;

function providerDefaultSegment(value: boolean | null): keyof typeof PROVIDER_DEFAULT_SEGMENT {
	if (value === null) return 'default';
	return value ? 'on' : 'off';
}

/** Gemini Interactions storage: on, off, or left to Google (`null` in the draft). */
const STORAGE_SEGMENTS: Segment<'default' | 'on' | 'off'>[] = [
	{ value: 'default', label: 'Provider default', icon: IconCircleDashed },
	{ value: 'on', label: 'On', icon: IconDatabase },
	{ value: 'off', label: 'Off', icon: IconDatabaseOff },
];

/** Gemini Interactions context: the draft's `persistViaInteractionId`, false or true. */
const CONTEXT_SEGMENTS: Segment<'history' | 'chain'>[] = [
	{ value: 'history', label: 'Resend history', icon: IconRefresh },
	{ value: 'chain', label: 'Google chains', icon: IconLink },
];

const KIND_TITLE: Record<AcceptSection['kind'], string> = {
	image: 'Image',
	video: 'Video',
	document: 'Document',
	audio: 'Audio',
};

/** A MIME allowlist's picker: a section per media kind, its wildcard first. */
function acceptPicker(mimes: readonly string[]) {
	const sections = acceptSections(mimes);
	const options = sections.map(({ kind, wildcard, mimes: kindMimes }) => ({
		type: 'section' as const,
		title: KIND_TITLE[kind],
		options: [
			...(wildcard ? [{ value: wildcard, description: `Every ${kind} type` }] : []),
			...kindMimes.map((value) => ({ value })),
		],
	}));
	return { sections, options };
}

const ATTACHMENT_PICKER = acceptPicker(ATTACHMENT_ACCEPT_MIMES);
const IMAGE_ATTACHMENT_PICKER = acceptPicker(IMAGE_ATTACHMENT_ACCEPT_MIMES);
const VOICE_PICKER = acceptPicker(VOICE_ACCEPT_MIMES);

/** The wire model a binding starts on after its transport changes. */
function defaultApiId(
	type: PlaygroundTurnProfileType,
	protocol: Protocol,
	provider: Provider,
): string {
	if (isOpenRouterTransport(protocol, provider)) return OPENROUTER_PLAYGROUND_API_ID;
	if (!isGoogleTransport(protocol, provider)) return '';
	const seed = defaultBindingForProfileType(type);
	return seed.provider === 'google' ? seed.apiId : GEMINI_PLAYGROUND_DEFAULT_API_ID;
}

/** Moves a binding to a new transport and its default model, dropping builtins that model lacks. */
function retransport(
	binding: ModelBindingDraft,
	type: PlaygroundTurnProfileType,
	protocol: Protocol,
	provider: Provider,
): Partial<ModelBindingDraft> {
	const apiId = defaultApiId(type, protocol, provider);
	const allowed = new Set(allowedBuiltinsForGemini(apiId));
	return {
		protocol,
		provider,
		apiId,
		builtInTools: binding.builtInTools.filter((id) => allowed.has(id)),
	};
}

/**
 * A type change turns on each optional section the new type brings that the old one didn't: the
 * first pick shows them all. One the author took out under the old type stays out.
 */
function withNewSections(before: PlaygroundDraft, after: PlaygroundDraft): PlaygroundDraft {
	const leftOut = new Set(includableFacets(before));
	return includableFacets(after)
		.filter((facet) => !leftOut.has(facet))
		.reduce(includeFacet, after);
}

function IdentityEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const { identity } = draft;
	const set = patch(setDraft, 'identity');
	return (
		<>
			<InspectorSection title="Profile">
				<TextRow
					label="Id"
					path="id"
					field="agentId"
					value={identity.agentId}
					placeholder="my.agent"
					onChange={(agentId) => {
						set({ agentId });
					}}
				/>
				<SegmentedRow
					label="Type"
					path="type"
					field="profileType"
					value={identity.profileType}
					segments={PROFILE_TYPE_SEGMENTS}
					onChange={(type) => {
						if (type)
							setDraft((current) => withNewSections(current, setProfileType(current, type)));
					}}
				/>
				{/* A host runs no model: nothing speaks, so it has no handle. */}
				{identity.profileType !== 'host' && (
					<TextRow
						label="Handle"
						path="identity.handle"
						field="handle"
						value={identity.handle}
						placeholder="agent"
						onChange={(handle) => {
							set({ handle });
						}}
					/>
				)}
			</InspectorSection>
			{identity.profileType !== 'speech' &&
				identity.profileType !== 'decision' &&
				identity.profileType !== 'host' && (
					<InspectorSection title="System prompt" note={sectionNote('system')}>
						<TextArea
							label="System prompt"
							isLabelHidden
							size="sm"
							rows={8}
							value={identity.system}
							placeholder={fieldMeta('identity.system')?.unset}
							onChange={(system) => {
								set({ system });
							}}
						/>
						<TextAreaRow
							label="By role"
							path="identity.systemByRole"
							field="systemByRoleJson"
							value={identity.systemByRoleJson}
							rows={4}
							hasSpellCheck={false}
							placeholder={SYSTEM_BY_ROLE_PLACEHOLDER}
							onChange={(systemByRoleJson) => {
								set({ systemByRoleJson });
							}}
						/>
					</InspectorSection>
				)}
		</>
	);
}

function ModelsEditor({
	draft,
	setDraft,
	onSelect,
}: {
	draft: PlaygroundDraft;
	setDraft: SetDraft;
	onSelect: (id: string) => void;
}) {
	const { models } = draft;
	const set = patch(setDraft, 'models');
	const addModel = () => {
		const binding = newModelBinding(draft);
		setDraft((current) => ({ ...current, modelBindings: [...current.modelBindings, binding] }));
		onSelect(modelBindingNodeId(binding.key));
	};
	return (
		<>
			<InspectorSection
				title="Models"
				note={
					draft.identity.profileType === 'decision'
						? sectionNote('models.decision')
						: sectionNote('models')
				}
			>
				<Button
					label="Add model"
					variant="ghost"
					size="sm"
					icon={<Icon icon={IconPlus} size="sm" />}
					isDisabled={draft.identity.profileType === 'decision' && draft.modelBindings.length >= 1}
					onClick={addModel}
				/>
			</InspectorSection>
			{draft.identity.profileType !== 'decision' && (
				<InspectorSection title="Policy">
					<ChoiceRow
						label="Default"
						path="defaultModel"
						field="defaultModel"
						value={models.defaultModel}
						isRequired={defaultModelRequired(draft)}
						options={draft.modelBindings.map((binding) => binding.modelId)}
						onChange={(defaultModel) => {
							set({ defaultModel });
						}}
					/>
					<SwitchRow
						label="Switching"
						path="allowModelSelect"
						field="allowModelSelect"
						value={models.allowModelSelect}
						isDisabled={draft.modelBindings.length < 2}
						disabledMessage="Add a second model to let people switch."
						onChange={(allowModelSelect) => {
							set({ allowModelSelect });
						}}
					/>
					<NumberRow
						label="Max steps"
						path="maxSteps"
						units="steps"
						field="maxSteps"
						value={models.maxSteps}
						min={1}
						isIntegerOnly
						onChange={(maxSteps) => {
							set({ maxSteps });
						}}
					/>
					<SlotRow
						label="Key slot"
						path="key"
						field="key"
						value={models.key}
						isRequired={keySlotRequired(draft)}
						onChange={(key) => {
							set({ key });
						}}
					/>
					<SlotRow
						label="Fallback slot"
						path="fallbackKey"
						field="fallbackKey"
						value={models.fallbackKey ?? ''}
						onChange={(fallbackKey) => {
							set({ fallbackKey });
						}}
					/>
				</InspectorSection>
			)}
		</>
	);
}

/** Decision model binding, using the same protocol/provider/API id symbols as other models. */
function DecisionModelEditor({
	draft,
	setDraft,
	bindingKey,
}: {
	draft: PlaygroundDraft;
	setDraft: SetDraft;
	bindingKey: string;
}) {
	const mode = useContext(ConnectionMode);
	const binding = draft.modelBindings.find((candidate) => candidate.key === bindingKey);
	if (!binding) return null;
	const set = (change: Partial<ModelBindingDraft>) => {
		setDraft((current) => updateModelBinding(current, bindingKey, change));
	};
	return (
		<InspectorSection title="Decision model" note={sectionNote('decisionModel')}>
			<TextRow
				label="Id"
				path="models.*"
				field="modelId"
				value={binding.modelId}
				isRequired
				onChange={(modelId) => {
					set({ modelId });
				}}
			/>
			<SegmentedRow<Protocol>
				label="Protocol"
				path="models.*.protocol"
				field="protocol"
				value={binding.protocol}
				segments={[PROTOCOL_SEGMENT.decision]}
				onChange={(protocol) => {
					set({ protocol });
				}}
			/>
			<SegmentedRow<Provider>
				label="Provider"
				path="models.*.provider"
				field="provider"
				value={binding.provider}
				segments={[PROVIDER_SEGMENT.typesafe, PROVIDER_SEGMENT.openrouter]}
				onChange={(provider) => {
					set({
						provider,
						apiId:
							provider === 'typesafe' ? JEV_PLAYGROUND_API_ID : OPENROUTER_DECISION_MODELS[0].id,
					});
				}}
			/>
			{mode === 'demo' ? (
				<ChoiceRow
					label="API model"
					path="models.*.apiId"
					field="apiId"
					value={binding.apiId}
					options={(binding.provider === 'typesafe'
						? [{ id: JEV_PLAYGROUND_API_ID, label: 'Jev' }]
						: OPENROUTER_DECISION_MODELS
					).map((model) => ({
						value: model.id,
						label: model.label,
						description: model.id,
					}))}
					onChange={(apiId) => {
						set({ apiId });
					}}
				/>
			) : (
				<TextRow
					label="API model"
					path="models.*.apiId"
					field="apiId"
					value={binding.apiId}
					isRequired
					onChange={(apiId) => {
						set({ apiId });
					}}
				/>
			)}
			<SlotRow
				label="Key slot"
				path="key"
				value={draft.models.key}
				onChange={(key) => {
					setDraft((current) => ({ ...current, models: { ...current.models, key } }));
				}}
			/>
			<NumberRow
				label="Timeout"
				path="models.*.timeoutMs"
				units="ms"
				field="timeoutMs"
				value={binding.timeoutMs}
				min={1}
				max={PLAYGROUND_DECISION_TIMEOUT_MS}
				hint={`${String(PLAYGROUND_DECISION_TIMEOUT_MS)} by default`}
				isIntegerOnly
				onChange={(timeoutMs) => {
					set({ timeoutMs });
				}}
			/>
		</InspectorSection>
	);
}

/** A key slot, chosen from the slots the keys panel holds; each says which service its key is for. */
function SlotRow({
	label,
	path,
	field,
	value,
	isRequired,
	onChange,
}: {
	label: string;
	path: string;
	field?: string;
	value: string;
	isRequired?: boolean;
	onChange: (slot: string) => void;
}) {
	const connection = useContext(LocalConnection);
	if (!connection)
		return (
			<TextRow
				label={label}
				path={path}
				field={field}
				value={value}
				isRequired={isRequired}
				onChange={onChange}
			/>
		);
	// A slot the profile names but the panel doesn't hold yet stays choosable.
	const slots =
		value && !connection.slots.includes(value) ? [...connection.slots, value] : connection.slots;
	return (
		<ChoiceRow
			label={label}
			path={path}
			field={field}
			value={value}
			isRequired={isRequired}
			options={slots.map((slot) => ({
				value: slot,
				label: slot,
				description: slotDescription(connection.vault[slot]),
			}))}
			emptyText="Add a key under Keys first."
			onChange={onChange}
		/>
	);
}

/**
 * The provider's model, picked from what it lists for this profile type with the key in the
 * model's slot. Until there is a list (a Gemini model with no key, or a list that failed), the id
 * is typed.
 */
function ProviderModelRow({
	provider,
	type,
	slot,
	value,
	onChange,
}: {
	provider: Provider;
	type: ListedProfileType;
	slot: string;
	value: string;
	onChange: (apiId: string) => void;
}) {
	const connection = useContext(LocalConnection);
	const listed = provider === 'google' || provider === 'openrouter' ? provider : undefined;
	const models = useProviderModels(listed, type, slot ? connection?.vault[slot] : undefined);
	if (models.status === 'idle' || models.status === 'error')
		return (
			<TextRow
				label="API model"
				path="models.*.apiId"
				field="apiId"
				value={value}
				isRequired
				placeholder={listed === 'google' ? 'Choose a key to list models' : 'Provider model id'}
				status={models.status === 'error' ? { type: 'error', message: models.error } : undefined}
				onChange={onChange}
			/>
		);
	const options = models.models.map((model) => ({
		value: model.id,
		label: model.label,
		description: model.id,
	}));
	// A model the list leaves out stays chosen, so a list never rewrites the profile.
	if (value && !models.models.some((model) => model.id === value))
		options.unshift({ value, label: value, description: 'Not in the list' });
	return (
		<ChoiceRow
			label="API model"
			path="models.*.apiId"
			field="apiId"
			value={value}
			options={options}
			isLoading={models.status === 'loading'}
			emptyText={`No ${type} models listed.`}
			hasSearch
			isRequired
			onChange={onChange}
		/>
	);
}

function ModelBindingEditor({
	draft,
	setDraft,
	bindingKey,
	onSelect,
}: {
	draft: PlaygroundDraft;
	setDraft: SetDraft;
	bindingKey: string;
	onSelect: (id: string) => void;
}) {
	const mode = useContext(ConnectionMode);
	const localConnection = useContext(LocalConnection);
	const statusAt = useFieldStatus();
	const binding = draft.modelBindings.find((candidate) => candidate.key === bindingKey);
	if (!binding) return null;
	// A decision has its own binding editor; a host has no model.
	const chosen = draft.identity.profileType;
	const type = chosen && chosen !== 'decision' && chosen !== 'host' ? chosen : 'text';
	const set = (change: Partial<ModelBindingDraft>) => {
		setDraft((current) => updateModelBinding(current, bindingKey, change));
	};
	const google = isGoogleTransport(binding.protocol, binding.provider);
	const builtins = google
		? mode === 'demo'
			? allowedBuiltinsForGemini(binding.apiId)
			: GOOGLE_BUILTIN_TOOLS.map((tool) => tool.name)
		: [];
	const aliases = binding.efforts.map((effort) => effort.alias).filter(Boolean);
	/**
	 * Sets the efforts and keeps the settings that depend on them valid: the default follows its
	 * alias through a rename (`renamed`) and is cleared when the alias goes, and effort switching
	 * turns off below two aliases, where its switch is disabled and couldn't be turned off.
	 */
	const setEfforts = (
		efforts: ModelBindingDraft['efforts'],
		renamed?: { from: string; to: string },
	) => {
		const next = new Set(efforts.map((effort) => effort.alias).filter(Boolean));
		const defaultEffort =
			renamed && binding.defaultEffort === renamed.from ? renamed.to : binding.defaultEffort;
		set({
			efforts,
			defaultEffort: next.has(defaultEffort) ? defaultEffort : '',
			allowEffortSelect: binding.allowEffortSelect && next.size >= 2,
		});
	};

	return (
		<>
			<InspectorSection title="Model" path="models.*">
				<TextRow
					label="Id"
					path="models.*"
					field="modelId"
					// A model\'s id is its key in the profile\'s models, so it can\'t be left out.
					isRequired
					value={binding.modelId}
					placeholder="fast"
					onChange={(modelId) => {
						set({ modelId });
					}}
				/>
				<SegmentedRow<Protocol>
					label="Protocol"
					path="models.*.protocol"
					field="protocol"
					value={binding.protocol}
					segments={PROFILE_TYPE_PROTOCOLS[type].map((protocol) => PROTOCOL_SEGMENT[protocol])}
					onChange={(protocol) => {
						const provider = PROTOCOL_PROVIDERS[protocol][0];
						set(retransport(binding, type, protocol, provider));
					}}
				/>
				<SegmentedRow<Provider>
					label="Provider"
					path="models.*.provider"
					field="provider"
					value={binding.provider}
					segments={PROTOCOL_PROVIDERS[binding.protocol].map((provider) => ({
						...PROVIDER_SEGMENT[provider],
						isDisabled: !playgroundRunsTransport(
							type,
							binding.protocol,
							provider,
							provider === 'local' ? 'local' : mode,
						),
						disabledMessage:
							mode === 'demo' && provider !== 'local'
								? 'Add your own key under Keys to use it.'
								: `It doesn't run ${type} agents.`,
					}))}
					onChange={(provider) => {
						set(retransport(binding, type, binding.protocol, provider));
					}}
				/>
				{binding.provider === 'local' && localConnection && (
					<TextRow
						label="Endpoint"
						path="local.baseUrl"
						value={localConnection.local.baseUrl}
						placeholder="http://127.0.0.1:11434"
						status={
							localConnection.localModels.status === 'error'
								? { type: 'error', message: localConnection.localModels.error ?? '' }
								: undefined
						}
						onChange={(baseUrl) => {
							localConnection.setLocal((current) => ({ ...current, baseUrl }));
							set({ apiId: '' });
						}}
					/>
				)}
				{binding.provider === 'local' &&
					localConnection?.localModels.status === 'error' &&
					!isLocalPage() && <LocalOriginHelp />}
				{binding.provider !== 'local' && (
					<>
						<SlotRow
							label="Key slot"
							path="models.*.key"
							field="keySlot"
							value={binding.keySlot ?? ''}
							onChange={(keySlot) => {
								set({ keySlot });
							}}
						/>
						<SlotRow
							label="Fallback slot"
							path="models.*.fallbackKey"
							field="fallbackKeySlot"
							value={binding.fallbackKeySlot ?? ''}
							onChange={(fallbackKeySlot) => {
								set({ fallbackKeySlot });
							}}
						/>
					</>
				)}
				{binding.provider === 'local' && localConnection ? (
					<ChoiceRow
						label="API model"
						path="models.*.apiId"
						field="apiId"
						value={binding.apiId}
						options={localConnection.localModels.ids}
						isDisabled={
							localConnection.localModels.status === 'idle' ||
							localConnection.localModels.status === 'error'
						}
						isLoading={localConnection.localModels.status === 'loading'}
						placeholder={
							localConnection.localModels.status === 'error'
								? "Can't reach the endpoint"
								: localConnection.localModels.status === 'idle'
									? 'Enter the endpoint first'
									: undefined
						}
						emptyText="This server has no models."
						hasSearch
						isRequired
						onChange={(apiId) => {
							set({ apiId });
						}}
					/>
				) : mode === 'demo' ? (
					<ChoiceRow
						label="API model"
						path="models.*.apiId"
						field="apiId"
						value={binding.apiId}
						options={
							google
								? GEMINI_PLAYGROUND_MODELS.filter((model) => model.profileType === type).map(
										(model) => ({
											value: model.id,
											label: model.label,
											description: model.id,
										}),
									)
								: [OPENROUTER_PLAYGROUND_API_ID]
						}
						onChange={(apiId) => {
							const allowed = new Set(allowedBuiltinsForGemini(apiId));
							set({ apiId, builtInTools: binding.builtInTools.filter((id) => allowed.has(id)) });
						}}
					/>
				) : (
					<ProviderModelRow
						provider={binding.provider}
						type={type}
						slot={binding.keySlot || draft.models.key}
						value={binding.apiId}
						onChange={(apiId) => {
							set({ apiId });
						}}
					/>
				)}

				{binding.provider === 'local' && localConnection && (
					<SwitchRow
						label="Remote tools"
						path="playground.remoteTools"
						value={localConnection.remoteTools}
						onChange={localConnection.setRemoteTools}
					/>
				)}

				{binding.provider === 'local' && (
					<TextRow
						label="Server"
						path="models.*.server"
						field="server"
						value={binding.server ?? ''}
						placeholder="ollama"
						onChange={(server) => {
							set({ server });
						}}
					/>
				)}

				{google && (
					<ListRow
						label="Built-ins"
						path="models.*.builtInTools"
						field="builtInTools"
						value={binding.builtInTools}
						options={builtins}
						onChange={(builtInTools) => {
							set({ builtInTools });
						}}
					/>
				)}
			</InspectorSection>
			<InspectorSection title="Generation">
				<NumberRow
					label="Max output"
					path="models.*.maxOutputTokens"
					units="tokens"
					field="maxOutputTokens"
					value={binding.maxOutputTokens}
					min={1}
					isIntegerOnly
					onChange={(maxOutputTokens) => {
						set({ maxOutputTokens });
					}}
				/>
				<NumberRow
					label="Temperature"
					path="models.*.temperature"
					field="temperature"
					value={binding.temperature}
					min={0}
					step={0.1}
					onChange={(temperature) => {
						set({ temperature });
					}}
				/>
				<SegmentedRow
					label="Summaries"
					path="models.*.summaries"
					value={providerDefaultSegment(binding.summaries)}
					segments={SUMMARIES_SEGMENTS}
					onChange={(segment) => {
						set({ summaries: PROVIDER_DEFAULT_SEGMENT[segment] });
					}}
				/>
			</InspectorSection>
			{google && binding.protocol === 'geminiInteractions' && (
				<InspectorSection title="Conversation state">
					<SegmentedRow
						label="Context"
						path="models.*.persistViaInteractionId"
						field="persistViaInteractionId"
						value={binding.persistViaInteractionId ? 'chain' : 'history'}
						segments={CONTEXT_SEGMENTS}
						onChange={(segment) => {
							set({ persistViaInteractionId: segment === 'chain' });
						}}
					/>
					<SegmentedRow
						label="Google storage"
						path="models.*.store"
						field="store"
						value={providerDefaultSegment(binding.store)}
						segments={STORAGE_SEGMENTS}
						onChange={(segment) => {
							set({ store: PROVIDER_DEFAULT_SEGMENT[segment] });
						}}
					/>
				</InspectorSection>
			)}
			{binding.provider === 'openrouter' && binding.protocol === 'openAi' && (
				<PromptCacheSection binding={binding} set={set} />
			)}
			{type === 'text' && <CompactionSection binding={binding} set={set} />}
			<InspectorSection title="Efforts" path="models.*.efforts">
				{binding.efforts.map((effort, index) => {
					const status = statusAt('efforts', index);
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: efforts have no id and are only appended or removed
						<VStack key={index} gap={3}>
							<InspectorRow
								label={`Effort ${String(index + 1)}`}
								path="models.*.efforts"
								hasIssue={status !== undefined}
							>
								<StackItem size="fill">
									<TextInput
										label={`Effort ${String(index + 1)} alias`}
										isLabelHidden
										size="sm"
										status={status}
										value={effort.alias}
										placeholder="Alias"
										onChange={(alias) => {
											setEfforts(
												binding.efforts.map((e, i) => (i === index ? { ...e, alias } : e)),
												{ from: effort.alias, to: alias },
											);
										}}
									/>
								</StackItem>
								<IconButton
									label={`Remove effort ${String(index + 1)}`}
									variant="ghost"
									size="sm"
									icon={<Icon icon={IconX} size="sm" />}
									onClick={() => {
										setEfforts(binding.efforts.filter((_, i) => i !== index));
									}}
								/>
							</InspectorRow>
							<SegmentedRow
								label="Level"
								path="models.*.efforts.*"
								value={effort.level}
								segments={LEVEL_SEGMENTS}
								onChange={(level) => {
									setEfforts(binding.efforts.map((e, i) => (i === index ? { ...e, level } : e)));
								}}
							/>
						</VStack>
					);
				})}
				<Button
					label="Add effort"
					variant="ghost"
					size="sm"
					icon={<Icon icon={IconPlus} size="sm" />}
					onClick={() => {
						setEfforts([...binding.efforts, { alias: '', level: 'medium' }]);
					}}
				/>
				<ChoiceRow
					label="Default"
					path="models.*.defaultEffort"
					field="defaultEffort"
					value={binding.defaultEffort}
					isRequired={defaultEffortRequired(binding)}
					options={aliases}
					onChange={(defaultEffort) => {
						set({ defaultEffort });
					}}
				/>
				<SwitchRow
					label="Switching"
					path="models.*.allowEffortSelect"
					field="allowEffortSelect"
					value={binding.allowEffortSelect}
					isDisabled={aliases.length < 2}
					disabledMessage="Add a second effort to let people switch."
					onChange={(allowEffortSelect) => {
						set({ allowEffortSelect });
					}}
				/>
			</InspectorSection>
			{/* A profile runs on at least one model, so the last one stays. */}
			{draft.modelBindings.length > 1 && (
				<Section variant="transparent" padding={3}>
					<Button
						label="Remove model"
						variant="ghost"
						size="sm"
						icon={<Icon icon={IconTrash} size="sm" />}
						onClick={() => {
							setDraft((current) => removeModelBinding(current, bindingKey));
							onSelect('models');
						}}
					/>
				</Section>
			)}
		</>
	);
}

function InputsEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const { inputs } = draft;
	const set = patch(setDraft, 'inputs');
	const limitsRequired = inputLimitsRequired(inputs);
	/** An image profile takes images, video and PDF as references, and no voice. */
	const image = draft.identity.profileType === 'image';
	const attachmentPicker = image ? IMAGE_ATTACHMENT_PICKER : ATTACHMENT_PICKER;
	return (
		<>
			<InspectorSection title="Accepts" path="inputs">
				<SwitchRow
					label="Text"
					path="inputs.text"
					value={inputs.text}
					onChange={(text) => {
						set({ text });
					}}
				/>
				<ListRow
					label="Attachments"
					path="inputs.attachments.accept"
					value={expandAccept(inputs.attachmentsAccept, attachmentPicker.sections)}
					options={attachmentPicker.options}
					onChange={(selected) => {
						set({
							attachmentsAccept: nextAccept(
								inputs.attachmentsAccept,
								selected,
								attachmentPicker.sections,
							),
						});
					}}
				/>
				{!image && (
					<ListRow
						label="Voice"
						path="inputs.voice.accept"
						value={expandAccept(inputs.voiceAccept, VOICE_PICKER.sections)}
						options={VOICE_PICKER.options}
						onChange={(selected) => {
							set({ voiceAccept: nextAccept(inputs.voiceAccept, selected, VOICE_PICKER.sections) });
						}}
					/>
				)}
			</InspectorSection>
			<InspectorSection title="Limits">
				<NumberRow
					label="Max files"
					path="inputs.maxFiles"
					units="files"
					field="maxFiles"
					isRequired={limitsRequired}
					value={inputs.maxFiles}
					min={0}
					isIntegerOnly
					onChange={(maxFiles) => {
						set({ maxFiles });
					}}
				/>
				<NumberRow
					label="Max bytes"
					path="inputs.maxBytes"
					units="bytes"
					field="maxBytes"
					isRequired={limitsRequired}
					value={inputs.maxBytes}
					min={0}
					isIntegerOnly
					onChange={(maxBytes) => {
						set({ maxBytes });
					}}
				/>
				<NumberRow
					label="Turn bytes"
					path="inputs.maxTurnBytes"
					units="bytes"
					field="maxTurnBytes"
					isRequired={limitsRequired}
					value={inputs.maxTurnBytes}
					min={0}
					isIntegerOnly
					onChange={(maxTurnBytes) => {
						set({ maxTurnBytes });
					}}
				/>
				<TextAreaRow
					label="By type"
					path="inputs.limitsByMime"
					field="limitsByMimeJson"
					value={inputs.limitsByMimeJson}
					rows={3}
					hasSpellCheck={false}
					placeholder={LIMITS_BY_MIME_PLACEHOLDER}
					onChange={(limitsByMimeJson) => {
						set({ limitsByMimeJson });
					}}
				/>
			</InspectorSection>
			<InspectorSection title="Slots" path="inputs.slots" note={sectionNote('slots')}>
				<TextAreaRow
					label="Slots"
					path="inputs.slots"
					field="slotsJson"
					value={inputs.slotsJson}
					rows={3}
					hasSpellCheck={false}
					placeholder={SLOTS_PLACEHOLDER}
					onChange={(slotsJson) => {
						set({ slotsJson });
					}}
				/>
			</InspectorSection>
		</>
	);
}

const SYSTEM_BY_ROLE_PLACEHOLDER = `{
  "support": "Answer as the support desk."
}`;

const LIMITS_BY_MIME_PLACEHOLDER = `{
  "application/pdf": 5000000
}`;

const SLOTS_PLACEHOLDER = `{
  "language": ["en", "fr"]
}`;

type SetBinding = (change: Partial<ModelBindingDraft>) => void;

/** Prompt caching, on OpenRouter's openAi route only. */
function PromptCacheSection({ binding, set }: { binding: ModelBindingDraft; set: SetBinding }) {
	return (
		<InspectorSection title="Prompt cache" path="models.*.cache">
			<ChoiceRow
				label="Cache"
				path="models.*.cache.mode"
				field="cacheMode"
				isRequired={false}
				placeholder={fieldMeta('models.*.cache')?.unset}
				value={binding.cacheMode ?? ''}
				options={catalogChoices<CacheMode>('models.*.cache.mode')}
				onChange={(cacheMode) => {
					set({ cacheMode });
				}}
			/>
			{binding.cacheMode && (
				<ChoiceRow
					label="Lasts"
					path="models.*.cache.ttl"
					field="cacheTtl"
					value={binding.cacheTtl ?? ''}
					options={catalogChoices<CacheTtl>('models.*.cache.ttl')}
					onChange={(cacheTtl) => {
						set({ cacheTtl });
					}}
				/>
			)}
		</InspectorSection>
	);
}

/** Compaction, where the agent summarises its own older history. Text agents only. */
function CompactionSection({ binding, set }: { binding: ModelBindingDraft; set: SetBinding }) {
	return (
		<InspectorSection
			title="Compaction"
			path="models.*.compaction"
			note={sectionNote('compaction')}
		>
			<ChoiceRow
				label="Compact"
				path="models.*.compaction.timing"
				field="compactTiming"
				isRequired={false}
				placeholder={fieldMeta('models.*.compaction')?.unset}
				value={binding.compactTiming ?? ''}
				options={catalogChoices<CompactionTiming>('models.*.compaction.timing')}
				onChange={(compactTiming) => {
					set({
						compactTiming,
						compactMaxTokens:
							binding.compactMaxTokens ?? COMPACTION_DRAFT_DEFAULTS.compactMaxTokens,
						compactAt: binding.compactAt ?? COMPACTION_DRAFT_DEFAULTS.compactAt,
						compactKeep: binding.compactKeep ?? COMPACTION_DRAFT_DEFAULTS.compactKeep,
					});
				}}
			/>
			{binding.compactTiming && (
				<>
					<NumberRow
						label="Budget"
						path="models.*.compaction.maxTokens"
						field="compactMaxTokens"
						value={binding.compactMaxTokens ?? null}
						min={1}
						isIntegerOnly
						units="tokens"
						onChange={(compactMaxTokens) => {
							set({ compactMaxTokens });
						}}
					/>
					<SliderRow
						label="Starts at"
						path="models.*.compaction.compactAt"
						field="compactAt"
						value={binding.compactAt ?? COMPACTION_DRAFT_DEFAULTS.compactAt}
						min={0.05}
						max={0.95}
						step={0.05}
						format={(at) => PERCENT.format(at)}
						onChange={(compactAt) => {
							set({ compactAt });
						}}
					/>
					<NumberRow
						label="Keep"
						path="models.*.compaction.previousExchanges"
						field="compactKeep"
						value={binding.compactKeep ?? null}
						min={0}
						onChange={(compactKeep) => {
							set({ compactKeep });
						}}
					/>
					<ChoiceRow
						label="Counts"
						path="models.*.compaction.meter"
						field="compactMeter"
						isRequired={false}
						placeholder={fieldMeta('models.*.compaction.meter')?.unset}
						value={binding.compactMeter ?? ''}
						options={catalogChoices<CompactionMeter>('models.*.compaction.meter')}
						onChange={(compactMeter) => {
							set({ compactMeter });
						}}
					/>
				</>
			)}
		</InspectorSection>
	);
}

type CacheMode = Exclude<NonNullable<ModelBindingDraft['cacheMode']>, ''>;
type CacheTtl = Exclude<NonNullable<ModelBindingDraft['cacheTtl']>, ''>;
type CompactionTiming = Exclude<NonNullable<ModelBindingDraft['compactTiming']>, ''>;
type CompactionMeter = Exclude<NonNullable<ModelBindingDraft['compactMeter']>, ''>;

/** A closed set's options as the kernel's catalog lists them, each with its own description. */
function catalogChoices<T extends string>(path: string): Choice<T>[] {
	const meta = fieldMeta(path);
	return (meta?.options ?? []).map((value) => ({
		value: value as T,
		description: meta?.optionDescriptions?.[value],
	}));
}

/** The segment for a closed set left unset: the provider's default. */
const PROVIDER_DEFAULT = {
	value: 'default',
	label: 'Provider default',
	icon: IconCircleDashed,
} as const;

/** An unset pin (`''`) as the provider-default segment. */
function segmentOf<T extends string>(value: T | ''): T | 'default' {
	return value === '' ? 'default' : value;
}

/** The provider-default segment back to an unset pin. */
function pinOf<T extends string>(segment: T | 'default'): T | '' {
	return segment === 'default' ? '' : segment;
}

const BARGE_IN_SEGMENTS: Segment<'default' | 'START_OF_ACTIVITY_INTERRUPTS' | 'NO_INTERRUPTION'>[] =
	[
		PROVIDER_DEFAULT,
		{ value: 'START_OF_ACTIVITY_INTERRUPTS', label: 'Interrupts', icon: IconHandStop },
		{ value: 'NO_INTERRUPTION', label: 'No interruption', icon: IconHandOff },
	];

/** Gemini reads only a sensitivity's LOW or HIGH, so each end offers its own pair. */
const START_SENSITIVITY_SEGMENTS: Segment<
	'default' | 'START_SENSITIVITY_LOW' | 'START_SENSITIVITY_HIGH'
>[] = [
	PROVIDER_DEFAULT,
	{ value: 'START_SENSITIVITY_LOW', label: 'Low', icon: IconAntennaBars2 },
	{ value: 'START_SENSITIVITY_HIGH', label: 'High', icon: IconAntennaBars5 },
];
const END_SENSITIVITY_SEGMENTS: Segment<
	'default' | 'END_SENSITIVITY_LOW' | 'END_SENSITIVITY_HIGH'
>[] = [
	PROVIDER_DEFAULT,
	{ value: 'END_SENSITIVITY_LOW', label: 'Low', icon: IconAntennaBars2 },
	{ value: 'END_SENSITIVITY_HIGH', label: 'High', icon: IconAntennaBars5 },
];

/** Whether every model is on Google, so the Google preset's vocabularies apply to the pins. */
function allGoogle(draft: PlaygroundDraft): boolean {
	return (
		draft.modelBindings.length > 0 &&
		draft.modelBindings.every((binding) => isGoogleTransport(binding.protocol, binding.provider))
	);
}

/**
 * A pin the kernel takes as any string: the Google preset's values when every model is on
 * Google, free text otherwise.
 */
function PresetRow({
	google,
	label,
	path,
	value,
	preset,
	hasSearch,
	onChange,
}: {
	google: boolean;
	label: string;
	path: string;
	value: string;
	preset: readonly string[];
	hasSearch?: boolean;
	onChange: (next: string) => void;
}) {
	return google ? (
		<ChoiceRow
			label={label}
			path={path}
			value={value}
			options={preset}
			hasSearch={hasSearch}
			onChange={onChange}
		/>
	) : (
		<TextRow label={label} path={path} value={value} onChange={onChange} />
	);
}

/** OpenRouter's image vocabularies; the kernel takes free strings, so these are the playground's. */
const OPENROUTER_IMAGE_QUALITIES = ['auto', 'low', 'medium', 'high'] as const;
const OPENROUTER_IMAGE_BACKGROUNDS = ['auto', 'transparent', 'opaque'] as const;
/** A pinned file rides in every turn's request, so it stays small. */
const REFERENCE_MAX_BYTES = 4 * 1024 * 1024;

/** A picked image file as a pinned reference: its bytes in base64. */
async function referenceFromFile(file: File): Promise<ImageReferenceDraft> {
	const url = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			resolve(typeof reader.result === 'string' ? reader.result : '');
		};
		reader.onerror = () => {
			reject(reader.error ?? new Error('Couldn’t read the file.'));
		};
		reader.readAsDataURL(file);
	});
	return {
		key: draftKey('reference'),
		name: file.name,
		mimeType: file.type,
		data: url.slice(url.indexOf(',') + 1),
	};
}

/** Image output pins. OpenRouter-only pins show when every model is on OpenRouter. */
function ImageEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const google = allGoogle(draft);
	const openRouter =
		draft.modelBindings.length > 0 &&
		draft.modelBindings.every((binding) =>
			isOpenRouterTransport(binding.protocol, binding.provider),
		);
	const { image } = draft;
	const set = patch(setDraft, 'image');
	return (
		<>
			<InspectorSection title="Output" path="image">
				<PresetRow
					google={google}
					label="Aspect ratio"
					path="image.aspectRatio"
					value={image.aspectRatio}
					preset={GOOGLE_IMAGE_ASPECT_RATIOS}
					onChange={(aspectRatio) => {
						set({ aspectRatio });
					}}
				/>
				<PresetRow
					google={google}
					label="Resolution"
					path="image.resolution"
					value={image.resolution}
					preset={GOOGLE_IMAGE_RESOLUTIONS}
					onChange={(resolution) => {
						set({ resolution });
					}}
				/>
				<PresetRow
					google={google}
					label="Format"
					path="image.mimeType"
					value={image.mimeType}
					preset={GOOGLE_IMAGE_OUTPUT_MIMES}
					onChange={(mimeType) => {
						set({ mimeType });
					}}
				/>
				{openRouter && (
					<>
						<ChoiceRow
							label="Quality"
							path="image.quality"
							field="quality"
							value={image.quality}
							options={OPENROUTER_IMAGE_QUALITIES}
							onChange={(quality) => {
								set({ quality });
							}}
						/>
						<ChoiceRow
							label="Background"
							path="image.background"
							field="background"
							value={image.background}
							options={OPENROUTER_IMAGE_BACKGROUNDS}
							onChange={(background) => {
								set({ background });
							}}
						/>
						<NumberRow
							label="Compression"
							path="image.outputCompression"
							field="outputCompression"
							value={image.outputCompression}
							min={0}
							max={100}
							isIntegerOnly
							onChange={(outputCompression) => {
								set({ outputCompression });
							}}
						/>
						<NumberRow
							label="Images"
							path="image.n"
							field="n"
							units="per turn"
							value={image.n}
							min={1}
							max={10}
							isIntegerOnly
							onChange={(n) => {
								set({ n });
							}}
						/>
					</>
				)}
				<NumberRow
					label="Seed"
					path="image.seed"
					field="seed"
					value={image.seed}
					min={0}
					isIntegerOnly
					onChange={(seed) => {
						set({ seed });
					}}
				/>
				<SwitchRow
					label="With text"
					path="image.includeText"
					value={image.includeText}
					onChange={(includeText) => {
						set({ includeText });
					}}
				/>
			</InspectorSection>
			<ImageReferencesEditor
				references={image.references}
				onChange={(references) => {
					set({ references });
				}}
			/>
		</>
	);
}

/** Reference images sent with every turn, ahead of what the user attaches: files or links. */
function ImageReferencesEditor({
	references,
	onChange,
}: {
	references: ImageReferenceDraft[];
	onChange: (references: ImageReferenceDraft[]) => void;
}) {
	const statusAt = useFieldStatus();
	const [reading, setReading] = useState(false);
	const replace = (key: string, next: ImageReferenceDraft) => {
		onChange(references.map((reference) => (reference.key === key ? next : reference)));
	};
	return (
		<InspectorSection title="References" path="image.references">
			{references.map((reference, index) => {
				const label = `Reference ${String(index + 1)}`;
				const status = statusAt('references', index);
				return (
					<InspectorRow
						key={reference.key}
						label={label}
						path="image.references"
						hasIssue={status !== undefined}
					>
						{'data' in reference ? (
							<StackItem size="fill">
								<HStack gap={2} vAlign="center">
									<Thumbnail
										src={`data:${reference.mimeType};base64,${reference.data}`}
										alt={reference.name}
										label={reference.name}
									/>
									<Text size="sm" maxLines={1}>
										{reference.name}
									</Text>
								</HStack>
							</StackItem>
						) : (
							<StackItem size="fill">
								<TextInput
									label={`${label} link`}
									isLabelHidden
									size="sm"
									status={status}
									value={reference.uri}
									placeholder="https://…/image.png"
									onChange={(uri) => {
										replace(reference.key, { ...reference, uri });
									}}
								/>
							</StackItem>
						)}
						<IconButton
							label={`Remove ${label.toLowerCase()}`}
							variant="ghost"
							size="sm"
							icon={<Icon icon={IconX} size="sm" />}
							onClick={() => {
								onChange(references.filter((candidate) => candidate.key !== reference.key));
							}}
						/>
					</InspectorRow>
				);
			})}
			<FileInput
				label="Add images"
				isLabelHidden
				mode="dropzone"
				accept="image/*"
				isMultiple
				maxSize={REFERENCE_MAX_BYTES}
				isLoading={reading}
				placeholder="Drop images or choose files, up to 4 MB each"
				value={null}
				changeAction={async (files) => {
					const picked = files === null ? [] : Array.isArray(files) ? files : [files];
					if (!picked.length) return;
					setReading(true);
					try {
						onChange([...references, ...(await Promise.all(picked.map(referenceFromFile)))]);
					} finally {
						setReading(false);
					}
				}}
				onChange={() => undefined}
			/>
			<Button
				label="Add link"
				variant="ghost"
				size="sm"
				icon={<Icon icon={IconPlus} size="sm" />}
				onClick={() => {
					onChange([...references, { key: draftKey('reference'), uri: '' }]);
				}}
			/>
		</InspectorSection>
	);
}

/** Speech pins. mp3 is only on offer when every model's protocol can make it. */
function SpeechEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const google = allGoogle(draft);
	const { speech } = draft;
	const set = patch(setDraft, 'speech');
	// Only the OpenAI protocol makes mp3; Gemini refuses it.
	const mp3 = draft.modelBindings.every((binding) => binding.protocol === 'openAi');
	return (
		<InspectorSection title="Voice" path="speech">
			<PresetRow
				google={google}
				label="Voice"
				path="speech.voice"
				value={speech.voice}
				preset={GOOGLE_SPEECH_VOICES}
				hasSearch
				onChange={(voice) => {
					set({ voice });
				}}
			/>
			<ChoiceRow
				label="Format"
				path="speech.format"
				field="format"
				value={speech.format}
				options={[
					'pcm',
					{
						value: 'mp3',
						label: 'mp3',
						...(mp3 ? {} : { description: 'Only openAi models make mp3', disabled: true }),
					},
				]}
				onChange={(format) => {
					set({ format });
				}}
			/>
		</InspectorSection>
	);
}

/** Compression sliders move in steps of 1,024 tokens, which divides the free key's cap. */
const COMPRESSION_STEP = 1024;

/**
 * Google's sliding window when left blank: it triggers at 80% of the context window and keeps half
 * of that. Shown against the free key's cap, since that is the window a playground session has.
 */
const COMPRESSION_TRIGGER_DEFAULT = Math.round(GEMINI_PLAYGROUND_LIVE_INPUT_TOKENS * 0.8);
const COMPRESSION_TARGET_DEFAULT = Math.round(COMPRESSION_TRIGGER_DEFAULT / 2);

function LiveEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const mode = useContext(ConnectionMode);
	const google = allGoogle(draft);
	const { live } = draft;
	const set = patch(setDraft, 'live');
	return (
		<>
			<InspectorSection title="Ingress" path="live.ingress">
				<SwitchRow
					label="Audio"
					path="live.ingress.audio"
					value={live.ingressAudio}
					onChange={(ingressAudio) => {
						set({ ingressAudio });
					}}
				/>
				<SwitchRow
					label="Video"
					path="live.ingress.video"
					value={live.ingressVideo}
					onChange={(ingressVideo) => {
						set({ ingressVideo });
					}}
				/>
				<SwitchRow
					label="Text"
					path="live.ingress.text"
					value={live.ingressText}
					onChange={(ingressText) => {
						set({ ingressText });
					}}
				/>
			</InspectorSection>
			<InspectorSection title="Voice" path="live.voice">
				<PresetRow
					google={google}
					label="Voice"
					path="live.voice"
					value={live.voice}
					preset={GOOGLE_SPEECH_VOICES}
					hasSearch
					onChange={(voice) => {
						set({ voice });
					}}
				/>
			</InspectorSection>
			<InspectorSection title="Session" path="live.sessionResumption">
				<SwitchRow
					label="Resumption"
					path="live.sessionResumption"
					value={live.sessionResumption}
					onChange={(sessionResumption) => {
						set({ sessionResumption });
					}}
				/>
			</InspectorSection>
			<InspectorSection title="Context compression" path="live.contextCompression">
				<SwitchRow
					label="Sliding window"
					path="live.contextCompression"
					value={live.contextCompression}
					onChange={(contextCompression) => {
						set({ contextCompression });
					}}
				/>
				{live.contextCompression &&
					(mode === 'demo' ? (
						<>
							<SliderRow
								label="Trigger"
								path="live.contextCompression.triggerTokens"
								field="compressionTriggerTokens"
								value={live.compressionTriggerTokens}
								fallback={COMPRESSION_TRIGGER_DEFAULT}
								min={COMPRESSION_STEP}
								max={GEMINI_PLAYGROUND_LIVE_INPUT_TOKENS}
								step={COMPRESSION_STEP}
								onChange={(compressionTriggerTokens) => {
									set({ compressionTriggerTokens });
								}}
							/>
							<SliderRow
								label="Keep"
								path="live.contextCompression.slidingWindow.targetTokens"
								field="compressionTargetTokens"
								value={live.compressionTargetTokens}
								fallback={COMPRESSION_TARGET_DEFAULT}
								min={COMPRESSION_STEP}
								max={GEMINI_PLAYGROUND_LIVE_INPUT_TOKENS - COMPRESSION_STEP}
								step={COMPRESSION_STEP}
								onChange={(compressionTargetTokens) => {
									set({ compressionTargetTokens });
								}}
							/>
						</>
					) : (
						<>
							<NumberRow
								label="Trigger"
								path="live.contextCompression.triggerTokens"
								field="compressionTriggerTokens"
								value={live.compressionTriggerTokens}
								min={1}
								isIntegerOnly
								onChange={(compressionTriggerTokens) => {
									set({ compressionTriggerTokens });
								}}
							/>
							<NumberRow
								label="Keep"
								path="live.contextCompression.slidingWindow.targetTokens"
								field="compressionTargetTokens"
								value={live.compressionTargetTokens}
								min={1}
								isIntegerOnly
								onChange={(compressionTargetTokens) => {
									set({ compressionTargetTokens });
								}}
							/>
						</>
					))}
			</InspectorSection>
			<InspectorSection title="Transcripts" path="live.transcription">
				<SwitchRow
					label="Input"
					path="live.transcription.input"
					value={live.transcriptionInput}
					onChange={(transcriptionInput) => {
						set({ transcriptionInput });
					}}
				/>
				<SwitchRow
					label="Output"
					path="live.transcription.output"
					value={live.transcriptionOutput}
					onChange={(transcriptionOutput) => {
						set({ transcriptionOutput });
					}}
				/>
			</InspectorSection>
			<InspectorSection title="Voice activity" path="live.vad">
				<SegmentedRow
					label="Barge-in"
					path="live.vad.activityHandling"
					value={segmentOf(live.vadActivityHandling)}
					segments={BARGE_IN_SEGMENTS}
					onChange={(segment) => {
						set({ vadActivityHandling: pinOf(segment) });
					}}
				/>
				<SegmentedRow
					label="Start"
					path="live.vad.startSensitivity"
					value={segmentOf(live.vadStartSensitivity)}
					segments={START_SENSITIVITY_SEGMENTS}
					onChange={(segment) => {
						set({ vadStartSensitivity: pinOf(segment) });
					}}
				/>
				<SegmentedRow
					label="End"
					path="live.vad.endSensitivity"
					value={segmentOf(live.vadEndSensitivity)}
					segments={END_SENSITIVITY_SEGMENTS}
					onChange={(segment) => {
						set({ vadEndSensitivity: pinOf(segment) });
					}}
				/>
				<NumberRow
					label="Padding"
					path="live.vad.prefixPaddingMs"
					field="vadPrefixPaddingMs"
					value={live.vadPrefixPaddingMs}
					min={0}
					units="ms"
					isIntegerOnly
					onChange={(vadPrefixPaddingMs) => {
						set({ vadPrefixPaddingMs });
					}}
				/>
				<NumberRow
					label="Silence"
					path="live.vad.silenceDurationMs"
					field="vadSilenceDurationMs"
					value={live.vadSilenceDurationMs}
					min={0}
					units="ms"
					isIntegerOnly
					onChange={(vadSilenceDurationMs) => {
						set({ vadSilenceDurationMs });
					}}
				/>
			</InspectorSection>
		</>
	);
}

const OUTPUT_MODE_SEGMENTS: Segment<OutputsDraft['mode']>[] = [
	{ value: 'text', label: 'Free text', icon: IconAlignLeft },
	{ value: 'structured', label: 'Structured', icon: IconBraces },
];

type StreamMode = Exclude<OutputsDraft['streamMode'], ''>;

/** The kernel streams over SSE when the mode is left out, so SSE stands for the unset pin. */
const STREAM_MODE_SEGMENTS: Segment<StreamMode>[] = [
	{ value: 'sse', label: 'Streamed', icon: IconWaveSine },
	{ value: 'buffered', label: 'Buffered', icon: IconPackage },
];

const SCHEMA_PLACEHOLDER = `{
  "type": "object",
  "properties": { "answer": { "type": "string" } },
  "required": ["answer"]
}`;

function OutputsEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const { outputs } = draft;
	const set = patch(setDraft, 'outputs');
	const shaped = draftAllows(draft, 'outputs.structured');
	const structured = shaped && outputs.mode === 'structured';
	return (
		<>
			{shaped && (
				<InspectorSection title="Shape" path="outputs.structured">
					<SegmentedRow
						label="Mode"
						path="outputs.structured"
						value={outputs.mode}
						segments={OUTPUT_MODE_SEGMENTS}
						onChange={(mode) => {
							set({ mode });
						}}
					/>
					{structured && (
						<>
							<TextRow
								label="Schema id"
								path="outputs.structured"
								field="schemaId"
								isRequired
								value={outputs.schemaId}
								placeholder="reply"
								onChange={(schemaId) => {
									set({ schemaId });
								}}
							/>
							<TextAreaRow
								label="JSON Schema"
								path="outputs.structured"
								field="schemaJson"
								isRequired
								rows={8}
								hasSpellCheck={false}
								value={outputs.schemaJson}
								placeholder={SCHEMA_PLACEHOLDER}
								onChange={(schemaJson) => {
									set({ schemaJson });
								}}
							/>
						</>
					)}
				</InspectorSection>
			)}
			{structured && (
				<InspectorSection title="Repair" path="outputs.validation">
					<SwitchRow
						label="Repair"
						path="outputs.validation"
						value={outputs.validationEnabled}
						onChange={(validationEnabled) => {
							set({ validationEnabled });
						}}
					/>
					{outputs.validationEnabled && (
						<>
							<NumberRow
								label="Retries"
								path="outputs.validation.maxRetries"
								units="retries"
								field="maxRetries"
								value={outputs.maxRetries}
								min={0}
								isIntegerOnly
								onChange={(maxRetries) => {
									set({ maxRetries });
								}}
							/>
							<TextAreaRow
								label="Guidance"
								path="lexicon.repair.default_guidance"
								field="repairGuidance"
								value={outputs.repairGuidance}
								placeholder={lexiconDefault('repair.default_guidance')}
								onChange={(repairGuidance) => {
									set({ repairGuidance });
								}}
							/>
						</>
					)}
				</InspectorSection>
			)}
			<InspectorSection title="Streaming" path="outputs.streaming">
				<SegmentedRow
					label="Delivery"
					path="outputs.streaming.mode"
					value={outputs.streamMode || 'sse'}
					segments={STREAM_MODE_SEGMENTS}
					onChange={(mode) => {
						set({ streamMode: mode === 'sse' ? '' : mode });
					}}
				/>
				<SwitchRow
					label="Thoughts"
					path="outputs.streaming.streamThoughts"
					value={outputs.streamThoughts}
					onChange={(streamThoughts) => {
						set({ streamThoughts });
					}}
				/>
			</InspectorSection>
		</>
	);
}

const STOP_KIND_LABEL: Record<ContinueStopKind, string> = {
	length: 'Length',
	stream_incomplete: 'Dropped stream',
	provider_error: 'Provider error',
};

/** Which stops a reply is continued after: `allow` offers a Continue, `auto` continues unasked. */
interface Resumption {
	allow: ContinueStopKind[];
	auto: ContinueStopKind[];
}

/**
 * The picks after one box of the grid changes. Continuing on its own implies it may be continued,
 * so checking Auto checks Offer, and unchecking Offer unchecks Auto.
 */
function pickKind(
	current: Resumption,
	kind: ContinueStopKind,
	column: 'offer' | 'auto',
	checked: boolean,
): Resumption {
	const offer = column === 'offer' ? checked : checked || current.allow.includes(kind);
	const auto = column === 'auto' ? checked : checked && current.auto.includes(kind);
	const set = (kinds: ContinueStopKind[], on: boolean) =>
		CONTINUE_STOP_KINDS.filter((candidate) =>
			candidate === kind ? on : kinds.includes(candidate),
		);
	return { allow: set(current.allow, offer), auto: set(current.auto, auto) };
}

/**
 * The trigger's tokens: each stop offered, a bolt on the ones that continue on their own, the
 * first few shown and the rest counted, as the list rows do.
 */
function ResumptionTokens({ allow, auto }: Resumption) {
	const maxBadges = useContext(ListBadges);
	const rest = allow.length - maxBadges;
	return (
		<HStack gap={1} vAlign="center">
			{allow.slice(0, maxBadges).map((kind) => (
				<Token
					key={kind}
					size="sm"
					label={STOP_KIND_LABEL[kind]}
					icon={auto.includes(kind) ? <Icon icon={IconBolt} size="sm" /> : undefined}
					description={auto.includes(kind) ? 'Continues on its own' : 'Offers Continue'}
				/>
			))}
			{rest > 0 && <Token size="sm" label={`+${String(rest)}`} />}
		</HStack>
	);
}

/**
 * Resumption as one picker, a checklist per stop kind. Picking anything turns resumption on, and
 * clearing everything turns it off, so there is no separate switch.
 */
function ResumptionRow({
	value,
	onChange,
}: {
	value: Resumption;
	onChange: (next: Resumption) => void;
}) {
	const kinds = fieldMeta('turnBehaviour.resumption.allowContinue')?.optionDescriptions;
	const offerDoc = fieldMeta('turnBehaviour.resumption.allowContinue')?.doc;
	const autoDoc = fieldMeta('turnBehaviour.resumption.autoContinue')?.doc;
	return (
		<InspectorRow label="Continue after" path="turnBehaviour.resumption">
			<StackItem size="fill">
				<ComplexSelector
					label="Continue after"
					isLabelHidden
					size="sm"
					placement="below"
					value={value}
					triggerLabel={value.allow.length ? <ResumptionTokens {...value} /> : undefined}
					placeholder="Never"
					onChange={onChange}
				>
					{(current, change) => {
						const box = (kind: ContinueStopKind, column: 'offer' | 'auto') => (
							<CheckboxInput
								label={`${column === 'offer' ? 'Offer Continue' : 'Continue on its own'} after ${STOP_KIND_LABEL[kind].toLowerCase()}`}
								isLabelHidden
								value={(column === 'offer' ? current.allow : current.auto).includes(kind)}
								onChange={(checked) => {
									change(pickKind(current, kind, column, checked));
								}}
							/>
						);
						return (
							<VStack width={280} padding={2}>
								<Table
									density="compact"
									dividers="rows"
									idKey="kind"
									data={CONTINUE_STOP_KINDS.map((kind) => ({ kind }))}
									columns={[
										{
											key: 'kind',
											header: 'After',
											width: proportional(1),
											renderCell: ({ kind }) => (
												<Tooltip content={kinds?.[kind]} hasHoverIndication={false}>
													{STOP_KIND_LABEL[kind]}
												</Tooltip>
											),
										},
										{
											key: 'offer',
											header: (
												<Tooltip content={offerDoc} hasHoverIndication={false}>
													Offer
												</Tooltip>
											),
											width: pixel(64),
											align: 'center',
											renderCell: ({ kind }) => box(kind, 'offer'),
										},
										{
											key: 'auto',
											header: (
												<Tooltip content={autoDoc} hasHoverIndication={false}>
													Auto
												</Tooltip>
											),
											width: pixel(64),
											align: 'center',
											renderCell: ({ kind }) => box(kind, 'auto'),
										},
									]}
								/>
							</VStack>
						);
					}}
				</ComplexSelector>
			</StackItem>
		</InspectorRow>
	);
}

function TurnBehaviourEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const turn = draft.turnBehaviour;
	const set = patch(setDraft, 'turnBehaviour');
	return (
		<>
			{draftAllows(draft, 'turnBehaviour.resumption') && (
				<InspectorSection title="Resumption" path="turnBehaviour.resumption">
					<ResumptionRow
						value={
							turn.resumeEnabled
								? { allow: turn.allowContinue, auto: turn.autoContinue }
								: { allow: [], auto: [] }
						}
						onChange={({ allow, auto }) => {
							set({ resumeEnabled: allow.length > 0, allowContinue: allow, autoContinue: auto });
						}}
					/>
					{turn.resumeEnabled && (
						<>
							<NumberRow
								label="Max rounds"
								path="turnBehaviour.resumption.maxContinues"
								units="rounds"
								field="maxContinues"
								value={turn.maxContinues}
								min={1}
								isIntegerOnly
								onChange={(maxContinues) => {
									set({ maxContinues });
								}}
							/>
							{takesContinueInstruction(draft) && (
								<TextAreaRow
									label="Instruction"
									path="lexicon.continue.instruction"
									field="continueInstruction"
									value={turn.continueInstruction}
									placeholder={lexiconDefault('continue.instruction')}
									onChange={(continueInstruction) => {
										set({ continueInstruction });
									}}
								/>
							)}
						</>
					)}
				</InspectorSection>
			)}
			{draftAllows(draft, 'turnBehaviour.allowSteering') && (
				<InspectorSection title="Steering" path="turnBehaviour.allowSteering">
					<SwitchRow
						label="Steering"
						path="turnBehaviour.allowSteering"
						value={turn.allowSteering}
						onChange={(allowSteering) => {
							set({ allowSteering });
						}}
					/>
				</InspectorSection>
			)}
		</>
	);
}

/** The kernel repairs when on-block is left out, so repair stands for the unset pin. */
const ON_BLOCK_SEGMENTS: Segment<EgressOnBlock>[] = [
	{ value: 'reject_to_agent', label: 'Repair', icon: IconRefresh },
	{ value: 'refuse_to_user', label: 'Refuse', icon: IconHandStop },
];

type TaintGate = Exclude<GuardrailsDraft['taintAfterRemoteRead'], ''>;

/** Each threshold wears the icon of the tool access it starts refusing. */
const TAINT_SEGMENTS: Segment<TaintGate>[] = [
	{ value: 'off', label: 'None', icon: IconEye },
	{ value: 'destructive', label: 'Destructive', icon: IconFlame },
	{ value: 'write', label: 'Writes', icon: IconPencil },
];

type EgressChecksDraft = GuardrailsDraft['egressChecks'];
type SensitiveGroup = keyof GuardrailsDraft['redactSensitive'];

/** Every sensitive-data group, so a group the kernel adds fails the type check until it has a row. */
const SENSITIVE_LABEL: Record<SensitiveGroup, string> = {
	ids: 'IDs',
	financial: 'Financial',
	network: 'Network',
	credentials: 'Credentials',
};
const SENSITIVE_FLAGS = Object.entries(SENSITIVE_LABEL).map(([key, label]) => ({
	key: key as SensitiveGroup,
	label,
}));

type ReplyCheck = 'boundary' | 'injection' | 'images' | 'links';
const REPLY_CHECK_FLAGS: Flag<ReplyCheck>[] = [
	{ key: 'boundary', label: 'Boundary' },
	{ key: 'injection', label: 'Injection' },
	{ key: 'images', label: 'Images' },
	{ key: 'links', label: 'Links' },
];

function replyChecks(checks: EgressChecksDraft): Record<ReplyCheck, boolean> {
	return {
		boundary: checks.boundary,
		injection: checks.injection,
		images: checks.images.on,
		links: checks.links.on,
	};
}

function withReplyChecks(
	checks: EgressChecksDraft,
	on: Record<ReplyCheck, boolean>,
): EgressChecksDraft {
	return {
		...checks,
		boundary: on.boundary,
		injection: on.injection,
		images: { ...checks.images, on: on.images },
		links: { ...checks.links, on: on.links },
	};
}

/** What egress's bundled checks look for, as the checklists the other facets use. */
function EgressChecksSections({
	checks,
	onChange,
}: {
	checks: EgressChecksDraft;
	onChange: (next: EgressChecksDraft) => void;
}) {
	const urls = (['images', 'links'] as const).filter((name) => checks[name].on);
	return (
		<>
			<InspectorSection title="Block" path="guardrails.egress.checks">
				<FlagList
					label="Sensitive"
					path="guardrails.egress.checks.sensitive"
					flags={SENSITIVE_FLAGS}
					value={checks.sensitive}
					onChange={(sensitive) => {
						onChange({ ...checks, sensitive });
					}}
				/>
				<FlagList
					label="Checks"
					path="guardrails.egress.checks"
					flags={REPLY_CHECK_FLAGS}
					value={replyChecks(checks)}
					onChange={(on) => {
						onChange(withReplyChecks(checks, on));
					}}
				/>
			</InspectorSection>
			{urls.length > 0 && (
				<InspectorSection title="Given URLs">
					{urls.map((name) => (
						<NamesRow
							key={name}
							label={name === 'images' ? 'Image hosts' : 'Link hosts'}
							path={`guardrails.egress.checks.${name}.hosts`}
							field={`egressChecks.${name}.hosts`}
							value={checks[name].hosts}
							onChange={(hosts) => {
								onChange({ ...checks, [name]: { ...checks[name], hosts } });
							}}
						/>
					))}
					{urls.map((name) => (
						<SwitchRow
							key={name}
							label={name === 'images' ? 'Image tool URLs' : 'Link tool URLs'}
							path={`guardrails.egress.checks.${name}.fromTools`}
							value={checks[name].fromTools}
							onChange={(fromTools) => {
								onChange({ ...checks, [name]: { ...checks[name], fromTools } });
							}}
						/>
					))}
				</InspectorSection>
			)}
		</>
	);
}

function GuardrailsEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const { guardrails } = draft;
	const set = patch(setDraft, 'guardrails');
	const mode = useContext(ConnectionMode);
	const runtime = useContext(LocalConnection)?.runtime ?? { mode };
	return (
		<>
			<InspectorSection title="Input" path="guardrails.sanitizeInput">
				<SwitchRow
					label="Sanitize"
					path="guardrails.sanitizeInput"
					value={guardrails.sanitizeInput}
					onChange={(sanitizeInput) => {
						set({ sanitizeInput });
					}}
				/>
			</InspectorSection>
			<InspectorSection title="Redact" path="guardrails.redactSensitive">
				<FlagList
					label="Redact"
					path="guardrails.redactSensitive"
					flags={SENSITIVE_FLAGS}
					value={guardrails.redactSensitive}
					onChange={(redactSensitive) => {
						set({ redactSensitive });
					}}
				/>
			</InspectorSection>
			{draftAllows(draft, 'guardrails.canary') && (
				<InspectorSection title="Canary" path="guardrails.canary">
					<SwitchRow
						label="Canary"
						path="guardrails.canary"
						value={guardrails.canary}
						onChange={(canary) => {
							set({ canary });
						}}
					/>
					{guardrails.canary && (
						<TextAreaRow
							label="Bind note"
							path="lexicon.canary.bind_note"
							field="canaryBindNote"
							value={guardrails.canaryBindNote}
							placeholder={lexiconDefault('canary.bind_note')}
							onChange={(canaryBindNote) => {
								set({ canaryBindNote });
							}}
						/>
					)}
					{guardrails.canary && draftAllows(draft, 'guardrails.promptEcho') && (
						<SwitchRow
							label="Prompt echo"
							path="guardrails.promptEcho"
							value={guardrails.promptEcho}
							onChange={(promptEcho) => {
								set({ promptEcho });
							}}
						/>
					)}
				</InspectorSection>
			)}
			<InspectorSection title="Egress" path="guardrails.egress">
				<SwitchRow
					label="Checks"
					path="guardrails.egress.checks"
					value={guardrails.egressEnabled}
					onChange={(egressEnabled) => {
						set({ egressEnabled });
					}}
				/>
				{guardrails.egressEnabled && (
					<>
						<SegmentedRow
							label="On block"
							path="guardrails.egress.onBlock"
							value={guardrails.egressOnBlock || 'reject_to_agent'}
							segments={ON_BLOCK_SEGMENTS}
							onChange={(onBlock) => {
								set({ egressOnBlock: onBlock === 'reject_to_agent' ? '' : onBlock });
							}}
						/>
						{guardrails.egressOnBlock === '' && (
							<>
								<NumberRow
									label="Retries"
									path="guardrails.egress.maxRetries"
									units="retries"
									field="egressMaxRetries"
									value={guardrails.egressMaxRetries}
									min={0}
									isIntegerOnly
									onChange={(egressMaxRetries) => {
										set({ egressMaxRetries });
									}}
								/>
								<TextAreaRow
									label="Guidance"
									path="lexicon.egress.default_repair_guidance"
									field="egressRepairGuidance"
									value={guardrails.egressRepairGuidance}
									placeholder={lexiconDefault('egress.default_repair_guidance')}
									onChange={(egressRepairGuidance) => {
										set({ egressRepairGuidance });
									}}
								/>
							</>
						)}
					</>
				)}
			</InspectorSection>
			{guardrails.egressEnabled && (
				<EgressChecksSections
					checks={guardrails.egressChecks}
					onChange={(egressChecks) => {
						set({ egressChecks });
					}}
				/>
			)}
			<InspectorSection
				title="Network"
				path="guardrails.network"
				note={playgroundNetworkNote(runtime)}
			>
				<SwitchRow
					label="Private"
					path="guardrails.network.allowPrivateNetworks"
					value={guardrails.allowPrivateNetworks}
					onChange={(allowPrivateNetworks) => {
						set({ allowPrivateNetworks });
					}}
				/>
				<NamesRow
					label="Exempt hosts"
					path="guardrails.network.allowedHosts"
					field="allowedHosts"
					value={guardrails.allowedHosts}
					placeholder="None: private hosts stay blocked"
					isDisabled={guardrails.allowPrivateNetworks}
					disabledMessage="Every private host is already allowed."
					onChange={(allowedHosts) => {
						set({ allowedHosts });
					}}
				/>
				<NamesRow
					label="Schemes"
					path="guardrails.network.allowedSchemes"
					field="allowedSchemes"
					value={guardrails.allowedSchemes}
					onChange={(allowedSchemes) => {
						set({ allowedSchemes });
					}}
				/>
			</InspectorSection>
			{draftAllows(draft, 'guardrails.taint') && (
				<InspectorSection title="Taint" path="guardrails.taint" note={PLAYGROUND_TAINT_NOTE}>
					<SegmentedRow
						label="Refuse"
						path="guardrails.taint.afterRemoteRead"
						value={guardrails.taintAfterRemoteRead || 'off'}
						segments={TAINT_SEGMENTS}
						onChange={(gate) => {
							set({ taintAfterRemoteRead: gate === 'off' ? '' : gate });
						}}
					/>
				</InspectorSection>
			)}
			<InspectorSection title="Quota" path="guardrails.quota" note={sectionNote('quota')}>
				<SwitchRow
					label="Daily cap"
					path="guardrails.quota"
					value={guardrails.quotaEnabled}
					onChange={(quotaEnabled) => {
						set({ quotaEnabled });
					}}
				/>
				{guardrails.quotaEnabled && (
					<>
						<NumberRow
							label="Per day"
							path="guardrails.quota.perDay"
							field="quotaPerDay"
							isRequired
							value={guardrails.quotaPerDay}
							min={1}
							units="turns"
							isIntegerOnly
							onChange={(quotaPerDay) => {
								set({ quotaPerDay });
							}}
						/>
						<TextAreaRow
							label="Message"
							path="lexicon.quota.exhausted"
							field="quotaMessage"
							value={guardrails.quotaMessage}
							placeholder={lexiconDefault('quota.exhausted', {
								perDay: guardrails.quotaPerDay ?? '{perDay}',
							})}
							onChange={(quotaMessage) => {
								set({ quotaMessage });
							}}
						/>
					</>
				)}
			</InspectorSection>
		</>
	);
}

const TRACE_SEGMENTS: Segment<'playground' | 'off'>[] = [
	{ value: 'playground', label: 'Playground', icon: IconFlask },
	{ value: 'off', label: 'Off', icon: IconEyeOff },
];

/** One flag of a set, with what turning it on means. */
interface Flag<K extends string> {
	key: K;
	label: string;
}

const INCLUDE_FLAGS: Flag<keyof ObservabilityDraft['include']>[] = [
	{ key: 'upstreamLog', label: 'Upstream log' },
	{ key: 'outboundWire', label: 'Outbound wire' },
	{ key: 'evidenceRaw', label: 'Raw evidence' },
	{ key: 'usage', label: 'Usage' },
	{ key: 'guardrailDecisions', label: 'Decisions' },
	{ key: 'guardrailMatchPreview', label: 'Match preview' },
];

const SCRUB_FLAGS: Flag<keyof ObservabilityDraft['scrub']>[] = [
	{ key: 'sensitive', label: 'Sensitive' },
	{ key: 'injection', label: 'Injection' },
	{ key: 'canary', label: 'Canary' },
];

/** A set of on-or-off flags as one checklist: the ones on are checked. */
function FlagList<K extends string>({
	label,
	path,
	flags,
	value,
	onChange,
}: {
	label: string;
	/** The schema path the flags sit under; each flag's own entry shows under it. */
	path: string;
	flags: readonly Flag<K>[];
	value: Record<K, boolean>;
	onChange: (next: Record<K, boolean>) => void;
}) {
	return (
		<CheckboxList
			label={label}
			isLabelHidden
			density="compact"
			value={flags.filter((flag) => value[flag.key]).map((flag) => flag.key)}
			onChange={(checked) => {
				const next = { ...value };
				for (const flag of flags) next[flag.key] = checked.includes(flag.key);
				onChange(next);
			}}
		>
			{flags.map((flag) => (
				<CheckboxListItem
					key={flag.key}
					value={flag.key}
					label={flag.label}
					// A node, not a string, so the kernel's whole entry wraps instead of truncating.
					description={<Text type="supporting">{fieldMeta(`${path}.${flag.key}`)?.doc}</Text>}
				/>
			))}
		</CheckboxList>
	);
}

const PERCENT = new Intl.NumberFormat('en-US', { style: 'percent' });

const RESOURCE_PLACEHOLDER = `{
  "service.name": "my-agent"
}`;

/** Where traces go, what they keep, and how your host stores them. */
function ObservabilityEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const { observability } = draft;
	const set = patch(setDraft, 'observability');
	const on = observability.writeTo !== false;
	return (
		<>
			<InspectorSection title="Traces" path="observability">
				<SegmentedRow
					label="Write to"
					path="observability.writeTo"
					value={on ? 'playground' : 'off'}
					segments={TRACE_SEGMENTS}
					onChange={(segment) => {
						set({ writeTo: segment === 'off' ? false : PLAYGROUND_TRACE_DESTINATION });
					}}
				/>
				{on && (
					<SliderRow
						label="Sample"
						path="observability.sampleRate"
						field="sampleRate"
						value={observability.sampleRate}
						min={0}
						max={1}
						step={0.05}
						format={(rate) => PERCENT.format(rate)}
						onChange={(sampleRate) => {
							set({ sampleRate });
						}}
					/>
				)}
			</InspectorSection>
			{on && (
				<>
					<InspectorSection title="Keep" path="observability.include">
						<FlagList
							label="Keep"
							path="observability.include"
							flags={INCLUDE_FLAGS}
							value={observability.include}
							onChange={(include) => {
								set({ include });
							}}
						/>
					</InspectorSection>
					<InspectorSection title="Scrub" path="observability.scrub">
						<FlagList
							label="Scrub"
							path="observability.scrub"
							flags={SCRUB_FLAGS}
							value={observability.scrub}
							onChange={(scrub) => {
								set({ scrub });
							}}
						/>
					</InspectorSection>
					<InspectorSection title="Storage" note={sectionNote('traces.storage')}>
						<NumberRow
							label="Keep for"
							path="observability.retainForDays"
							field="retainForDays"
							units="days"
							value={observability.retainForDays}
							isIntegerOnly
							onChange={(retainForDays) => {
								set({ retainForDays });
							}}
						/>
						<NumberRow
							label="Rotate at"
							path="observability.rotateAfterMiB"
							field="rotateAfterMiB"
							units="MiB"
							value={observability.rotateAfterMiB}
							min={1}
							onChange={(rotateAfterMiB) => {
								set({ rotateAfterMiB });
							}}
						/>
						<TextAreaRow
							label="Resource"
							path="observability.resource"
							field="resourceJson"
							value={observability.resourceJson}
							rows={3}
							hasSpellCheck={false}
							placeholder={RESOURCE_PLACEHOLDER}
							onChange={(resourceJson) => {
								set({ resourceJson });
							}}
						/>
					</InspectorSection>
				</>
			)}
		</>
	);
}

/** Each custom tool type's icon: the Type control's segments and the tree's tool rows. */
export const TOOL_TYPE_ICON = {
	function: IconMathFunction,
	http: IconWorld,
	mcp: IconMcp,
} satisfies Record<CustomToolType, IconType>;

const TOOL_TYPE_SEGMENTS: Segment<CustomToolType>[] = [
	{ value: 'function', label: 'Function', icon: TOOL_TYPE_ICON.function },
	{ value: 'http', label: 'HTTP', icon: TOOL_TYPE_ICON.http },
	{ value: 'mcp', label: 'MCP', icon: TOOL_TYPE_ICON.mcp },
];

const ACCESS_SEGMENTS: Segment<ToolAccess>[] = [
	{ value: 'read-only', label: 'Read only', icon: IconEye },
	{ value: 'read-write', label: 'Read and write', icon: IconPencil },
	{ value: 'destructive', label: 'Destructive', icon: IconFlame },
];

const PERMISSION_SEGMENTS: Segment<ToolPermission>[] = [
	{ value: 'auto', label: 'Runs', icon: IconPlayerPlay },
	{ value: 'session_consent', label: 'Once a session', icon: IconUserCheck },
	{ value: 'always_confirm', label: 'Every call', icon: IconHandStop },
];

const METHOD_SEGMENTS: Segment<HttpMethod>[] = [
	{ value: 'GET', label: 'GET', icon: IconHttpGet },
	{ value: 'POST', label: 'POST', icon: IconHttpPost },
	{ value: 'PUT', label: 'PUT', icon: IconHttpPut },
	{ value: 'PATCH', label: 'PATCH', icon: IconHttpPatch },
	{ value: 'DELETE', label: 'DELETE', icon: IconHttpDelete },
];

const LOAD_TIER_SEGMENTS: Segment<ToolLoadTier>[] = [
	{ value: 'T0', label: 'T0', icon: IconSquareRoundedNumber0 },
	{ value: 'T1', label: 'T1', icon: IconSquareRoundedNumber1 },
	{ value: 'T2', label: 'T2', icon: IconSquareRoundedNumber2 },
];

const AUTH_TYPE_SEGMENTS: Segment<PlaygroundAuthType>[] = [
	{ value: 'none', label: 'None', icon: IconLockOpen },
	{ value: 'bearer', label: 'Bearer', icon: IconCertificate },
	{ value: 'api_key', label: 'API key', icon: IconKey },
	{ value: 'oauth2', label: 'OAuth 2', icon: IconShieldLock },
];

const UNAUTHENTICATED_SEGMENTS: Segment<AuthUnauthenticatedPolicy>[] = [
	{ value: 'gate', label: 'Stop the turn', icon: IconPlayerPause },
	{ value: 'report_to_model', label: 'Tell the model', icon: IconMessage },
];

/** The prefix the kernel puts before the credential when none is set, by auth type. */
const AUTH_HEADER_PREFIX: Record<Exclude<PlaygroundAuthType, 'none'>, string> = {
	bearer: 'Bearer ',
	api_key: '',
	oauth2: 'Bearer ',
};

/**
 * Why a tool on `tier` never loads on this draft: text and image turns wire T1 tools only through a
 * T1 policy, which the playground can't write, and T2 tools only through the T2 loader.
 */
function loadTierWarning(draft: PlaygroundDraft, tier: ToolLoadTier): string | undefined {
	if (tier === 'T1' && draftAllows(draft, 'tools.t1Policy')) {
		return 'The playground has no T1 policy, so this tool never loads.';
	}
	if (tier === 'T2' && draftAllows(draft, 'tools.t2Loader') && !draft.tools.t2Loader.trim()) {
		return 'No T2 loader is set under Tools, so this tool never loads.';
	}
	return undefined;
}

function placeholderHint(schemas: string[]): string | undefined {
	const names = new Set<string>();
	for (const json of schemas) {
		try {
			const schema: unknown = JSON.parse(json);
			const properties: unknown =
				schema && typeof schema === 'object' && 'properties' in schema
					? schema.properties
					: undefined;
			if (properties && typeof properties === 'object') {
				for (const name of Object.keys(properties)) names.add(`{${name}}`);
			}
		} catch {
			// A schema mid-edit names nothing yet.
		}
	}
	return names.size ? `Can use ${[...names].join(' ')}` : undefined;
}

const HEADERS_PLACEHOLDER = `{
  "Accept": "application/json"
}`;

/** The tools, each opening its own editor, and the T2 loader. */
function ToolsEditor({
	draft,
	setDraft,
	onSelect,
}: {
	draft: PlaygroundDraft;
	setDraft: SetDraft;
	onSelect: (id: string) => void;
}) {
	const set = patch(setDraft, 'tools');
	// Any custom tool can load T2 tools: one that answers with the ids to load.
	const loaders = draft.toolSpecs.map((tool) => tool.toolName.trim()).filter(Boolean);
	return (
		<>
			<InspectorSection
				title="Tools"
				path={draft.identity.profileType === 'host' ? undefined : 'tools'}
				note={draft.identity.profileType === 'host' ? sectionNote('tools.host') : undefined}
			>
				{draft.toolSpecs.length > 0 && (
					<List density="compact">
						{draft.toolSpecs.map((tool) => (
							<ListItem
								key={tool.key}
								label={tool.toolName.trim() || 'Unnamed tool'}
								description={tool.description.trim() || undefined}
								startContent={
									<Icon icon={TOOL_TYPE_ICON[tool.toolType]} size="sm" color="secondary" />
								}
								endContent={<Token label={tool.loadTier} size="sm" />}
								onClick={() => {
									onSelect(toolSpecNodeId(tool.key));
								}}
							/>
						))}
					</List>
				)}
				<Button
					label="Add tool"
					variant="ghost"
					size="sm"
					icon={<Icon icon={IconPlus} size="sm" />}
					onClick={() => {
						const tool = newToolSpec(draft);
						setDraft((current) => ({ ...current, toolSpecs: [...current.toolSpecs, tool] }));
						onSelect(toolSpecNodeId(tool.key));
					}}
				/>
			</InspectorSection>
			{draftAllows(draft, 'tools.t2Loader') && (
				<InspectorSection title="Loading" path="tools.t2Loader">
					<ChoiceRow
						label="T2 loader"
						path="tools.t2Loader"
						field="t2Loader"
						value={draft.tools.t2Loader}
						options={loaders}
						onChange={(t2Loader) => {
							set({ t2Loader });
						}}
					/>
				</InspectorSection>
			)}
		</>
	);
}

const MS = new Intl.NumberFormat('en-US', { style: 'unit', unit: 'millisecond' });

/** The result's headline: the status line, or for an MCP server, what it offers. */
function probeTitle(result: ProbeResult, tool: ToolSpecDraft): string {
	const took = result.elapsedMs === undefined ? '' : ` · ${MS.format(result.elapsedMs)}`;
	if (!result.ok && result.error) return result.error;
	if (tool.toolType === 'mcp' && result.tools) {
		// The route only checks for the remote tool when one is named.
		const name = tool.mcpToolName?.trim() ?? '';
		if (result.targetToolFound === false) return `Connected, but the server has no ${name}${took}`;
		if (result.targetToolFound) return `Connected, and ${name} is there${took}`;
		return `Connected: ${String(result.tools.length)} tools${took}`;
	}
	return `${String(result.status ?? '')} ${result.statusText ?? ''}`.trim() + took;
}

/**
 * Tries the tool's endpoint or MCP server once, from the server, which reaches public hosts only.
 * The sample input and credential live here only: neither is saved to the draft.
 */
function ToolTest({ tool }: { tool: ToolSpecDraft }) {
	/** What the user typed; until then, the sample for the tool, which follows its input schema. */
	const [typedInput, setTypedInput] = useState<string>();
	const sample = sampleToolInput(tool.toolName, tool.inputJson);
	const sampleInput = typedInput ?? (sample ? JSON.stringify(sample, null, 2) : '');
	const credential = useSyncExternalStore(
		subscribeToolCredentials,
		() => toolCredential(tool.key),
		() => '',
	);
	const setCredential = (value: string) => {
		setToolCredential(tool.key, value);
	};
	const [pending, setPending] = useState(false);
	const [result, setResult] = useState<ProbeResult>();
	const http = tool.toolType === 'http';
	const method = tool.method ?? HTTP_METHODS[0];
	// A result answers the request as it was: once what it reaches or sends changes, it's dropped.
	const target = JSON.stringify([
		tool.toolType,
		tool.endpoint,
		method,
		tool.serverUrl,
		tool.mcpToolName,
		tool.headersJson,
		tool.authType,
		tool.authHeaderName,
		tool.authHeaderPrefix,
	]);
	const [testedTarget, setTestedTarget] = useState(target);
	if (target !== testedTarget) {
		setTestedTarget(target);
		setResult(undefined);
	}

	const run = async () => {
		setPending(true);
		try {
			setResult(await runToolProbe(tool, sampleInput, credential));
		} finally {
			setPending(false);
		}
	};

	const warned = result?.ok && result.targetToolFound === false;
	return (
		<InspectorSection
			title="Test"
			note={http ? sectionNote('tool.test.http', { method }) : sectionNote('tool.test.mcp')}
		>
			{http && (
				<TextAreaRow
					label="Sample input"
					path="playground.sampleInput"
					value={sampleInput}
					rows={4}
					hasSpellCheck={false}
					placeholder="{}"
					onChange={setTypedInput}
				/>
			)}
			{(tool.authType ?? 'none') !== 'none' && (
				<InspectorRow label="Credential" path="playground.testCredential">
					<StackItem size="fill">
						<TextInput
							label="Credential"
							isLabelHidden
							size="sm"
							type="password"
							autoComplete="off"
							value={credential}
							placeholder="Used once, never saved"
							onChange={setCredential}
						/>
					</StackItem>
				</InspectorRow>
			)}
			<HStack>
				<Button
					label="Test connection"
					variant="secondary"
					size="sm"
					icon={<Icon icon={IconPlugConnected} size="sm" />}
					isLoading={pending}
					onClick={() => {
						void run();
					}}
				/>
			</HStack>
			{result && (
				<Banner
					status={warned ? 'warning' : result.ok ? 'success' : 'error'}
					title={probeTitle(result, tool)}
					description={
						result.tools?.length ? (
							<HStack gap={1} wrap="wrap">
								{result.tools.map((name) => (
									<Token key={name} label={name} size="sm" />
								))}
							</HStack>
						) : result.preview ? (
							<CodeBlock
								code={result.preview}
								language={result.preview.trimStart().startsWith('{') ? 'json' : 'text'}
								hasLanguageLabel={false}
								isWrapped
								size="sm"
								maxHeight={200}
							/>
						) : undefined
					}
				/>
			)}
		</InspectorSection>
	);
}

function ToolSpecEditor({
	draft,
	setDraft,
	toolKey,
	onSelect,
}: {
	draft: PlaygroundDraft;
	setDraft: SetDraft;
	toolKey: string;
	onSelect: (id: string) => void;
}) {
	const tool = draft.toolSpecs.find((candidate) => candidate.key === toolKey);
	if (!tool) return null;
	const set = (change: Partial<ToolSpecDraft>) => {
		setDraft((current) => ({
			...current,
			toolSpecs: current.toolSpecs.map((candidate) =>
				candidate.key === toolKey ? { ...candidate, ...change } : candidate,
			),
		}));
	};
	const remote = tool.toolType !== 'function';
	const authType = tool.authType ?? 'none';
	// HTTP and MCP tools both send static headers.
	const headersRow = (
		<TextAreaRow
			label="Headers"
			path="headers"
			field="headersJson"
			value={tool.headersJson ?? ''}
			rows={4}
			hasSpellCheck={false}
			placeholder={HEADERS_PLACEHOLDER}
			onChange={(headersJson) => {
				set({ headersJson });
			}}
		/>
	);

	return (
		<>
			<InspectorSection
				title="Tool"
				note={
					draft.identity.profileType === 'host' ? sectionNote('tool.host') : sectionNote('tool')
				}
			>
				<TextRow
					label="Name"
					path="name"
					field="toolName"
					isRequired
					value={tool.toolName}
					placeholder="search_flights"
					onChange={(toolName) => {
						// The T2 loader names this tool, so it follows the rename.
						setDraft((current) => ({
							...current,
							tools:
								current.tools.t2Loader === tool.toolName.trim()
									? { ...current.tools, t2Loader: toolName.trim() }
									: current.tools,
							toolSpecs: current.toolSpecs.map((candidate) =>
								candidate.key === toolKey ? { ...candidate, toolName } : candidate,
							),
						}));
					}}
				/>
				<SegmentedRow
					label="Type"
					path="registerTool.type"
					field="toolType"
					value={tool.toolType}
					segments={TOOL_TYPE_SEGMENTS}
					onChange={(toolType) => {
						set({ toolType });
					}}
				/>
				<TextAreaRow
					label="Description"
					path="description"
					field="description"
					isRequired
					value={tool.description}
					placeholder="Finds flights between two airports on a date."
					onChange={(description) => {
						set({ description });
					}}
				/>
				<TextRow
					label="Category"
					path="category"
					field="category"
					value={tool.category}
					placeholder="playground"
					onChange={(category) => {
						set({ category });
					}}
				/>
			</InspectorSection>
			<InspectorSection title="Contract" note={sectionNote('tool.contract')}>
				<TextAreaRow
					label="Input"
					path="playground.inputSchema"
					field="inputJson"
					value={tool.inputJson}
					rows={8}
					hasSpellCheck={false}
					onChange={(inputJson) => {
						set({ inputJson });
					}}
				/>
				<TextAreaRow
					label="Output"
					path="playground.outputSchema"
					field="outputJson"
					value={tool.outputJson}
					rows={8}
					hasSpellCheck={false}
					onChange={(outputJson) => {
						set({ outputJson });
					}}
				/>
			</InspectorSection>
			<InspectorSection title="Activity" path="labels">
				<TextRow
					label="Running"
					path="labels.activity"
					field="activity"
					value={tool.activity ?? ''}
					hint={placeholderHint([tool.inputJson])}
					onChange={(activity) => {
						set({ activity });
					}}
				/>
				<TextRow
					label="Done"
					path="labels.activityPast"
					field="activityPast"
					value={tool.activityPast ?? ''}
					hint={placeholderHint([tool.inputJson, tool.outputJson])}
					onChange={(activityPast) => {
						set({ activityPast });
					}}
				/>
			</InspectorSection>
			{tool.toolType === 'function' && (
				<InspectorSection title="Stub" path="playground.stubOutput">
					<TextAreaRow
						label="Returns"
						path="playground.stubOutput"
						field="stubOutputJson"
						value={tool.stubOutputJson ?? ''}
						rows={6}
						hasSpellCheck={false}
						hint="Left blank, a stand-in built from the output schema."
						onChange={(stubOutputJson) => {
							set({ stubOutputJson });
						}}
					/>
				</InspectorSection>
			)}
			{tool.toolType === 'http' && (
				<>
					<InspectorSection title="Request" note={sectionNote('tool.headers')}>
						<TextRow
							label="Endpoint"
							path="endpoint"
							field="endpoint"
							isRequired
							value={tool.endpoint ?? ''}
							placeholder="https://api.example.com/flights/{id}"
							onChange={(endpoint) => {
								set({ endpoint });
							}}
						/>
						<SegmentedRow
							label="Method"
							path="method"
							field="method"
							value={tool.method ?? HTTP_METHODS[0]}
							segments={METHOD_SEGMENTS}
							onChange={(method) => {
								set({ method });
							}}
						/>
						{headersRow}
					</InspectorSection>
					<InspectorSection title="Mapping" path="mapping">
						<NamesRow
							label="Path"
							path="mapping.pathParams"
							field="pathParams"
							value={tool.pathParams ?? []}
							placeholder="Names in {braces}"
							onChange={(pathParams) => {
								set({ pathParams });
							}}
						/>
						<NamesRow
							label="Query"
							path="mapping.queryParams"
							field="queryParams"
							value={tool.queryParams ?? []}
							placeholder="None"
							onChange={(queryParams) => {
								set({ queryParams });
							}}
						/>
						<TextRow
							label="Body"
							path="mapping.bodyParam"
							field="bodyParam"
							value={tool.bodyParam ?? ''}
							hint="None"
							onChange={(bodyParam) => {
								set({ bodyParam });
							}}
						/>
					</InspectorSection>
				</>
			)}
			{tool.toolType === 'mcp' && (
				<InspectorSection title="Server" note={sectionNote('tool.headers')}>
					<TextRow
						label="Server"
						path="serverUrl"
						field="serverUrl"
						isRequired
						value={tool.serverUrl ?? ''}
						placeholder="https://mcp.example.com/mcp"
						onChange={(serverUrl) => {
							set({ serverUrl });
						}}
					/>
					<TextRow
						label="Remote tool"
						path="mcpToolName"
						field="mcpToolName"
						isRequired
						value={tool.mcpToolName ?? ''}
						placeholder="search_flights"
						onChange={(mcpToolName) => {
							set({ mcpToolName });
						}}
					/>
					{headersRow}
				</InspectorSection>
			)}
			{remote && (
				<InspectorSection title="Auth" path="auth" note={sectionNote('tool.auth')}>
					<SegmentedRow
						label="Type"
						path="playground.authType"
						field="authType"
						value={authType}
						segments={AUTH_TYPE_SEGMENTS}
						onChange={(next) => {
							set({ authType: next });
						}}
					/>
					{authType !== 'none' && (
						<>
							<TextRow
								label="Slot"
								path="auth.slot"
								field="authSlot"
								value={tool.authSlot ?? ''}
								placeholder="default"
								onChange={(authSlot) => {
									set({ authSlot });
								}}
							/>
							<TextRow
								label="Header"
								path="auth.headerName"
								field="authHeaderName"
								value={tool.authHeaderName ?? ''}
								placeholder="Authorization"
								onChange={(authHeaderName) => {
									set({ authHeaderName });
								}}
							/>
							<TextRow
								label="Prefix"
								path="auth.headerPrefix"
								field="authHeaderPrefix"
								value={tool.authHeaderPrefix ?? ''}
								placeholder={AUTH_HEADER_PREFIX[authType] || undefined}
								hint="None"
								onChange={(prefix) => {
									// Blank is the kernel's prefix for the type, which the placeholder shows.
									set({ authHeaderPrefix: prefix || undefined });
								}}
							/>
							<SegmentedRow
								label="Signed out"
								path="auth.onUnauthenticated"
								field="authUnauthenticated"
								value={tool.authUnauthenticated ?? 'gate'}
								segments={UNAUTHENTICATED_SEGMENTS}
								onChange={(authUnauthenticated) => {
									set({ authUnauthenticated });
								}}
							/>
						</>
					)}
					{authType === 'oauth2' && (
						<>
							<NamesRow
								label="Scopes"
								path="auth.scopes"
								field="authScopes"
								value={tool.authScopes ?? []}
								placeholder="None"
								onChange={(authScopes) => {
									set({ authScopes });
								}}
							/>
							<TextRow
								label="Client id"
								path="auth.clientId"
								field="authClientId"
								value={tool.authClientId ?? ''}
								onChange={(authClientId) => {
									set({ authClientId });
								}}
							/>
							<TextRow
								label="Redirect"
								path="auth.redirectUri"
								field="authRedirectUri"
								value={tool.authRedirectUri ?? ''}
								placeholder="https://example.com/oauth/callback"
								onChange={(authRedirectUri) => {
									set({ authRedirectUri });
								}}
							/>
						</>
					)}
				</InspectorSection>
			)}
			{remote && <ToolTest key={tool.key} tool={tool} />}
			<InspectorSection title="Policy">
				<SegmentedRow
					label="Access"
					path="access"
					field="access"
					value={tool.access}
					segments={ACCESS_SEGMENTS}
					onChange={(access) => {
						set({ access });
					}}
				/>
				<SegmentedRow
					label="Permission"
					path="permission"
					field="permission"
					value={tool.permission}
					segments={PERMISSION_SEGMENTS}
					onChange={(permission) => {
						set({ permission });
					}}
				/>
				<SegmentedRow
					label="Load tier"
					path="loadTier"
					field="loadTier"
					value={tool.loadTier}
					segments={LOAD_TIER_SEGMENTS}
					warning={loadTierWarning(draft, tool.loadTier)}
					onChange={(loadTier) => {
						set({ loadTier });
					}}
				/>
				<NamesRow
					label="Paths"
					path="paths"
					field="paths"
					value={tool.paths}
					placeholder="Every path (*)"
					onChange={(paths) => {
						set({ paths });
					}}
				/>
			</InspectorSection>
			<Section variant="transparent" padding={3}>
				<Button
					label="Remove tool"
					variant="ghost"
					size="sm"
					icon={<Icon icon={IconTrash} size="sm" />}
					onClick={() => {
						setDraft((current) => ({
							...current,
							tools:
								current.tools.t2Loader === tool.toolName.trim()
									? { ...current.tools, t2Loader: '' }
									: current.tools,
							toolSpecs: current.toolSpecs.filter((candidate) => candidate.key !== toolKey),
						}));
						onSelect('tools');
					}}
				/>
			</Section>
		</>
	);
}

/** Wording's areas, by lexicon key prefix: what visitors read first, then what the model reads. */
/** Who reads a line: the visitor, in the chat, or the model, in its context. */
type WordingAudience = 'visitor' | 'model';

const WORDING_AREAS: readonly {
	prefix: string;
	title: string;
	note: string;
	icon: IconType;
	audience: WordingAudience;
}[] = [
	{
		prefix: 'error',
		title: 'Errors',
		note: 'When a turn fails.',
		icon: IconAlertTriangle,
		audience: 'visitor',
	},
	{
		prefix: 'attachments',
		title: 'Attachments',
		note: "When a file can't be sent.",
		icon: IconPaperclip,
		audience: 'visitor',
	},
	{
		prefix: 'voice',
		title: 'Voice',
		note: "When a voice note can't be recorded or used.",
		icon: IconMicrophone,
		audience: 'visitor',
	},
	{
		prefix: 'session',
		title: 'Session',
		note: 'Waits, approvals, and signing in.',
		icon: IconHourglass,
		audience: 'visitor',
	},
	{
		prefix: 'live',
		title: 'Live',
		note: 'When a live session ends.',
		icon: IconBroadcast,
		audience: 'visitor',
	},
	{
		prefix: 'quota',
		title: 'Quota',
		note: 'When the daily limit is reached.',
		icon: IconGauge,
		audience: 'visitor',
	},
	{
		prefix: 'tool',
		title: 'Tools',
		note: "When a tool call can't run.",
		icon: IconTool,
		audience: 'model',
	},
	{
		prefix: 'repair',
		title: 'Repair',
		note: 'Fixing a reply that failed its schema.',
		icon: IconBandage,
		audience: 'model',
	},
	{
		prefix: 'egress',
		title: 'Egress',
		note: 'A reply that fails its check, sent back or refused.',
		icon: IconSend,
		audience: 'model',
	},
	{
		prefix: 'continue',
		title: 'Resumption',
		note: 'Picking up a reply that stopped short.',
		icon: IconPlayerTrackNext,
		audience: 'model',
	},
	{
		prefix: 'canary',
		title: 'Canary',
		note: "The note that binds each turn's canary.",
		icon: IconFeather,
		audience: 'model',
	},
	{
		prefix: 'taint',
		title: 'Untrusted content',
		note: 'Why a tool call was refused after reading it.',
		icon: IconBiohazard,
		audience: 'model',
	},
	{
		prefix: 'advisory',
		title: 'Advisories',
		note: 'Notes beside content that tries to direct it.',
		icon: IconInfoCircle,
		audience: 'model',
	},
];

const WORDING_AUDIENCES: readonly {
	value: WordingAudience;
	label: string;
	icon: IconType;
	note: string;
}[] = [
	{
		value: 'visitor',
		label: 'Visitor reads',
		icon: IconUser,
		note: 'Shown in the chat when something fails or needs a wait.',
	},
	{
		value: 'model',
		label: 'Model reads',
		icon: IconInputAi,
		note: 'Put in front of the model; the visitor never sees these.',
	},
];

/** Row names for keys whose own name reads as code. */
const WORDING_LABELS: Partial<Record<LexiconKey, string>> = {
	'attachments.mime_not_allowed': 'File type not allowed',
	'attachments.limits_unconfigured': 'Files turned off',
	'quota.exhausted': 'Limit reached',
};

/** `rate_limit` → "Rate limit". */
function wordingLabel(key: LexiconKey): string {
	const named = WORDING_LABELS[key];
	if (named) return named;
	const words = key.slice(key.indexOf('.') + 1).replaceAll('_', ' ');
	return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The kernel's line for `key`, worded with the draft's own limits where it takes them. */
function wordingPlaceholder(draft: PlaygroundDraft, key: LexiconKey): string {
	const { inputs, guardrails } = draft;
	const text = lexiconDefault(key, {
		maxFiles: inputs.maxFiles ?? '{maxFiles}',
		maxBytes: inputs.maxBytes ?? Number.NaN,
		maxTurnBytes: inputs.maxTurnBytes ?? Number.NaN,
		perDay: guardrails.quotaPerDay ?? '{perDay}',
	});
	// A size the draft leaves unset formats as NaN: show the placeholder the template takes instead.
	return text.replace(
		'NaN MB',
		key === 'attachments.turn_too_large' ? '{maxTurnBytes}' : '{maxBytes}',
	);
}

/**
 * The lines that also sit beside their setting: one value, edited from either place. `isOn` is when
 * the kernel uses the line; off, Wording links to the setting that turns it on.
 */
const SHARED_WORDING: Partial<
	Record<
		LexiconKey,
		{
			setting: string;
			read: (draft: PlaygroundDraft) => string;
			write: (setDraft: SetDraft, text: string) => void;
			isOn: (draft: PlaygroundDraft) => boolean;
		}
	>
> = {
	'continue.instruction': {
		setting: 'Resumption',
		read: (draft) => draft.turnBehaviour.continueInstruction,
		write: (setDraft, continueInstruction) => {
			patch(setDraft, 'turnBehaviour')({ continueInstruction });
		},
		isOn: (draft) => takesContinueInstruction(draft) && draft.turnBehaviour.resumeEnabled,
	},
	'canary.bind_note': {
		setting: 'Canary',
		read: (draft) => draft.guardrails.canaryBindNote,
		write: (setDraft, canaryBindNote) => {
			patch(setDraft, 'guardrails')({ canaryBindNote });
		},
		isOn: (draft) => draft.guardrails.canary,
	},
	'quota.exhausted': {
		setting: 'Daily cap',
		read: (draft) => draft.guardrails.quotaMessage,
		write: (setDraft, quotaMessage) => {
			patch(setDraft, 'guardrails')({ quotaMessage });
		},
		isOn: (draft) => draft.guardrails.quotaEnabled,
	},
	'repair.default_guidance': {
		setting: 'Repair',
		read: (draft) => draft.outputs.repairGuidance,
		write: (setDraft, repairGuidance) => {
			patch(setDraft, 'outputs')({ repairGuidance });
		},
		isOn: (draft) => draft.outputs.validationEnabled,
	},
	'egress.default_repair_guidance': {
		setting: 'Egress',
		read: (draft) => draft.guardrails.egressRepairGuidance,
		write: (setDraft, egressRepairGuidance) => {
			patch(setDraft, 'guardrails')({ egressRepairGuidance });
		},
		isOn: (draft) => draft.guardrails.egressEnabled,
	},
};

/** The text a line holds in the draft: its own setting's field, or Wording's. */
function wordingValue(draft: PlaygroundDraft, key: LexiconKey): string {
	return SHARED_WORDING[key]?.read(draft) ?? draft.wording[key] ?? '';
}

/** A line that also sits beside its setting; while that setting is off, a link to turn it on. */
function SharedWordingRow({
	lexiconKey,
	facet,
	draft,
	setDraft,
	onSelect,
}: {
	lexiconKey: LexiconKey;
	facet: ProfileGraphFacetId;
	draft: PlaygroundDraft;
	setDraft: SetDraft;
	onSelect: (id: string) => void;
}) {
	const shared = SHARED_WORDING[lexiconKey];
	if (!shared) return null;
	return (
		<VStack gap={1}>
			<TextAreaRow
				label={wordingLabel(lexiconKey)}
				path={`lexicon.${lexiconKey}`}
				rows={2}
				value={shared.read(draft)}
				placeholder={wordingPlaceholder(draft, lexiconKey)}
				onChange={(text) => {
					shared.write(setDraft, text);
				}}
			/>
			{!shared.isOn(draft) && (
				<HStack gap={1} align="center">
					<Text type="supporting">Used once {shared.setting} is on.</Text>
					<Button
						label={`Open ${profileGraphFacet(facet)?.label ?? facet}`}
						variant="ghost"
						size="sm"
						onClick={() => {
							// A section left out of the profile has no node to open until it's back in.
							setDraft((current) => includeFacet(current, facet));
							onSelect(facet);
						}}
					/>
				</HStack>
			)}
		</VStack>
	);
}

/** Every line the kernel says, by area; left blank, a line keeps the kernel's own. */
function WordingEditor({
	draft,
	setDraft,
	onSelect,
}: {
	draft: PlaygroundDraft;
	setDraft: SetDraft;
	onSelect: (id: string) => void;
}) {
	const set = patch(setDraft, 'wording');
	const [audience, setAudience] = useState<WordingAudience>('visitor');
	const [query, setQuery] = useState('');
	const needle = query.trim().toLowerCase();
	/** A search spans both readers: a line matches on its area, its name, its default or its text. */
	const areas = WORDING_AREAS.filter((area) => needle || area.audience === audience)
		.map((area) => {
			const all = LEXICON_KEYS.filter((key) => key.startsWith(`${area.prefix}.`));
			const keys = needle
				? all.filter((key) =>
						[
							area.title,
							wordingLabel(key),
							wordingPlaceholder(draft, key),
							wordingValue(draft, key),
						].some((text) => text.toLowerCase().includes(needle)),
					)
				: all;
			const edited = all.filter((key) => wordingValue(draft, key)).length;
			return { ...area, keys, edited };
		})
		.filter((area) => area.keys.length > 0);
	const note = WORDING_AUDIENCES.find((entry) => entry.value === audience)?.note;
	return (
		<Section variant="transparent" padding={3}>
			<VStack gap={3}>
				<TextInput
					label="Search wording"
					isLabelHidden
					placeholder="Search names, defaults and text"
					value={query}
					onChange={setQuery}
					startIcon={IconSearch}
					hasClear
				/>
				{!needle && (
					<SegmentedControl
						label="Who reads it"
						size="sm"
						layout="fill"
						value={audience}
						onChange={(next) => {
							const picked = WORDING_AUDIENCES.find((entry) => entry.value === next);
							if (picked) setAudience(picked.value);
						}}
					>
						{WORDING_AUDIENCES.map((entry) => (
							<SegmentedControlItem
								key={entry.value}
								value={entry.value}
								label={entry.label}
								icon={<Icon icon={entry.icon} size="sm" />}
							/>
						))}
					</SegmentedControl>
				)}
				{!needle && <Text type="supporting">{note}</Text>}
				{needle && areas.length === 0 && (
					<Text type="supporting">No wording matches “{query.trim()}”.</Text>
				)}
				<CollapsibleGroup
					// Searching opens every area with a match; clearing the search goes back to all closed.
					key={needle ? `search:${areas.map((area) => area.prefix).join()}` : audience}
					type="multiple"
					hasDividers
					density="compact"
					defaultValue={needle ? areas.map((area) => area.prefix) : undefined}
				>
					{areas.map((area) => (
						<Collapsible
							key={area.prefix}
							value={area.prefix}
							trigger={
								<HStack gap={2} align="center">
									<Icon icon={area.icon} size="sm" color="secondary" />
									<StackItem size="fill">
										<VStack gap={0}>
											<Text type="label" weight="semibold">
												{area.title}
											</Text>
											<Text type="supporting">{area.note}</Text>
										</VStack>
									</StackItem>
									{area.edited > 0 && (
										<Badge variant="info" label={`${String(area.edited)} edited`} />
									)}
								</HStack>
							}
						>
							<VStack gap={3} paddingBlock={2}>
								{area.keys.map((key) => {
									const facet = INLINE_WORDING[key];
									if (facet)
										return (
											<SharedWordingRow
												key={key}
												lexiconKey={key}
												facet={facet}
												draft={draft}
												setDraft={setDraft}
												onSelect={onSelect}
											/>
										);
									return (
										<TextAreaRow
											key={key}
											label={wordingLabel(key)}
											path={`lexicon.${key}`}
											field={key}
											rows={2}
											value={draft.wording[key] ?? ''}
											placeholder={wordingPlaceholder(draft, key)}
											onChange={(text) => {
												set({ [key]: text });
											}}
										/>
									);
								})}
							</VStack>
						</Collapsible>
					))}
				</CollapsibleGroup>
			</VStack>
		</Section>
	);
}

const QUESTION_TYPE_SEGMENTS: Segment<DecisionQuestionType>[] = [
	{ value: 'choice', label: 'Choice', icon: IconListCheck },
	{ value: 'score', label: 'Score', icon: IconChartBar },
	{ value: 'noul', label: 'Noul', icon: IconNumber },
];

/** What a question's rows are called, and what a new one's text says. */
const CRITERIA_COPY = {
	choice: {
		title: 'Options',
		row: 'Option',
		note: 'Each answer it may pick, and when to pick it.',
	},
	score: { title: 'Levels', row: 'Level', note: 'The scale from 0 up, each level described.' },
	noul: { title: 'Criteria', row: 'Criterion', note: 'Optional named things the number weighs.' },
} satisfies Record<DecisionQuestionType, { title: string; row: string; note: string }>;

/** One question: its id and answer type, what to ask, and its options or levels. */
function DecisionQuestionEditor({
	question,
	index,
	count,
	onChange,
	onMove,
	onRemove,
}: {
	question: DecisionQuestionDraft;
	index: number;
	count: number;
	onChange: (change: Partial<DecisionQuestionDraft>) => void;
	onMove: (to: number) => void;
	onRemove: () => void;
}) {
	const status = useFieldStatus()('questions', index);
	const copy = CRITERIA_COPY[question.type];
	const name = question.id || `question ${String(index + 1)}`;
	const setCriteria = (criteria: DecisionQuestionDraft['criteria']) => {
		onChange({ criteria });
	};
	return (
		<Section variant="transparent" padding={3}>
			<VStack gap={3} {...{ [ISSUE_ROW_ATTRIBUTE]: status !== undefined || undefined }}>
				<HStack gap={1} vAlign="center">
					<StackItem size="fill">
						<TextInput
							label={`Question ${String(index + 1)} id`}
							isLabelHidden
							size="sm"
							status={status}
							value={question.id}
							placeholder="verdict"
							onChange={(id) => {
								onChange({ id });
							}}
						/>
					</StackItem>
					<IconButton
						label={`Move ${name} up`}
						variant="ghost"
						size="sm"
						isDisabled={index === 0}
						icon={<Icon icon={IconArrowUp} size="sm" />}
						onClick={() => {
							onMove(index - 1);
						}}
					/>
					<IconButton
						label={`Move ${name} down`}
						variant="ghost"
						size="sm"
						isDisabled={index === count - 1}
						icon={<Icon icon={IconArrowDown} size="sm" />}
						onClick={() => {
							onMove(index + 1);
						}}
					/>
					<IconButton
						label={`Remove ${name}`}
						variant="ghost"
						size="sm"
						icon={<Icon icon={IconTrash} size="sm" />}
						onClick={onRemove}
					/>
				</HStack>
				<SegmentedRow
					label="Answer"
					path="decision.questions.type"
					value={question.type}
					segments={QUESTION_TYPE_SEGMENTS}
					onChange={(type) => {
						// Options carry over between choice and number; a score's levels are a different list.
						const keeps = type !== 'score' && question.type !== 'score';
						onChange({ type, ...(keeps ? {} : { criteria: newCriteria(type) }) });
					}}
				/>
				<TextArea
					label="Instructions"
					size="sm"
					rows={3}
					value={question.instructions}
					placeholder="What should the model decide, given the state?"
					onChange={(instructions) => {
						onChange({ instructions });
					}}
				/>
				<VStack gap={2}>
					<VStack gap={0}>
						<Text type="label">{copy.title}</Text>
						<Text type="supporting">{copy.note}</Text>
					</VStack>
					{question.criteria.map((row, at) => (
						<HStack key={row.key} gap={1} vAlign="center">
							{question.type === 'score' ? (
								<StackItem size="static">
									<Text type="supporting" color="secondary" hasTabularNumbers>
										{String(at)}
									</Text>
								</StackItem>
							) : (
								<div style={{ flex: '0 0 38%', minWidth: 0 }}>
									<TextInput
										label={`${copy.row} ${String(at + 1)} label`}
										isLabelHidden
										size="sm"
										value={row.label}
										placeholder="label"
										onChange={(label) => {
											setCriteria(
												question.criteria.map((r) => (r.key === row.key ? { ...r, label } : r)),
											);
										}}
									/>
								</div>
							)}
							<StackItem size="fill">
								<TextInput
									label={`${copy.row} ${String(at + 1)} description`}
									isLabelHidden
									size="sm"
									value={row.text}
									placeholder={
										question.type === 'score' ? 'What this level means' : 'When to pick it'
									}
									onChange={(text) => {
										setCriteria(
											question.criteria.map((r) => (r.key === row.key ? { ...r, text } : r)),
										);
									}}
								/>
							</StackItem>
							<IconButton
								label={`Remove ${copy.row.toLowerCase()} ${String(at + 1)}`}
								variant="ghost"
								size="sm"
								icon={<Icon icon={IconX} size="sm" />}
								onClick={() => {
									setCriteria(question.criteria.filter((r) => r.key !== row.key));
								}}
							/>
						</HStack>
					))}
					<HStack>
						<Button
							label={`Add ${copy.row.toLowerCase()}`}
							variant="ghost"
							size="sm"
							icon={<Icon icon={IconPlus} size="sm" />}
							isDisabled={question.criteria.length >= PLAYGROUND_DECISION_MAX_CRITERIA}
							onClick={() => {
								setCriteria([...question.criteria, ...newCriteria('score').slice(0, 1)]);
							}}
						/>
					</HStack>
				</VStack>
			</VStack>
		</Section>
	);
}

/** A decision: the contract it answers to, how much state it takes, and the questions it asks of it. */
function DecisionEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const { decision } = draft;
	const set = patch(setDraft, 'decision');
	const listStatus = useFieldStatus()('questions');
	const setQuestions = (
		change: (questions: DecisionQuestionDraft[]) => DecisionQuestionDraft[],
	) => {
		setDraft((current) => ({
			...current,
			decision: { ...current.decision, questions: change(current.decision.questions) },
		}));
	};
	return (
		<>
			<InspectorSection title="Contract" path="decision.contract">
				<TextRow
					label="Contract"
					path="decision.contract"
					field="contract"
					value={decision.contract}
					placeholder="guardrails.tool_call.v1"
					onChange={(contract) => {
						set({ contract });
					}}
				/>
			</InspectorSection>
			<InspectorSection title="State" note={sectionNote('decision.state')}>
				<NumberRow
					label="Max state"
					path="inputs.maxStateBytes"
					units="bytes"
					field="maxStateBytes"
					value={decision.maxStateBytes}
					min={1}
					max={PLAYGROUND_DECISION_MAX_STATE_BYTES}
					hint={`${String(PLAYGROUND_DECISION_MAX_STATE_BYTES)} by default`}
					isIntegerOnly
					onChange={(maxStateBytes) => {
						set({ maxStateBytes });
					}}
				/>
			</InspectorSection>
			<InspectorSection title="Questions" note={sectionNote('decision.questions')}>
				{listStatus && <Banner status="error" title={listStatus.message} />}
			</InspectorSection>
			{decision.questions.map((question, index) => (
				<DecisionQuestionEditor
					key={question.key}
					question={question}
					index={index}
					count={decision.questions.length}
					onChange={(change) => {
						setQuestions((questions) =>
							questions.map((q) => (q.key === question.key ? { ...q, ...change } : q)),
						);
					}}
					onMove={(to) => {
						setQuestions((questions) => {
							const next = questions.filter((q) => q.key !== question.key);
							next.splice(to, 0, question);
							return next;
						});
					}}
					onRemove={() => {
						setQuestions((questions) => questions.filter((q) => q.key !== question.key));
					}}
				/>
			))}
			<Section variant="transparent" padding={3}>
				<HStack>
					<Button
						label="Add question"
						variant="ghost"
						size="sm"
						icon={<Icon icon={IconPlus} size="sm" />}
						isDisabled={decision.questions.length >= PLAYGROUND_DECISION_MAX_QUESTIONS}
						onClick={() => {
							setDraft((current) => ({
								...current,
								decision: {
									...current.decision,
									questions: [...current.decision.questions, newDecisionQuestion(current)],
								},
							}));
						}}
					/>
				</HStack>
			</Section>
		</>
	);
}

/**
 * The editor for the tree node `selectedId`. The compile's issues for that node show on the rows
 * of the fields they name; the rest show above it.
 * Edits go straight to the draft; the page compiles it.
 */
export function ProfileEditor({
	draft,
	setDraft,
	selectedId,
	onSelect,
	issues,
}: {
	draft: PlaygroundDraft;
	setDraft: SetDraft;
	selectedId: string;
	/** Selects another tree node: a tool, once added or picked from the list, or Tools once removed. */
	onSelect: (id: string) => void;
	issues: readonly PlaygroundIssue[];
}) {
	const ref = playgroundNodeRef(draft, selectedId);
	if (!ref) return null;
	const nodeIssues = issues.filter((issue) => issue.nodeId === selectedId);
	const props = { draft, setDraft };

	let editor: ReactNode;
	switch (ref.facet) {
		case 'identity':
			editor = <IdentityEditor {...props} />;
			break;
		case 'models':
			editor = <ModelsEditor {...props} onSelect={onSelect} />;
			break;
		case 'modelBinding':
			editor =
				draft.identity.profileType === 'decision' ? (
					<DecisionModelEditor {...props} bindingKey={ref.key} />
				) : (
					<ModelBindingEditor {...props} bindingKey={ref.key} onSelect={onSelect} />
				);
			break;
		case 'tools':
			editor = <ToolsEditor {...props} onSelect={onSelect} />;
			break;
		case 'toolSpec':
			editor = <ToolSpecEditor {...props} toolKey={ref.key} onSelect={onSelect} />;
			break;
		case 'inputs':
			editor = <InputsEditor {...props} />;
			break;
		case 'image':
			editor = <ImageEditor {...props} />;
			break;
		case 'speech':
			editor = <SpeechEditor {...props} />;
			break;
		case 'live':
			editor = <LiveEditor {...props} />;
			break;
		case 'outputs':
			editor = <OutputsEditor {...props} />;
			break;
		case 'turnBehaviour':
			editor = <TurnBehaviourEditor {...props} />;
			break;
		case 'guardrails':
			editor = <GuardrailsEditor {...props} />;
			break;
		case 'observability':
			editor = <ObservabilityEditor {...props} />;
			break;
		case 'wording':
			editor = <WordingEditor {...props} onSelect={onSelect} />;
			break;
		case 'decision':
			editor = <DecisionEditor {...props} />;
			break;
	}

	const banners = nodeIssues.filter((issue) => issue.field === undefined);
	return (
		<NodeIssues value={nodeIssues}>
			<VStack>
				{banners.length > 0 && (
					<Section variant="transparent" padding={3}>
						<VStack gap={2}>
							{banners.map((issue) => (
								<Banner key={issue.message} status="error" title={issue.message} />
							))}
						</VStack>
					</Section>
				)}
				{editor}
			</VStack>
		</NodeIssues>
	);
}

/** Local servers answer local pages only; a hosted page needs its origin allowed. */
const isLocalPage = () =>
	typeof window !== 'undefined' &&
	/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

/** Allows the page the builder is on, wherever it's hosted. */
const ollamaOriginsCommand = () => `launchctl setenv OLLAMA_ORIGINS "${window.location.origin}"`;

/** Why a hosted page can't list local models, and the one command that fixes it. */
function LocalOriginHelp() {
	return (
		<Banner
			status="warning"
			title="Your local server must allow this site"
			description={
				<VStack gap={2}>
					<Text type="supporting">
						Ollama only answers pages on your own machine. Run this, then quit and reopen Ollama. LM
						Studio: turn on CORS in its server settings.
					</Text>
					<CodeBlock
						code={ollamaOriginsCommand()}
						language="bash"
						hasLanguageLabel={false}
						isWrapped
						size="sm"
					/>
				</VStack>
			}
		/>
	);
}
