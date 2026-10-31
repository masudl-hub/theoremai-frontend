import { ensureHighlightStyles, tokenize } from '@astryxdesign/core/CodeBlock';
import { DropdownMenu, type DropdownMenuItemData } from '@astryxdesign/core/DropdownMenu';
import { HStack } from '@astryxdesign/core/HStack';
import { useScrollableArea } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Token } from '@astryxdesign/core/Token';
import {
	IconAdjustmentsHorizontal,
	IconAntennaBars1,
	IconAntennaBars2,
	IconAntennaBars3,
	IconAntennaBars4,
	IconAntennaBars5,
	IconAntennaBarsOff,
	IconCheck,
	IconCode,
	IconEye,
	IconFlame,
	IconHandStop,
	IconHttpDelete,
	IconHttpGet,
	IconHttpPatch,
	IconHttpPost,
	IconHttpPut,
	IconPackage,
	IconPencil,
	IconPlayerPlay,
	IconPlus,
	IconServer,
	IconSquareRoundedNumber0,
	IconSquareRoundedNumber2,
	IconTrash,
	IconUserCheck,
	IconWaveSine,
} from '@tabler/icons-react';
import { IconGemini, IconOpenRouter } from '@theoremjs/studio/ui/brand-icons.tsx';
import { PROFILE_TYPE_ICON, toolTypeIcon } from '@theoremjs/studio/ui/lib/type-icons.ts';
import {
	type ComponentProps,
	type CSSProperties,
	lazy,
	type ReactNode,
	Suspense,
	useCallback,
	useEffect,
	useInsertionEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { carrySlots } from '../../lib/docs/carry-slots';
import { rowStarts } from '../../lib/docs/sample-program';
import type { CodeChoice, CodeSlot, CodeSlots, StudioSeedId } from '../../lib/docs/schema';
import { CopyIconButton } from './copy-button';
import './enhanced-code-view.css';

const SeedForm = lazy(() => import('./seed-form'));

const NO_SLOTS: readonly CodeSlot[] = [];
const NO_CHOICES: readonly CodeChoice[] = [];

/** The icon a kernel value wears, as the studio draws it. */
const VALUE_ICONS: Partial<Record<string, ComponentProps<typeof Icon>['icon']>> = {
	...PROFILE_TYPE_ICON,
	builtin: toolTypeIcon('builtin'),
	function: toolTypeIcon('function'),
	http: toolTypeIcon('http'),
	mcp: toolTypeIcon('mcp'),
	agent: toolTypeIcon('agent'),
	'read-only': IconEye,
	'read-write': IconPencil,
	destructive: IconFlame,
	auto: IconPlayerPlay,
	session_consent: IconUserCheck,
	always_confirm: IconHandStop,
	T0: IconSquareRoundedNumber0,
	T2: IconSquareRoundedNumber2,
	GET: IconHttpGet,
	POST: IconHttpPost,
	PUT: IconHttpPut,
	PATCH: IconHttpPatch,
	DELETE: IconHttpDelete,
	none: IconAntennaBarsOff,
	minimal: IconAntennaBars1,
	low: IconAntennaBars2,
	medium: IconAntennaBars3,
	high: IconAntennaBars4,
	xhigh: IconAntennaBars5,
	max: IconFlame,
	sse: IconWaveSine,
	buffered: IconPackage,
	local: IconServer,
};

function valueIcon(value: string): ReactNode {
	if (value === 'gemini') return <IconGemini width={14} height={14} />;
	if (value === 'openrouter') return <IconOpenRouter width={14} height={14} />;
	const icon = VALUE_ICONS[value];
	return icon ? <Icon icon={icon} size="sm" /> : undefined;
}

interface LineTokenMatch {
	start: number;
	end: number;
	literal: string;
	value: string;
	choices: readonly CodeChoice[];
	isAllowList?: boolean;
}

/** The slots on one line, with the line's own columns. */
function lineSlots(
	code: string,
	lineStart: number,
	lineLength: number,
	slots: readonly CodeSlot[],
) {
	return slots.flatMap((slot): LineTokenMatch[] => {
		if (slot.start < lineStart || slot.end > lineStart + lineLength) return [];
		const literal = code.slice(slot.start, slot.end);
		return [
			{
				start: slot.start - lineStart,
				end: slot.end - lineStart,
				literal,
				value: literal.slice(1, -1),
				choices: slot.choices,
			},
		];
	});
}

/** The strings on a line of the allow array, each a tool the array could name instead. */
function allowSlots(lineText: string, tools: readonly CodeChoice[]): LineTokenMatch[] {
	if (tools.length === 0) return [];
	return [...lineText.matchAll(/'([^']+)'|"([^"]+)"/g)].flatMap((match) => {
		const value = match[1] ?? match[2] ?? '';
		if (!tools.some((tool) => tool.value === value)) return [];
		const end = match.index + match[0].length;
		const literal = match[0];
		return [{ start: match.index, end, literal, value, choices: tools, isAllowList: true }];
	});
}

