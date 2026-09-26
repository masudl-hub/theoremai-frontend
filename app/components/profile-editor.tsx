import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { ComplexSelector } from '@astryxdesign/core/ComplexSelector';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { List, ListItem } from '@astryxdesign/core/List';
import { Section } from '@astryxdesign/core/Section';
import { StackItem } from '@astryxdesign/core/Stack';
import { pixel, proportional, Table } from '@astryxdesign/core/Table';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { VStack } from '@astryxdesign/core/VStack';
import {
	IconAlignLeft,
	IconAntennaBars1,
	IconAntennaBars2,
	IconAntennaBars3,
	IconAntennaBars4,
	IconAntennaBars5,
	IconAntennaBarsOff,
	IconBan,
	IconBolt,
	IconBraces,
	IconBroadcast,
	IconBulb,
	IconBulbOff,
	IconCertificate,
	IconCircleDashed,
	IconDeviceDesktop,
	IconEye,
	IconEyeOff,
	IconFlame,
	IconFlask,
	IconHandOff,
	IconHandStop,
	IconKey,
	IconLetterA,
	IconLetterB,
	IconLetterC,
	IconLetterT,
	IconLockOpen,
	IconMathFunction,
	IconMessage,
	IconPackage,
	IconPencil,
	IconPhoto,
	IconPlayerPause,
	IconPlayerPlay,
	IconPlugConnected,
	IconPlus,
	IconRefresh,
	IconShieldLock,
	IconSquareRoundedNumber0,
	IconSquareRoundedNumber1,
	IconSquareRoundedNumber2,
	IconTrash,
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
	GOOGLE_IMAGE_ASPECT_RATIOS,
	GOOGLE_IMAGE_INPUT_MIMES,
	GOOGLE_IMAGE_SIZES,
	GOOGLE_SPEECH_VOICES,
	HTTP_METHODS,
	type HttpMethod,
	IMAGE_ATTACHMENT_ACCEPT_MIMES,
	lexiconDefault,
	type OverflowKeySlot,
	type PlaygroundAuthType,
	PROFILE_TYPE_PROTOCOLS,
	PROTOCOL_PROVIDERS,
	type Protocol,
	type Provider,
	profileGraphFacet,
	speechFormatsForProtocol,
	THINKING_LEVELS,
	type ThinkingLevel,
	type ToolAccess,
	type ToolLoadTier,
	type ToolPermission,
	VOICE_ACCEPT_MIMES,
} from '@theoremai/agents';
import {
	type AcceptSection,
	acceptSections,
	allowedBuiltinsForGemini,
	defaultBindingForProfileType,
	defaultEffortRequired,
	defaultModelRequired,
	draftAllows,
	expandAccept,
	GEMINI_PLAYGROUND_DEFAULT_API_ID,
	GEMINI_PLAYGROUND_LIVE_INPUT_TOKENS,
	GEMINI_PLAYGROUND_MODELS,
	inputLimitsRequired,
	isGoogleTransport,
	isOpenRouterTransport,
	keySlotRequired,
	type ModelBindingDraft,
	newToolSpec,
	nextAccept,
	type ObservabilityDraft,
	OPENROUTER_PLAYGROUND_API_ID,
	type OutputsDraft,
	PLAYGROUND_TRACE_DESTINATION,
	type PlaygroundDraft,
	type PlaygroundIssue,
	type PlaygroundProfileType,
	playgroundNodeRef,
	playgroundRunsTransport,
	sampleToolInput,
	setProfileType,
	type ToolSpecDraft,
	takesContinueInstruction,
	toolSpecNodeId,
} from '@theoremai/playground';
import { type Dispatch, type ReactNode, type SetStateAction, useContext, useState } from 'react';
import { IconGemini, IconGoogle, IconOpenAi, IconOpenRouter } from './brand-icons';
import {
	ChoiceRow,
	InspectorRow,
	InspectorSection,
	ListBadges,
	ListRow,
	NamesRow,
	NodeIssues,
	NumberRow,
	type Segment,
	SegmentedRow,
	SliderRow,
	SwitchRow,
	TextAreaRow,
	TextRow,
	useFieldStatus,
} from './inspector';
import { IconMcp } from './mcp-icon';

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
} satisfies Record<PlaygroundProfileType, unknown>;

