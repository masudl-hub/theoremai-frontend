import { FieldLabel, type InputStatus } from '@astryxdesign/core/Field';
import { FieldStatus } from '@astryxdesign/core/FieldStatus';
import { HoverCard } from '@astryxdesign/core/HoverCard';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { MultiSelector } from '@astryxdesign/core/MultiSelector';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Section } from '@astryxdesign/core/Section';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Selector, type SelectorOptionType } from '@astryxdesign/core/Selector';
import { StackItem } from '@astryxdesign/core/Stack';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { VStack } from '@astryxdesign/core/VStack';
import { fieldMeta } from '@theoremai/agents';
import { PLAYGROUND_PROFILE_TYPES, type PlaygroundIssue } from '@theoremai/playground';
import { createContext, type ReactNode, useContext, useId } from 'react';

/**
 * Inspector building blocks: captioned sections of label-and-control rows, after Astryx's
 * canvas editor template. Every control is `sm` and hides its own label, because the row's
 * label column names it; that column is one fixed width, so every control starts on one edge.
 */

/**
 * The label column, wide enough for the longest label ("Temperature", "Attachments") on one line.
 * The template's is 80, which fits its shorter labels.
 */
const LABEL_COLUMN = 96;

/** The compile issues for the node being edited; rows show the ones on their field. */
export const NodeIssues = createContext<readonly PlaygroundIssue[]>([]);

/**
 * Looks up the error status for a draft field of the node being edited, and for a list field, the
 * entry at `index`. Several issues on one field show as one message.
 */
export function useFieldStatus(): (field?: string, index?: number) => InputStatus | undefined {
	const issues = useContext(NodeIssues);
	return (field, index) => {
		if (field === undefined) return undefined;
		const messages = issues
			.filter((issue) => issue.field === field && issue.index === index)
			.map((issue) => issue.message);
		return messages.length ? { type: 'error', message: messages.join(' ') } : undefined;
	};
}

/**
 * Whether the field at `path` must be set, and what leaving it out does, from the kernel's catalog.
 * `isRequired` overrides it for a field required only in some cases, saying whether it is now.
 */
function presence(path: string, isRequired?: boolean) {
	const meta = fieldMeta(path);
	const required = isRequired ?? meta?.required === true;
	return { required, unset: required ? undefined : meta?.unset };
}

/** Marks a row that has an issue, so the issue pill can scroll to it. */
export const ISSUE_ROW_ATTRIBUTE = 'data-issue';

/**
 * A captioned group of rows. The panel stays at zero padding and each section carries the gutter.
 * Transparent, so the panel's own surface shows through.
 */
export function InspectorSection({ title, children }: { title: string; children: ReactNode }) {
	return (
		<Section variant="transparent" padding={3}>
			<VStack gap={3}>
				<Text type="label" weight="semibold">
					{title}
				</Text>
				{children}
			</VStack>
		</Section>
	);
}

/**
 * A row's label, with "Required" under it when `isRequired`, and the schema's entry for `path` on hover:
 * what it does, then its options as tokens (or its type, when it has none), when it's required or
 * what leaving it out does. The profile types that take it are only named when one the playground
 * offers can't.
 */
function RowLabel({
	label,
	path,
	isRequired,
}: {
	label: string;
	path: string;
	isRequired: boolean;
}) {
	const id = useId();
	const meta = fieldMeta(path);
	const scope = meta?.profileTypes;
	const takes = PLAYGROUND_PROFILE_TYPES.filter((type) => !scope || scope.includes(type));
	const scoped = takes.length < PLAYGROUND_PROFILE_TYPES.length ? takes : undefined;
	// A group label: it names the row rather than one control, since each control carries its own
	// hidden label, so it points at no input.
	const text = (
		<FieldLabel
			label={label}
			inputID={id}
			isGroupLabel
			description={isRequired ? 'Required' : undefined}
		/>
	);
	if (!meta) return text;
	return (
		<HoverCard
			label={label}
			content={
				<VStack gap={2} maxWidth={280}>
					<Text>{meta.doc}</Text>
					<HStack gap={1} wrap="wrap">
						{(meta.options ?? [meta.type]).map((option) => (
							<Token key={option} label={option} size="sm" />
						))}
					</HStack>
					{meta.optionNote && <Text color="secondary">{meta.optionNote}</Text>}
					{typeof meta.required === 'string' && (
						<Text color="secondary">{`Required ${meta.required}.`}</Text>
					)}
					{meta.unset && <Text color="secondary">{`Left out: ${meta.unset}.`}</Text>}
					{scoped && <Text color="secondary">{`Only on ${scoped.join(', ')} profiles.`}</Text>}
				</VStack>
			}
		>
			{text}
		</HoverCard>
	);
}