/** Astryx's span line: the text between tokens stays plain, so `white-space: pre` keeps every space. */
function renderSyntaxSegment(
	text: string,
	startOffset: number,
	lineTokens: readonly { type: string; start: number; end: number }[],
): ReactNode[] {
	const parts: ReactNode[] = [];
	const endOffset = startOffset + text.length;
	const relevantTokens = lineTokens.filter((t) => t.end > startOffset && t.start < endOffset);

	let cursor = startOffset;
	for (const t of relevantTokens) {
		const segStart = Math.max(t.start, startOffset);
		if (segStart > cursor) {
			parts.push(text.slice(cursor - startOffset, segStart - startOffset));
		}
		const segEnd = Math.min(t.end, endOffset);
		parts.push(
			<span
				key={`${String(segStart)}-${t.type}`}
				className={`astryx-token-${t.type} xds-token-${t.type}`}
			>
				{text.slice(segStart - startOffset, segEnd - startOffset)}
			</span>,
		);
		cursor = segEnd;
	}

	if (cursor < endOffset) {
		parts.push(text.slice(cursor - startOffset));
	}

	return parts;
}

/** Where the `tools: { allow: [ ... ] }` array closes: the line and the column of its `]`. */
interface AllowClose {
	line: number;
	col: number;
}

/** Which lines are inside the allow array, and where it closes. An array on one line is inside and closes on it. */
function allowModel(lines: string[]): { flags: boolean[]; close: AllowClose | null } {
	let inAllow = false;
	let close: AllowClose | null = null;
	const flags = lines.map((line, idx) => {
		const open = /allow\s*:\s*\[/.exec(line);
		if (open) {
			const col = line.indexOf(']', open.index + open[0].length);
			if (col === -1) {
				inAllow = true;
			} else {
				close ??= { line: idx, col };
			}
			return true;
		}
		if (inAllow) {
			const col = line.indexOf(']');
			if (col !== -1) {
				inAllow = false;
				close ??= { line: idx, col };
				return false;
			}
		}
		return inAllow;
	});
	return { flags, close };
}

/** The tools the allow array names. */
function allowedTools(lines: string[], flags: boolean[]): Set<string> {
	const allowed = new Set<string>();
	lines.forEach((line, idx) => {
		if (!flags[idx]) return;
		for (const match of line.matchAll(/'([^']+)'|"([^"]+)"/g)) {
			const val = match.at(1) ?? match.at(2);
			if (val) allowed.add(val);
		}
	});
	return allowed;
}

/** What the view reads off its code: the lines and their syntax, and the slots' context. */
function codeModel(code: string, language: string) {
	// As Astryx's CodeBlock: a trailing newline is not a line.
	const lines = code.split('\n');
	if (lines.length > 1 && lines.at(-1) === '') lines.pop();
	const allow = allowModel(lines);
	return {
		lines,
		syntaxLines: tokenize(code, language),
		maxDigits: String(lines.length).length,
		lineStarts: rowStarts(lines),
		allowBlockFlags: allow.flags,
		allowClose: allow.close,
		currentAllowedTools: allowedTools(lines, allow.flags),
	};
}