const PROFILE_TYPE_SEGMENTS: Segment<PlaygroundProfileType>[] = [
	{ value: 'text', label: 'Text', icon: PROFILE_TYPE_ICON.text },
	{ value: 'image', label: 'Image', icon: PROFILE_TYPE_ICON.image },
	{ value: 'speech', label: 'Speech', icon: PROFILE_TYPE_ICON.speech },
	{ value: 'live', label: 'Live', icon: PROFILE_TYPE_ICON.live },
];

const PROTOCOL_SEGMENT = {
	geminiInteractions: {
		value: 'geminiInteractions',
		label: 'Gemini Interactions',
		icon: IconGemini,
	},
	geminiLive: { value: 'geminiLive', label: 'Gemini Live', icon: IconGemini },
	openAi: { value: 'openAi', label: 'OpenAI-compatible', icon: IconOpenAi },
} satisfies { [P in Protocol]: Segment<P> };

const PROVIDER_SEGMENT = {
	google: { value: 'google', label: 'Google', icon: IconGoogle },
	openrouter: { value: 'openrouter', label: 'OpenRouter', icon: IconOpenRouter },
	local: { value: 'local', label: 'Local', icon: IconDeviceDesktop },
} satisfies { [P in Provider]: Segment<P> };

const KEY_SEGMENTS: Segment<OverflowKeySlot | ''>[] = [
	{ value: '', label: 'No key slot', icon: IconBan },
	{ value: 'slotA', label: 'Slot A', icon: IconLetterA },
	{ value: 'slotB', label: 'Slot B', icon: IconLetterB },
	{ value: 'slotC', label: 'Slot C', icon: IconLetterC },
];

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
const SUMMARIES_SEGMENT = { default: null, on: true, off: false } as const;

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
function defaultApiId(type: PlaygroundProfileType, protocol: Protocol, provider: Provider): string {
	if (isOpenRouterTransport(protocol, provider)) return OPENROUTER_PLAYGROUND_API_ID;
	if (!isGoogleTransport(protocol, provider)) return '';
	const seed = defaultBindingForProfileType(type);
	return seed.provider === 'google' ? seed.apiId : GEMINI_PLAYGROUND_DEFAULT_API_ID;
}

/** Moves a binding to a new transport and its default model, dropping builtins that model lacks. */
function retransport(
	binding: ModelBindingDraft,
	type: PlaygroundProfileType,
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

function IdentityEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const { identity } = draft;
	const set = patch(setDraft, 'identity');
	return (
		<>
			<InspectorSection title="Profile" note="Who this agent is and what kind of thing it makes.">
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
						if (type) setDraft((current) => setProfileType(current, type));
					}}
				/>
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
			</InspectorSection>
			{identity.profileType !== 'speech' && (
				<InspectorSection
					title="System prompt"
					note="Standing instructions the model reads before every turn."
				>
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
				</InspectorSection>
			)}
		</>
	);
}

function ModelsEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const { models } = draft;
	const set = patch(setDraft, 'models');
	return (
		<InspectorSection
			title="Policy"
			note="Which model runs by default, and how many steps a turn may take."
		>
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
			<SegmentedRow
				label="Key slot"
				path="key"
				field="key"
				value={models.key}
				segments={KEY_SEGMENTS}
				isRequired={keySlotRequired(draft)}
				onChange={(key) => {
					set({ key });
				}}
			/>
		</InspectorSection>
	);
}