/**
 * One row: the label column, then the controls for it. `path` is the field's schema catalog path;
 * `hasIssue` marks the row for the issue pill.
 */
export function InspectorRow({
	label,
	path,
	isRequired = false,
	hasIssue,
	children,
}: {
	label: string;
	path: string;
	/** Notes "Required" under the label. */
	isRequired?: boolean;
	hasIssue?: boolean;
	children: ReactNode;
}) {
	return (
		<HStack gap={2} vAlign="center" {...{ [ISSUE_ROW_ATTRIBUTE]: hasIssue || undefined }}>
			<StackItem size="static">
				<HStack width={LABEL_COLUMN}>
					<RowLabel label={label} path={path} isRequired={isRequired} />
				</HStack>
			</StackItem>
			<StackItem size="fill">
				<HStack gap={1} vAlign="center">
					{children}
				</HStack>
			</StackItem>
		</HStack>
	);
}

/** Says whether the row's field is required now, for one required only in some cases. */
type IsRequired = { isRequired?: boolean };

/** Free text. An optional field left blank shows what leaving it out does, unless `placeholder` is an example. */
export function TextRow({
	label,
	path,
	field,
	value,
	placeholder,
	isRequired,
	onChange,
}: {
	label: string;
	path: string;
	/** The draft field whose issues show on this row. */
	field?: string;
	value: string;
	placeholder?: string;
	onChange: (next: string) => void;
} & IsRequired) {
	const status = useFieldStatus()(field);
	const { required, unset } = presence(path, isRequired);
	return (
		<InspectorRow label={label} path={path} isRequired={required} hasIssue={status !== undefined}>
			<StackItem size="fill">
				<TextInput
					label={label}
					status={status}
					isLabelHidden
					isRequired={required}
					size="sm"
					value={value}
					placeholder={placeholder ?? unset}
					onChange={onChange}
				/>
			</StackItem>
		</InspectorRow>
	);
}

/** A number the kernel leaves unset when cleared: it gives `null`, shown as what leaving it out does. */
export function NumberRow({
	label,
	path,
	field,
	value,
	min,
	max,
	step,
	isIntegerOnly,
	units,
	isRequired,
	onChange,
}: {
	label: string;
	path: string;
	/** The draft field whose issues show on this row. */
	field?: string;
	value: number | null;
	min?: number;
	max?: number;
	step?: number;
	isIntegerOnly?: boolean;
	/** Shown at the end of the input, e.g. `ms`. */
	units?: string;
	onChange: (next: number | null) => void;
} & IsRequired) {
	const status = useFieldStatus()(field);
	const { required, unset } = presence(path, isRequired);
	return (
		<InspectorRow label={label} path={path} isRequired={required} hasIssue={status !== undefined}>
			<StackItem size="fill">
				<NumberInput
					label={label}
					status={status}
					isLabelHidden
					isRequired={required}
					size="sm"
					value={value}
					placeholder={unset}
					min={min}
					max={max}
					step={step}
					isIntegerOnly={isIntegerOnly}
					units={units}
					isWheelEnabled={false}
					hasClear
					onChange={onChange}
				/>
			</StackItem>
		</InspectorRow>
	);
}

/** On or off. What leaving it out does shows on hover. */
export function SwitchRow({
	label,
	path,
	field,
	value,
	isDisabled,
	onChange,
}: {
	label: string;
	path: string;
	/** The draft field whose issues show on this row. */
	field?: string;
	value: boolean;
	isDisabled?: boolean;
	onChange: (next: boolean) => void;
}) {
	const status = useFieldStatus()(field);
	return (
		<InspectorRow label={label} path={path} hasIssue={status !== undefined}>
			<Switch
				label={label}
				status={status}
				isLabelHidden
				size="sm"
				value={value}
				isDisabled={isDisabled}
				onChange={onChange}
			/>
		</InspectorRow>
	);
}

export interface Segment<T extends string> {
	value: T;
	label: string;
	icon: IconType;
	isDisabled?: boolean;
}

/**
 * A closed set, as icon-only segments. Each segment's label is its accessible name, and on hover
 * it shows with the schema's description of that option.
 */
