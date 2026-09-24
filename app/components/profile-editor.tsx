import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Section } from '@astryxdesign/core/Section';
import { StackItem } from '@astryxdesign/core/Stack';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import {
	IconAntennaBars1,
	IconAntennaBars2,
	IconAntennaBars3,
	IconAntennaBars4,
	IconAntennaBars5,
	IconAntennaBarsOff,
	IconBan,
	IconBroadcast,
	IconDeviceDesktop,
	IconFlame,
	IconLetterA,
	IconLetterB,
	IconLetterC,
	IconLetterT,
	IconPhoto,
	IconPlus,
	IconVolume,
	IconX,
} from '@tabler/icons-react';
import {
	ATTACHMENT_ACCEPT_MIMES,
	type OverflowKeySlot,
	PROFILE_TYPE_PROTOCOLS,
	PROTOCOL_PROVIDERS,
	type Protocol,
	type Provider,
	profileGraphFacet,
	THINKING_LEVELS,
	type ThinkingLevel,
	VOICE_ACCEPT_MIMES,
} from '@theoremai/agents';
import {
	allowedBuiltinsForGemini,
	defaultBindingForProfileType,
	GEMINI_PLAYGROUND_DEFAULT_API_ID,
	GEMINI_PLAYGROUND_MODELS,
	isGoogleTransport,
	isOpenRouterTransport,
	type ModelBindingDraft,
	OPENROUTER_PLAYGROUND_API_ID,
	type PlaygroundDraft,
	type PlaygroundIssue,
	type PlaygroundProfileType,
	playgroundNodeRef,
	setProfileType,
} from '@theoremai/playground';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { IconGemini, IconGoogle, IconOpenAi, IconOpenRouter } from './brand-icons';
import {
	ChoiceRow,
	InspectorRow,
	InspectorSection,
	ListRow,
	NodeIssues,
	NumberRow,
	type Segment,
	SegmentedRow,
	SwitchRow,
	TextRow,
	useFieldStatus,
} from './inspector';

type SetDraft = Dispatch<SetStateAction<PlaygroundDraft>>;

/** The draft's sections that are one object of settings, rather than a list. */
type SettingsSection = Exclude<keyof PlaygroundDraft, 'included' | 'modelBindings' | 'toolSpecs'>;

/** Sets fields of one section of the draft, leaving the rest as it is. */
function patch<K extends SettingsSection>(setDraft: SetDraft, key: K) {
	return (change: Partial<PlaygroundDraft[K]>) => {
		setDraft((draft) => ({ ...draft, [key]: { ...draft[key], ...change } }));
	};
}

const PROFILE_TYPE_SEGMENTS: Segment<PlaygroundProfileType>[] = [
	{ value: 'text', label: 'Text', icon: IconLetterT },
	{ value: 'image', label: 'Image', icon: IconPhoto },
	{ value: 'speech', label: 'Speech', icon: IconVolume },
	{ value: 'live', label: 'Live', icon: IconBroadcast },
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

const ATTACHMENT_OPTIONS = [...ATTACHMENT_ACCEPT_MIMES];
const VOICE_OPTIONS = [...VOICE_ACCEPT_MIMES];

function runsInPlayground(protocol: Protocol, provider: Provider): boolean {
	return isGoogleTransport(protocol, provider) || isOpenRouterTransport(protocol, provider);
}

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
				<InspectorSection title="System prompt">
					<TextArea
						label="System prompt"
						isLabelHidden
						size="sm"
						rows={8}
						value={identity.system}
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
		<InspectorSection title="Policy">
			<ChoiceRow
				label="Default"
				path="defaultModel"
				field="defaultModel"
				value={models.defaultModel}
				placeholder="First model"
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
			<InspectorSection title="Model">
				<TextRow
					label="Id"
					path="models.*"
					field="modelId"
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
						isDisabled: !runsInPlayground(binding.protocol, provider),
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
							? GEMINI_PLAYGROUND_MODELS.map((model) => ({
									value: model.id,
									label: model.label,
									description: model.id,
								}))
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
						placeholder="None"
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
				<SwitchRow
					label="Summaries"
					path="models.*.summaries"
					value={binding.summaries}
					onChange={(summaries) => {
						set({ summaries });
					}}
				/>
			</InspectorSection>
			<InspectorSection title="Efforts">
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
					placeholder="None"
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
	return (
		<>
			<InspectorSection title="Accepts">
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
					value={inputs.attachmentsAccept}
					options={ATTACHMENT_OPTIONS}
					placeholder="None"
					onChange={(attachmentsAccept) => {
						set({ attachmentsAccept });
					}}
				/>
				<ListRow
					label="Voice"
					path="inputs.voice.accept"
					value={inputs.voiceAccept}
					options={VOICE_OPTIONS}
					placeholder="None"
					onChange={(voiceAccept) => {
						set({ voiceAccept });
					}}
				/>
			</InspectorSection>
			<InspectorSection title="Limits">
				<NumberRow
					label="Max files"
					path="inputs.maxFiles"
					field="maxFiles"
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
					field="maxBytes"
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
					field="maxTurnBytes"
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

/**
 * The editor for the tree node `selectedId`. The compile's issues for that node show on the rows
 * of the fields they name; the rest, and all of them for a node with no editor yet, show above it.
 * Edits go straight to the draft; the page compiles it.
 */
export function ProfileEditor({
	draft,
	setDraft,
	selectedId,
	issues,
}: {
	draft: PlaygroundDraft;
	setDraft: SetDraft;
	selectedId: string;
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
		case 'inputs':
			editor = <InputsEditor {...props} />;
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