function ModelBindingEditor({
	draft,
	setDraft,
	bindingKey,
}: {
	draft: PlaygroundDraft;
	setDraft: SetDraft;
	bindingKey: string;
}) {
	const statusAt = useFieldStatus();
	const binding = draft.modelBindings.find((candidate) => candidate.key === bindingKey);
	if (!binding) return null;
	const type = draft.identity.profileType || 'text';
	const set = (change: Partial<ModelBindingDraft>) => {
		setDraft((current) => ({
			...current,
			modelBindings: current.modelBindings.map((candidate) =>
				candidate.key === bindingKey ? { ...candidate, ...change } : candidate,
			),
		}));
	};
	const google = isGoogleTransport(binding.protocol, binding.provider);
	const builtins = google ? allowedBuiltinsForGemini(binding.apiId) : [];
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
			<InspectorSection title="Model" note="Where this model runs and what it goes by.">
				<TextRow
					label="Id"
					path="models.*"
					field="modelId"
					// A model\'s id is its key in the profile\'s models, so it can\'t be left out.
					isRequired
					value={binding.modelId}
					placeholder="fast"
					onChange={(modelId) => {
						// The models' default names this binding by id, so it follows the rename.
						setDraft((current) => ({
							...current,
							models:
								current.models.defaultModel === binding.modelId
									? { ...current.models, defaultModel: modelId }
									: current.models,
							modelBindings: current.modelBindings.map((candidate) =>
								candidate.key === bindingKey ? { ...candidate, modelId } : candidate,
							),
						}));
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
						isDisabled: !playgroundRunsTransport(type, binding.protocol, provider),
					}))}
					onChange={(provider) => {
						set(retransport(binding, type, binding.protocol, provider));
					}}
				/>
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
			<InspectorSection
				title="Generation"
				note="How long, how varied, and whether its thinking is summarized."
			>
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
					value={binding.summaries === null ? 'default' : binding.summaries ? 'on' : 'off'}
					segments={SUMMARIES_SEGMENTS}
					onChange={(segment) => {
						set({ summaries: SUMMARIES_SEGMENT[segment] });
					}}
				/>
			</InspectorSection>
			<InspectorSection title="Efforts" note="Named thinking levels a turn can ask for.">
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
					onChange={(allowEffortSelect) => {
						set({ allowEffortSelect });
					}}
				/>
			</InspectorSection>
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
			<InspectorSection title="Accepts" note="What someone can send the agent.">
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
			<InspectorSection title="Limits" note="How much they can send at once.">
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
			</InspectorSection>
		</>
	);
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