/** The code with one line's text from `start` to `end` replaced. */
function spliceLine(code: string, line: number, start: number, end: number, text: string): string {
	const rows = code.split('\n');
	const row = rows[line] ?? '';
	rows[line] = row.slice(0, start) + text + row.slice(end);
	return rows.join('\n');
}

/** The code without the tool at this place in the allow array, its comma with it; a row left empty goes. */
function removeAllowed(code: string, line: number, match: LineTokenMatch): string {
	const rows = code.split('\n');
	const row = rows[line] ?? '';
	const after = /^\s*,\s*/.exec(row.slice(match.end));
	const before = /\s*,\s*$/.exec(row.slice(0, match.start));
	const [start, end] = after
		? [match.start, match.end + after[0].length]
		: before
			? [match.start - before[0].length, match.end]
			: [match.start, match.end];
	const next = row.slice(0, start) + row.slice(end);
	if (next.trim() === '') rows.splice(line, 1);
	else rows[line] = next;
	return rows.join('\n');
}

/** The code with a tool added at the end of the allow array, written as the array is: on its own row, or inline. */
function addAllowed(code: string, close: AllowClose, tool: string): string {
	const rows = code.split('\n');
	const row = rows[close.line] ?? '';
	if (row.slice(0, close.col).trim() !== '') {
		const inner = row.slice(0, close.col).trimEnd();
		const text = inner.endsWith('[') ? `'${tool}'` : `, '${tool}'`;
		rows[close.line] = inner + text + row.slice(close.col);
		return rows.join('\n');
	}
	const prevIdx = close.line - 1;
	const prev = rows[prevIdx] ?? '';
	if (/allow\s*:\s*\[\s*$/.test(prev)) {
		rows.splice(close.line, 0, `${row.slice(0, close.col)}\t'${tool}',`);
		return rows.join('\n');
	}
	const indent = /^\s*/.exec(prev)?.[0] ?? '';
	if (!prev.trimEnd().endsWith(',')) rows[prevIdx] = `${prev.trimEnd()},`;
	rows.splice(close.line, 0, `${indent}'${tool}',`);
	return rows.join('\n');
}

/** The icon of the slot's current value. */
function slotIcon(match: LineTokenMatch): ReactNode {
	const current = match.choices.find((choice) => choice.value === match.value);
	return valueIcon(current?.icon ?? match.value);
}

/** A token in the code that opens a menu of choices. */
function TokenMenu({
	label,
	icon,
	items,
}: {
	label: string;
	icon?: ReactNode;
	items: DropdownMenuItemData[];
}) {
	return (
		<DropdownMenu
			renderTrigger={(triggerProps) => (
				<button type="button" className="enhanced-code-token-wrap" {...triggerProps}>
					<Token size="sm" label={label} icon={icon} />
				</button>
			)}
			items={items}
		/>
	);
}

/** A choice as a menu row. */
function choiceItem(choice: CodeChoice, label: string, onClick: () => void): DropdownMenuItemData {
	return {
		label,
		icon: valueIcon(choice.icon ?? choice.value),
		description: choice.description,
		onClick,
	};
}

/** A slot's menu: an allowed tool can be removed or swapped for one not yet allowed; any other slot swaps among its choices. */
function slotMenuItems(
	match: LineTokenMatch,
	unallowed: readonly CodeChoice[],
	onSwap: (match: LineTokenMatch, newVal: string) => void,
	onRemove: (match: LineTokenMatch) => void,
): DropdownMenuItemData[] {
	const swaps = (match.isAllowList ? unallowed : match.choices).map((choice) =>
		choiceItem(choice, match.isAllowList ? `Swap with ${choice.value}` : choice.value, () => {
			onSwap(match, choice.value);
		}),
	);
	if (!match.isAllowList) return swaps;
	const remove: DropdownMenuItemData = {
		label: `Remove ${match.value}`,
		icon: <Icon icon={IconTrash} size="sm" />,
		variant: 'destructive',
		description: 'Remove tool from profile allowlist',
		onClick: () => {
			onRemove(match);
		},
	};
	return [remove, ...swaps];
}

/**
 * One line of the code, as Astryx's CodeBlock draws it in span mode: its syntax, with each slot as
 * a token menu in the place of its string. The line that closes the allow list ends with a token
 * that adds a tool not yet allowed.
 */
function CodeLine({
	lineText,
	lineIdx,
	lineTokens,
	slots,
	closesAllow,
	unallowed,
	onSwap,
	onRemove,
	onAdd,
}: {
	lineText: string;
	lineIdx: number;
	lineTokens: readonly { type: string; start: number; end: number }[];
	slots: LineTokenMatch[];
	closesAllow: boolean;
	unallowed: readonly CodeChoice[];
	onSwap: (match: LineTokenMatch, newVal: string) => void;
	onRemove: (match: LineTokenMatch) => void;
	onAdd: (tool: string) => void;
}) {
	const parts: ReactNode[] = [];
	let cursor = 0;
	for (const match of slots) {
		if (match.start > cursor) {
			parts.push(...renderSyntaxSegment(lineText.slice(cursor, match.start), cursor, lineTokens));
		}
		parts.push(
			<TokenMenu
				key={`token-${String(match.start)}`}
				label={match.value}
				icon={slotIcon(match)}
				items={slotMenuItems(match, unallowed, onSwap, onRemove)}
			/>,
		);
		cursor = match.end;
	}
	if (cursor < lineText.length) {
		parts.push(...renderSyntaxSegment(lineText.slice(cursor), cursor, lineTokens));
	}
	if (closesAllow && unallowed.length > 0) {
		parts.push(
			' ',
			<TokenMenu
				key="add-tool"
				label="add tool"
				icon={<Icon icon={IconPlus} size="sm" />}
				items={unallowed.map((choice) =>
					choiceItem(choice, choice.value, () => {
						onAdd(choice.value);
					}),
				)}
			/>,
		);
	}
	return (
		<div data-line={lineIdx + 1} className="enhanced-code-line">
			<span className="enhanced-code-line-content">{parts.length > 0 ? parts : '​'}</span>
		</div>
	);
}

const CODE_VIEWS = [
	{ id: 'code', label: 'Code', icon: IconCode, description: 'Edit as TypeScript' },
	{
		id: 'editor',
		label: 'Editor',
		icon: IconAdjustmentsHorizontal,
		description: 'Edit as a form',
	},
] as const;

type CodeViewName = (typeof CODE_VIEWS)[number]['id'];

/** The studio's one button for what a panel shows: the icon of the view it is on, and a menu of them. */
function CodeViewToggle({
	view,
	onView,
}: {
	view: CodeViewName;
	onView: (view: CodeViewName) => void;
}) {
	const current = CODE_VIEWS.find((each) => each.id === view) ?? CODE_VIEWS[0];
	return (
		<DropdownMenu
			button={{
				label: current.label,
				variant: 'ghost',
				size: 'sm',
				isIconOnly: true,
				icon: <Icon icon={current.icon} size="sm" />,
				tooltip: 'Switch between the code and the editor',
				className: 'enhanced-code-action',
			}}
			menuWidth="15rem"
			hasChevron={false}
			placement="below"
			alignment="end"
			items={CODE_VIEWS.map((each) => ({
				id: each.id,
				label: each.label,
				description: each.description,
				icon: <Icon icon={each.icon} size="sm" />,
				endContent: each.id === current.id ? <Icon icon={IconCheck} size="sm" /> : undefined,
				onClick: () => {
					onView(each.id);
				},
			}))}
		/>
	);
}

export function EnhancedCodeView({
	code: initialCode,
	language = 'typescript',
	seed,
	codeSlots,
}: {
	code: string;
	language?: string;
	seed?: StudioSeedId;
	codeSlots?: CodeSlots;
}) {
	const [{ code: activeCode, slots }, setEdited] = useState({
		code: initialCode,
		slots: codeSlots?.slots ?? NO_SLOTS,
	});
	const tools = codeSlots?.tools ?? NO_CHOICES;
	const [view, setView] = useState<CodeViewName>('code');
	// The form stays mounted once opened, so an edit that does not compile yet waits for the reader.
	const hasOpenedForm = useRef(false);
	if (view === 'editor') hasOpenedForm.current = true;

	useInsertionEffect(() => {
		ensureHighlightStyles();
	}, []);

	useEffect(() => {
		setEdited({ code: initialCode, slots: codeSlots?.slots ?? NO_SLOTS });
	}, [initialCode, codeSlots]);

	const edit = useCallback((change: (code: string) => string) => {
		setEdited((prev) => {
			const code = change(prev.code);
			return { code, slots: carrySlots(prev.code, code, prev.slots) };
		});
	}, []);
	const setActiveCode = useCallback((code: string) => edit(() => code), [edit]);

	const {
		lines,
		syntaxLines,
		maxDigits,
		lineStarts,
		allowBlockFlags,
		allowClose,
		currentAllowedTools,
	} = useMemo(() => codeModel(activeCode, language), [activeCode, language]);

	const languageLabel = language === 'plaintext' ? null : language;
	const scrollArea = useScrollableArea({
		axis: 'both',
		keyboardAccess: { owner: 'viewport', role: 'group', label: languageLabel ?? 'Code' },
	});

	const unallowedTools = tools.filter((tool) => !currentAllowedTools.has(tool.value));
	const slotHandlers = (lineIdx: number) => ({
		onSwap: (match: LineTokenMatch, newVal: string) => {
			const quote = match.literal[0];
			edit((prev) =>
				spliceLine(prev, lineIdx, match.start, match.end, `${quote}${newVal}${quote}`),
			);
		},
		onRemove: (match: LineTokenMatch) => {
			edit((prev) => removeAllowed(prev, lineIdx, match));
		},
		onAdd: (tool: string) => {
			if (allowClose) edit((prev) => addAllowed(prev, allowClose, tool));
		},
	});

	return (
		// A div, not Astryx's <pre>: the studio and run views share this frame and are not code.
		<div className="enhanced-code-block">
			<div className="enhanced-code-header">
				<div className="enhanced-code-title">{languageLabel}</div>
				<HStack gap={1} vAlign="center">
					{seed && <CodeViewToggle view={view} onView={setView} />}
					{seed && (
						<IconButton
							label="Open in Theorem Studio"
							tooltip="Open in Theorem Studio"
							variant="ghost"
							size="sm"
							icon={<IconPlayerPlay />}
							href={`/studio?seed=${seed}`}
							target="_blank"
							className="enhanced-code-action"
						/>
					)}
					<CopyIconButton
						label="Copy code"
						copiedLabel="Copied"
						text={activeCode}
						className="enhanced-code-action"
					/>
				</HStack>
			</div>

			{view === 'code' && (
				<div
					{...scrollArea.getViewportProps<HTMLDivElement>({ className: 'enhanced-code-viewport' })}
				>
					<div
						{...scrollArea.getContentProps<HTMLDivElement>({ className: 'enhanced-code-content' })}
					>
						<code
							className="enhanced-code"
							style={{ '--enhanced-code-gutter-width': `${String(maxDigits)}ch` } as CSSProperties}
						>
							{lines.map((lineText, lineIdx) => (
								<CodeLine
									// biome-ignore lint/suspicious/noArrayIndexKey: a code line is its position in the snippet
									key={lineIdx}
									lineText={lineText}
									lineIdx={lineIdx}
									lineTokens={syntaxLines[lineIdx] ?? []}
									slots={[
										...lineSlots(activeCode, lineStarts[lineIdx] ?? 0, lineText.length, slots),
										...(allowBlockFlags[lineIdx] ? allowSlots(lineText, tools) : []),
									].sort((a, b) => a.start - b.start)}
									closesAllow={allowClose?.line === lineIdx && tools.length > 0}
									unallowed={unallowedTools}
									{...slotHandlers(lineIdx)}
								/>
							))}
						</code>
					</div>
				</div>
			)}

			{seed && hasOpenedForm.current && (
				<div className="enhanced-code-form" hidden={view !== 'editor'}>
					<Suspense fallback={null}>
						<SeedForm seed={seed} code={activeCode} onCode={setActiveCode} />
					</Suspense>
				</div>
			)}
		</div>
	);
}