export function SegmentedRow<T extends string>({
	label,
	path,
	field,
	value,
	segments,
	isDisabled,
	isRequired,
	onChange,
}: {
	label: string;
	path: string;
	/** The draft field whose issues show on this row. */
	field?: string;
	value: T;
	segments: readonly Segment<T>[];
	isDisabled?: boolean;
	onChange: (next: T) => void;
} & IsRequired) {
	const options = fieldMeta(path)?.optionDescriptions;
	const status = useFieldStatus()(field);
	const { required } = presence(path, isRequired);
	return (
		<InspectorRow label={label} path={path} isRequired={required} hasIssue={status !== undefined}>
			<StackItem size="fill">
				<SegmentedControl
					label={label}
					size="sm"
					layout="fill"
					value={value}
					isDisabled={isDisabled}
					onChange={(next) => {
						const segment = segments.find((candidate) => candidate.value === next);
						if (segment) onChange(segment.value);
					}}
				>
					{segments.map((segment) => {
						const description = options?.[segment.value];
						return (
							<Tooltip
								key={segment.value}
								content={description ? `${segment.label}: ${description}` : segment.label}
							>
								<SegmentedControlItem
									value={segment.value}
									label={segment.label}
									isLabelHidden
									isDisabled={segment.isDisabled}
									icon={<Icon icon={segment.icon} size="sm" />}
								/>
							</Tooltip>
						);
					})}
				</SegmentedControl>
				{status?.message && (
					<FieldStatus type="error" message={status.message} variant="detached" />
				)}
			</StackItem>
		</InspectorRow>
	);
}

/** One option of a `ChoiceRow`: its value alone, or with a label, a description, or disabled. */
export type Choice<T extends string> =
	| T
	| { value: T; label?: string; description?: string; disabled?: boolean };

/**
 * A choice from a list, `''` when none is chosen. An optional one can be cleared, and shows what
 * leaving it out does while blank. `hasSearch` filters a long list.
 */
export function ChoiceRow<T extends string>({
	label,
	path,
	field,
	value,
	options,
	isDisabled,
	isRequired,
	hasSearch,
	onChange,
}: {
	label: string;
	path: string;
	/** The draft field whose issues show on this row. */
	field?: string;
	value: T | '';
	options: readonly Choice<T>[];
	isDisabled?: boolean;
	hasSearch?: boolean;
	onChange: (next: T | '') => void;
} & IsRequired) {
	const status = useFieldStatus()(field);
	const { required, unset } = presence(path, isRequired);
	// The Selector hands back a plain string; take the option's own value for it.
	const choose = (next: string | null) => {
		const chosen = options
			.map((option) => (typeof option === 'string' ? option : option.value))
			.find((candidate) => candidate === next);
		onChange(chosen ?? '');
	};
	const shared = {
		label,
		status,
		isLabelHidden: true,
		size: 'sm' as const,
		options: [...options],
		placement: 'below' as const,
		isDisabled,
		hasSearch,
	};
	return (
		<InspectorRow label={label} path={path} isRequired={required} hasIssue={status !== undefined}>
			<StackItem size="fill">
				{required ? (
					<Selector {...shared} isRequired value={value} onChange={choose} />
				) : (
					<Selector
						{...shared}
						value={value || null}
						placeholder={unset}
						hasClear
						onChange={choose}
					/>
				)}
			</StackItem>
		</InspectorRow>
	);
}

/**
 * Several choices from a list, the first as a badge and the rest counted: the trigger is one line
 * tall, and Astryx wraps badges past it. Left empty, it shows what leaving it out does.
 */
export function ListRow({
	label,
	path,
	field,
	value,
	options,
	onChange,
}: {
	label: string;
	path: string;
	/** The draft field whose issues show on this row. */
	field?: string;
	value: string[];
	options: SelectorOptionType[];
	onChange: (next: string[]) => void;
}) {
	const status = useFieldStatus()(field);
	const { unset } = presence(path);
	return (
		<InspectorRow label={label} path={path} hasIssue={status !== undefined}>
			<StackItem size="fill">
				<MultiSelector
					label={label}
					status={status}
					isLabelHidden
					size="sm"
					value={value}
					options={options}
					placeholder={unset}
					hasSearch
					triggerDisplay="badges"
					maxBadges={1}
					onChange={onChange}
				/>
			</StackItem>
		</InspectorRow>
	);
}