/** Image output pins. */
function ImageEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const google = allGoogle(draft);
	const { image } = draft;
	const set = patch(setDraft, 'image');
	return (
		<InspectorSection title="Output" note="How generated images come back.">
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
				label="Size"
				path="image.size"
				value={image.size}
				preset={GOOGLE_IMAGE_SIZES}
				onChange={(size) => {
					set({ size });
				}}
			/>
			<PresetRow
				google={google}
				label="Format"
				path="image.mimeType"
				value={image.mimeType}
				preset={GOOGLE_IMAGE_INPUT_MIMES}
				onChange={(mimeType) => {
					set({ mimeType });
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
	);
}

/** Speech pins. mp3 is only on offer when every model's protocol can make it. */
function SpeechEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const google = allGoogle(draft);
	const { speech } = draft;
	const set = patch(setDraft, 'speech');
	const mp3 = draft.modelBindings.every((binding) =>
		speechFormatsForProtocol(binding.protocol).includes('mp3'),
	);
	return (
		<InspectorSection title="Voice" note="How speech sounds, and the format it comes in.">
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
	const google = allGoogle(draft);
	const { live } = draft;
	const set = patch(setDraft, 'live');
	return (
		<>
			<InspectorSection title="Ingress" note="What the session listens to.">
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
			<InspectorSection
				title="Voice"
				note="How the agent sounds, and whether it may choose when to speak."
			>
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
				<SwitchRow
					label="Proactive"
					path="live.proactiveAudio"
					value={live.proactiveAudio}
					onChange={(proactiveAudio) => {
						set({ proactiveAudio });
					}}
				/>
			</InspectorSection>
			<InspectorSection title="Session" note="Lets a dropped session pick up where it left off.">
				<SwitchRow
					label="Resumption"
					path="live.sessionResumption"
					value={live.sessionResumption}
					onChange={(sessionResumption) => {
						set({ sessionResumption });
					}}
				/>
			</InspectorSection>
			<InspectorSection
				title="Context compression"
				note="Trims older turns once a session grows past the trigger."
			>
				<SwitchRow
					label="Sliding window"
					path="live.contextCompression"
					value={live.contextCompression}
					onChange={(contextCompression) => {
						set({ contextCompression });
					}}
				/>
				{live.contextCompression && (
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
				)}
			</InspectorSection>
			<InspectorSection title="Transcripts" note="Text copies of what is said, both ways.">
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
			<InspectorSection title="Voice activity" note="How the model hears speech start and stop.">
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
	const structured = outputs.mode === 'structured';
	return (
		<>
			<InspectorSection title="Shape" note="Free text, or JSON held to a schema.">
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
			{structured && (
				<InspectorSection
					title="Repair"
					note="Checks each reply against the schema and hands what fails back to the model."
				>
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
								path="lexicon.*"
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
			<InspectorSection
				title="Streaming"
				note="How a reply arrives, and whether its thinking shows."
			>
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
												<Tooltip content={kinds?.[kind]}>{STOP_KIND_LABEL[kind]}</Tooltip>
											),
										},
										{
											key: 'offer',
											header: <Tooltip content={offerDoc}>Offer</Tooltip>,
											width: pixel(64),
											align: 'center',
											renderCell: ({ kind }) => box(kind, 'offer'),
										},
										{
											key: 'auto',
											header: <Tooltip content={autoDoc}>Auto</Tooltip>,
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
				<InspectorSection title="Resumption" note="Picks a reply back up after it stops short.">
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
									path="lexicon.*"
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
				<InspectorSection title="Steering" note="Lets you add to a turn while it runs.">
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

function GuardrailsEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const { guardrails } = draft;
	const set = patch(setDraft, 'guardrails');
	return (
		<>
			<InspectorSection title="Input" note="Applied to what comes in before the model sees it.">
				<SwitchRow
					label="Sanitize"
					path="guardrails.sanitizeInput"
					value={guardrails.sanitizeInput}
					onChange={(sanitizeInput) => {
						set({ sanitizeInput });
					}}
				/>
				<SwitchRow
					label="Redact"
					path="guardrails.redactSensitive"
					value={guardrails.redactSensitive}
					onChange={(redactSensitive) => {
						set({ redactSensitive });
					}}
				/>
			</InspectorSection>
			{draftAllows(draft, 'guardrails.canary') && (
				<InspectorSection
					title="Canary"
					note="A fresh token in each turn's system prompt, so a leaked prompt shows."
				>
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
							path="lexicon.*"
							field="canaryBindNote"
							value={guardrails.canaryBindNote}
							placeholder={lexiconDefault('canary.bind_note')}
							onChange={(canaryBindNote) => {
								set({ canaryBindNote });
							}}
						/>
					)}
				</InspectorSection>
			)}
			<InspectorSection title="Egress" note="Checks each reply before anyone sees it.">
				<SwitchRow
					label="Enforce"
					path="guardrails.egress.enforce"
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
									path="lexicon.*"
									field="egressRepairGuidance"
									value={guardrails.egressRepairGuidance}
									placeholder={lexiconDefault('egress.default_repair_guidance')}
									onChange={(egressRepairGuidance) => {
										set({ egressRepairGuidance });
									}}
								/>
							</>
						)}
						<NumberRow
							label="Holdback"
							path="guardrails.egress.holdback"
							field="egressHoldback"
							value={guardrails.egressHoldback}
							min={0}
							units="chars"
							isIntegerOnly
							onChange={(egressHoldback) => {
								set({ egressHoldback });
							}}
						/>
					</>
				)}
			</InspectorSection>
			<InspectorSection
				title="Network"
				note="Where HTTP and MCP tools may reach from your host. Playground runs reach public hosts only."
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
			</InspectorSection>
			<InspectorSection
				title="Quota"
				note="Your host enforces this. Playground runs aren't counted against it."
			>
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
							path="lexicon.*"
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
	description: string;
}

const INCLUDE_FLAGS: Flag<keyof ObservabilityDraft['include']>[] = [
	{ key: 'upstreamLog', label: 'Upstream log', description: 'Each provider row as it arrived.' },
	{
		key: 'outboundWire',
		label: 'Outbound wire',
		description: 'The request body sent on each try.',
	},
	{
		key: 'evidenceRaw',
		label: 'Raw evidence',
		description: "The provider's own grounding payload.",
	},
	{ key: 'usage', label: 'Usage', description: 'Token counts.' },
	{ key: 'guardrailDecisions', label: 'Decisions', description: 'What each guardrail decided.' },
	{
		key: 'guardrailMatchPreview',
		label: 'Match preview',
		description: 'The text a guardrail matched. For debugging.',
	},
];

