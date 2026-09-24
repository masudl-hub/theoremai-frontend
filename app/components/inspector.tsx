import type { InputStatus } from '@astryxdesign/core/Field';
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
import { createContext, type ReactNode, useContext } from 'react';

/**
 * Inspector building blocks: captioned sections of label-and-control rows, after Astryx's
 * canvas editor template. Every control is `sm` and hides its own label, because the row's
 * label column names it; that column is one fixed width, so every control starts on one edge.
 */

/** The template's label column. Row labels are kept to a word or two so they fit it. */
const LABEL_COLUMN = 80;

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
 * A row's label, with the schema's entry for `path` on hover: what it does, then its options as
 * tokens (or its type, when it has none). The profile types that take it are only named when one
 * the playground offers can't.
 */
function RowLabel({ label, path }: { label: string; path: string }) {
	const meta = fieldMeta(path);
	const scope = meta?.profileTypes;
	const takes = PLAYGROUND_PROFILE_TYPES.filter((type) => !scope || scope.includes(type));
	const scoped = takes.length < PLAYGROUND_PROFILE_TYPES.length ? takes : undefined;
	const text = (
		<Text type="label" color="secondary" maxLines={1}>
			{label}
		</Text>
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
	hasIssue,
	children,
}: {
	label: string;
	path: string;
	hasIssue?: boolean;
	children: ReactNode;
}) {
	return (
		<HStack gap={2} vAlign="center" {...{ [ISSUE_ROW_ATTRIBUTE]: hasIssue || undefined }}>
			<StackItem size="static">
				<HStack width={LABEL_COLUMN}>
					<RowLabel label={label} path={path} />
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

export function TextRow({
	label,
	path,
	field,
	value,
	placeholder,
	onChange,
}: {
	label: string;
	path: string;
	/** The draft field whose issues show on this row. */
	field?: string;
	value: string;
	placeholder?: string;
	onChange: (next: string) => void;
}) {
	const status = useFieldStatus()(field);
	return (
		<InspectorRow label={label} path={path} hasIssue={status !== undefined}>
			<StackItem size="fill">
				<TextInput
					label={label}
					status={status}
					isLabelHidden
					size="sm"
					value={value}
					placeholder={placeholder}
					onChange={onChange}
				/>
			</StackItem>
		</InspectorRow>
	);
}

/** A number the kernel defaults when unset: clearing it gives `null`, shown as "Default". */
export function NumberRow({
	label,
	path,
	field,
	value,
	min,
	max,
	step,
	isIntegerOnly,
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
	onChange: (next: number | null) => void;
}) {
	const status = useFieldStatus()(field);
	return (
		<InspectorRow label={label} path={path} hasIssue={status !== undefined}>
			<StackItem size="fill">
				<NumberInput
					label={label}
					status={status}
					isLabelHidden
					size="sm"
					value={value}
					placeholder="Default"
					min={min}
					max={max}
					step={step}
					isIntegerOnly={isIntegerOnly}
					isWheelEnabled={false}
					hasClear
					onChange={onChange}
				/>
			</StackItem>
		</InspectorRow>
	);
}

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
}) {
	const options = fieldMeta(path)?.optionDescriptions;
	const status = useFieldStatus()(field);
	return (
		<InspectorRow label={label} path={path} hasIssue={status !== undefined}>
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

/** A choice from a list the draft supplies (models, aliases). `''` is "not set" when `placeholder` is given, and the choice can be cleared. */
export function ChoiceRow({
	label,
	path,
	field,
	value,
	options,
	placeholder,
	isDisabled,
	onChange,
}: {
	label: string;
	path: string;
	/** The draft field whose issues show on this row. */
	field?: string;
	value: string;
	options: SelectorOptionType[];
	placeholder?: string;
	isDisabled?: boolean;
	onChange: (next: string) => void;
}) {
	const status = useFieldStatus()(field);
	return (
		<InspectorRow label={label} path={path} hasIssue={status !== undefined}>
			<StackItem size="fill">
				{placeholder === undefined ? (
					<Selector
						label={label}
						status={status}
						isLabelHidden
						size="sm"
						value={value}
						options={options}
						placement="below"
						isDisabled={isDisabled}
						onChange={onChange}
					/>
				) : (
					<Selector
						label={label}
						status={status}
						isLabelHidden
						size="sm"
						value={value || null}
						options={options}
						placement="below"
						placeholder={placeholder}
						isDisabled={isDisabled}
						hasClear
						onChange={(next) => {
							onChange(next ?? '');
						}}
					/>
				)}
			</StackItem>
		</InspectorRow>
	);
}

export function ListRow({
	label,
	path,
	field,
	value,
	options,
	placeholder,
	onChange,
}: {
	label: string;
	path: string;
	/** The draft field whose issues show on this row. */
	field?: string;
	value: string[];
	options: SelectorOptionType[];
	placeholder?: string;
	onChange: (next: string[]) => void;
}) {
	const status = useFieldStatus()(field);
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
					placeholder={placeholder}
					hasSearch
					onChange={onChange}
				/>
			</StackItem>
		</InspectorRow>
	);
}