const SCRUB_FLAGS: Flag<keyof ObservabilityDraft['scrub']>[] = [
	{ key: 'sensitive', label: 'Sensitive', description: 'Credentials and personal details.' },
	{
		key: 'injection',
		label: 'Injection',
		description: 'Injection attempts in the stored request.',
	},
	{ key: 'canary', label: 'Canary', description: "The turn's canary token." },
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
	/** The schema path the flags sit under; each flag's own entry shows on hover. */
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
					label={<Tooltip content={fieldMeta(`${path}.${flag.key}`)?.doc}>{flag.label}</Tooltip>}
					description={flag.description}
				/>
			))}
		</CheckboxList>
	);
}

const PERCENT = new Intl.NumberFormat('en-US', { style: 'percent' });

/**
 * Where traces go and what they keep. Retention and rotation have no rows: the playground's
 * destination stores nothing, and rotation is only for JSONL files.
 */
function ObservabilityEditor({ draft, setDraft }: { draft: PlaygroundDraft; setDraft: SetDraft }) {
	const { observability } = draft;
	const set = patch(setDraft, 'observability');
	const on = observability.writeTo !== false;
	return (
		<>
			<InspectorSection title="Traces" note="Each run's trace comes back on its own stream.">
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
					<InspectorSection title="Keep" note="What each trace holds.">
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
					<InspectorSection title="Scrub" note="Stripped before a trace is stored.">
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
	{ value: 'pause', label: 'Stop the turn', icon: IconPlayerPause },
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
	const loaders = draft.toolSpecs
		.filter((tool) => tool.toolType === 'function')
		.map((tool) => tool.toolName.trim())
		.filter(Boolean);
	return (
		<>
			<InspectorSection
				title="Tools"
				note="What the agent can call. Built-in tools are turned on per model."
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
				<InspectorSection
					title="Loading"
					note="A T2 tool stays hidden until the loader, a function tool, names it."
				>
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

/** What the test-connection route answers: an HTTP response, or an MCP server's tool list. */
interface ProbeResult {
	ok: boolean;
	status?: number;
	statusText?: string;
	error?: string;
	preview?: string;
	elapsedMs?: number;
	tools?: string[];
	targetToolFound?: boolean;
}

/** A JSON object typed into the test, or why it isn't one. Blank is `undefined`. */
function parseObject(
	raw: string,
	label: string,
): { value?: Record<string, unknown>; error?: string } {
	if (!raw.trim()) return {};
	try {
		const parsed: unknown = JSON.parse(raw);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return { value: parsed as Record<string, unknown> };
		}
	} catch {
		// Falls through to the error below.
	}
	return { error: `${label} must be a JSON object.` };
}

/** The test-connection request for `tool`. The server applies its own network policy. */
function probeRequest(
	tool: ToolSpecDraft,
	sampleInput: string,
	credential: string,
): { body?: Record<string, unknown>; error?: string } {
	const headers = parseObject(tool.headersJson ?? '', 'Headers');
	if (headers.error) return { error: headers.error };
	const authType = tool.authType ?? 'none';
	const shared = {
		headers: headers.value,
		...(authType === 'none'
			? {}
			: {
					auth: {
						type: authType,
						headerName: tool.authHeaderName,
						headerPrefix: tool.authHeaderPrefix,
					},
					testCredential: credential || undefined,
				}),
	};
	if (tool.toolType === 'mcp') {
		return {
			body: {
				type: 'mcp',
				serverUrl: tool.serverUrl ?? '',
				mcpToolName: tool.mcpToolName,
				...shared,
			},
		};
	}
	const input = parseObject(sampleInput, 'Sample input');
	if (input.error) return { error: input.error };
	return {
		body: {
			type: 'http',
			endpoint: tool.endpoint ?? '',
			method: tool.method ?? HTTP_METHODS[0],
			pathParams: tool.pathParams,
			queryParams: tool.queryParams,
			bodyParam: tool.bodyParam,
			sampleInput: input.value,
			...shared,
		},
	};
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
	const [credential, setCredential] = useState('');
	const [pending, setPending] = useState(false);
	const [result, setResult] = useState<ProbeResult>();
	const http = tool.toolType === 'http';
	const method = tool.method ?? HTTP_METHODS[0];

	const run = async () => {
		const request = probeRequest(tool, sampleInput, credential);
		if (!request.body) {
			setResult({ ok: false, error: request.error });
			return;
		}
		setPending(true);
		try {
			const response = await fetch('/api/playground/test-connection', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(request.body),
			});
			setResult(await response.json<ProbeResult>());
		} catch {
			setResult({ ok: false, error: "Couldn't reach the playground server." });
		} finally {
			setPending(false);
		}
	};

	const warned = result?.ok && result.targetToolFound === false;
	return (
		<InspectorSection
			title="Test"
			note={
				http
					? `Sends one real ${method} request with the sample input.`
					: 'Asks the server which tools it has.'
			}
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
			<InspectorSection title="Tool" note="What the model calls, and what it's told the tool does.">
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
			<InspectorSection title="Contract" note="What it takes and gives back, as JSON Schema.">
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
			{tool.toolType === 'function' && (
				<InspectorSection
					title="Stub"
					note="The playground has no code to run, so a function tool answers with this."
				>
					<TextAreaRow
						label="Returns"
						path="playground.stubOutput"
						field="stubOutputJson"
						value={tool.stubOutputJson ?? ''}
						rows={6}
						hasSpellCheck={false}
						placeholder="Left blank, a stand-in built from the output schema."
						onChange={(stubOutputJson) => {
							set({ stubOutputJson });
						}}
					/>
				</InspectorSection>
			)}
			{tool.toolType === 'http' && (
				<>
					<InspectorSection
						title="Request"
						note="Where each call goes. Headers are saved in the profile, so keep secrets under Auth."
					>
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
						<ChoiceRow<HttpMethod>
							label="Method"
							path="method"
							field="method"
							value={tool.method ?? HTTP_METHODS[0]}
							options={HTTP_METHODS}
							onChange={(method) => {
								set({ method: method || undefined });
							}}
						/>
						{headersRow}
					</InspectorSection>
					<InspectorSection title="Mapping" note="Which input fields fill the URL and the body.">
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
							placeholder="None"
							onChange={(bodyParam) => {
								set({ bodyParam });
							}}
						/>
					</InspectorSection>
				</>
			)}
			{tool.toolType === 'mcp' && (
				<InspectorSection
					title="Server"
					note="The MCP server and the tool on it. Headers are saved in the profile, so keep secrets under Auth."
				>
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
				<InspectorSection
					title="Auth"
					note="The credential sent with each call. The playground holds none, so a tool that needs one can't sign in here."
				>
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
								placeholder={AUTH_HEADER_PREFIX[authType] || 'None'}
								onChange={(prefix) => {
									// Blank is the kernel's prefix for the type, which the placeholder shows.
									set({ authHeaderPrefix: prefix || undefined });
								}}
							/>
							<SegmentedRow
								label="Signed out"
								path="auth.onUnauthenticated"
								field="authUnauthenticated"
								value={tool.authUnauthenticated ?? 'pause'}
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
			<InspectorSection
				title="Policy"
				note="What it may change, when it asks first, and when the model sees it."
			>
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

/**
 * The editor for the tree node `selectedId`. The compile's issues for that node show on the rows
 * of the fields they name; the rest, and all of them for a node with no editor yet, show above it.
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
	let hasRows = true;
	switch (ref.facet) {
		case 'identity':
			editor = <IdentityEditor {...props} />;
			break;
		case 'models':
			editor = <ModelsEditor {...props} />;
			break;
		case 'modelBinding':
			editor = <ModelBindingEditor {...props} bindingKey={ref.key} />;
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
		default:
			hasRows = false;
			editor = (
				<Section variant="transparent" padding={3}>
					<EmptyState
						title={`${profileGraphFacet(ref.facet)?.label ?? 'This section'} isn't editable yet`}
						description="Its editor is next."
					/>
				</Section>
			);
	}

	const banners = hasRows ? nodeIssues.filter((issue) => issue.field === undefined) : nodeIssues;
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
