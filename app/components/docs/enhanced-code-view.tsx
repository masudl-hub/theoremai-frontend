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
	IconChartScatter3d,
	IconCheck,
	IconCode,
	IconEye,
	IconFileTypePdf,
	IconFlame,
	IconHandStop,
	IconHeadset,
	IconHttpDelete,
	IconHttpGet,
	IconHttpPatch,
	IconHttpPost,
	IconHttpPut,
	IconKey,
	IconPackage,
	IconPencil,
	IconPhoto,
	IconPlayerPlay,
	IconPlus,
	IconServer,
	IconSquareRoundedNumber0,
	IconSquareRoundedNumber2,
	IconTrash,
	IconUserCheck,
	IconVolume,
	IconWaveSine,
} from '@tabler/icons-react';
import {
	IconAnthropic,
	IconDeepSeek,
	IconGemini,
	IconGoogle,
	IconMistral,
	IconOpenAi,
	IconOpenRouter,
} from '@theoremjs/studio/ui/brand-icons.tsx';
import { PROFILE_TYPE_ICON, toolTypeIcon } from '@theoremjs/studio/ui/lib/type-icons.ts';
import {
	type CSSProperties,
	lazy,
	type ReactNode,
	Suspense,
	useEffect,
	useInsertionEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import type { StudioSeedId } from '../../lib/docs/schema';
import { CopyIconButton } from './copy-button';
import './enhanced-code-view.css';

const SeedForm = lazy(() => import('./seed-form'));

export interface ApplicableItem {
	value: string;
	label: string;
	icon: ReactNode;
	description?: string;
}

// ---------------------------------------------------------------------------
// Studio-aligned Enums & Icons (Parity with profile-editor.tsx & type-icons.ts)
// ---------------------------------------------------------------------------

/** TOOL_TYPE_SEGMENTS from studio/ui/profile-editor.tsx */
const TOOL_TYPES: ApplicableItem[] = [
	{
		value: 'http',
		label: 'http',
		icon: <Icon icon={toolTypeIcon('http')} size="sm" />,
		description: 'HTTP REST / remote tool',
	},
	{
		value: 'function',
		label: 'function',
		icon: <Icon icon={toolTypeIcon('function')} size="sm" />,
		description: 'TypeScript function',
	},
	{
		value: 'mcp',
		label: 'mcp',
		icon: <Icon icon={toolTypeIcon('mcp')} size="sm" />,
		description: 'Model Context Protocol tool',
	},
	{
		value: 'agent',
		label: 'agent',
		icon: <Icon icon={toolTypeIcon('agent')} size="sm" />,
		description: 'Subagent turn delegation',
	},
];

/** ACCESS_SEGMENTS from studio/ui/profile-editor.tsx */
const TOOL_ACCESS: ApplicableItem[] = [
	{
		value: 'read-only',
		label: 'read-only',
		icon: <Icon icon={IconEye} size="sm" />,
		description: 'Read only: mutates no remote state',
	},
	{
		value: 'read-write',
		label: 'read-write',
		icon: <Icon icon={IconPencil} size="sm" />,
		description: 'Read and write: mutates remote data',
	},
	{
		value: 'destructive',
		label: 'destructive',
		icon: <Icon icon={IconFlame} size="sm" />,
		description: 'Destructive: irreversible state changes',
	},
];

/** PERMISSION_SEGMENTS from studio/ui/profile-editor.tsx */
const TOOL_PERMISSIONS: ApplicableItem[] = [
	{
		value: 'auto',
		label: 'auto',
		icon: <Icon icon={IconPlayerPlay} size="sm" />,
		description: 'Runs automatically without prompting',
	},
	{
		value: 'session_consent',
		label: 'session_consent',
		icon: <Icon icon={IconUserCheck} size="sm" />,
		description: 'Prompted once per session',
	},
	{
		value: 'always_confirm',
		label: 'always_confirm',
		icon: <Icon icon={IconHandStop} size="sm" />,
		description: 'Prompted on every invocation',
	},
];

/** LOAD_TIER_SEGMENTS from studio/ui/profile-editor.tsx */
const TOOL_LOAD_TIERS: ApplicableItem[] = [
	{
		value: 'T0',
		label: 'T0',
		icon: <Icon icon={IconSquareRoundedNumber0} size="sm" />,
		description: 'Startup tier: schemas sent on turn 1',
	},
	{
		value: 'T2',
		label: 'T2',
		icon: <Icon icon={IconSquareRoundedNumber2} size="sm" />,
		description: 'Deferred tier: dynamic promotion on demand',
	},
];

/** METHOD_SEGMENTS from studio/ui/profile-editor.tsx */
const HTTP_METHODS: ApplicableItem[] = [
	{
		value: 'GET',
		label: 'GET',
		icon: <Icon icon={IconHttpGet} size="sm" />,
		description: 'HTTP GET',
	},
	{
		value: 'POST',
		label: 'POST',
		icon: <Icon icon={IconHttpPost} size="sm" />,
		description: 'HTTP POST',
	},
	{
		value: 'PUT',
		label: 'PUT',
		icon: <Icon icon={IconHttpPut} size="sm" />,
		description: 'HTTP PUT',
	},
	{
		value: 'PATCH',
		label: 'PATCH',
		icon: <Icon icon={IconHttpPatch} size="sm" />,
		description: 'HTTP PATCH',
	},
	{
		value: 'DELETE',
		label: 'DELETE',
		icon: <Icon icon={IconHttpDelete} size="sm" />,
		description: 'HTTP DELETE',
	},
];

/** PROFILE_TYPE_ICON from studio/ui/lib/type-icons.ts */
const PROFILE_TYPES: ApplicableItem[] = [
	{
		value: 'text',
		label: 'text',
		icon: <Icon icon={PROFILE_TYPE_ICON.text} size="sm" />,
		description: 'Conversational turns & text streaming',
	},
	{
		value: 'live',
		label: 'live',
		icon: <Icon icon={PROFILE_TYPE_ICON.live} size="sm" />,
		description: 'Duplex real-time voice & video streaming',
	},
	{
		value: 'decision',
		label: 'decision',
		icon: <Icon icon={PROFILE_TYPE_ICON.decision} size="sm" />,
		description: 'Deterministic state & rule evaluation',
	},
	{
		value: 'embedding',
		label: 'embedding',
		icon: <Icon icon={PROFILE_TYPE_ICON.embedding} size="sm" />,
		description: 'Vector search & semantic retrieval',
	},
	{
		value: 'image',
		label: 'image',
		icon: <Icon icon={PROFILE_TYPE_ICON.image} size="sm" />,
		description: 'Image generation & inspection',
	},
	{
		value: 'speech',
		label: 'speech',
		icon: <Icon icon={PROFILE_TYPE_ICON.speech} size="sm" />,
		description: 'Audio & speech generation',
	},
];

/** LEVEL_SEGMENT from studio/ui/profile-editor.tsx for ThinkingLevel */
const THINKING_LEVEL_CHOICES: ApplicableItem[] = [
	{
		value: 'none',
		label: 'none',
		icon: <Icon icon={IconAntennaBarsOff} size="sm" />,
		description: 'None: no reasoning budget',
	},
	{
		value: 'minimal',
		label: 'minimal',
		icon: <Icon icon={IconAntennaBars1} size="sm" />,
		description: 'Minimal reasoning effort',
	},
	{
		value: 'low',
		label: 'low',
		icon: <Icon icon={IconAntennaBars2} size="sm" />,
		description: 'Low reasoning effort',
	},
	{
		value: 'medium',
		label: 'medium',
		icon: <Icon icon={IconAntennaBars3} size="sm" />,
		description: 'Medium: balanced reasoning effort',
	},
	{
		value: 'high',
		label: 'high',
		icon: <Icon icon={IconAntennaBars4} size="sm" />,
		description: 'High reasoning effort',
	},
	{
		value: 'xhigh',
		label: 'xhigh',
		icon: <Icon icon={IconAntennaBars5} size="sm" />,
		description: 'Extra high reasoning effort',
	},
	{
		value: 'max',
		label: 'max',
		icon: <Icon icon={IconFlame} size="sm" />,
		description: 'Maximum reasoning effort',
	},
];

const THINKING_LEVEL_ICON: Record<string, ReactNode> = Object.fromEntries(
	THINKING_LEVEL_CHOICES.map((c) => [c.value, c.icon]),
);

/** STREAM_MODE_SEGMENTS from studio/ui/profile-editor.tsx */
const STREAMS: ApplicableItem[] = [
	{
		value: 'sse',
		label: 'sse',
		icon: <Icon icon={IconWaveSine} size="sm" />,
		description: 'Streamed over Server-Sent Events',
	},
	{
		value: 'buffered',
		label: 'buffered',
		icon: <Icon icon={IconPackage} size="sm" />,
		description: 'Buffered reply',
	},
	{
		value: 'websocket',
		label: 'websocket',
		icon: <Icon icon={IconWaveSine} size="sm" />,
		description: 'Duplex WebSockets stream',
	},
];

const PROTOCOLS: ApplicableItem[] = [
	{
		value: 'openRouterOpenAi',
		label: 'openRouterOpenAi',
		icon: <IconOpenRouter width={14} height={14} />,
		description: 'OpenRouter / OpenAI wire protocol',
	},
	{
		value: 'geminiInteractions',
		label: 'geminiInteractions',
		icon: <IconGemini width={14} height={14} />,
		description: 'Google Gemini Interactions API',
	},
	{
		value: 'openAiDirect',
		label: 'openAiDirect',
		icon: <IconOpenAi width={14} height={14} />,
		description: 'Direct OpenAI REST API',
	},
	{
		value: 'geminiLive',
		label: 'geminiLive',
		icon: <IconHeadset size="sm" />,
		description: 'Duplex real-time Gemini Live WebSocket',
	},
	{
		value: 'geminiEmbeddings',
		label: 'geminiEmbeddings',
		icon: <IconChartScatter3d size="sm" />,
		description: 'Google text-embedding protocol',
	},
	{
		value: 'openRouterEmbeddings',
		label: 'openRouterEmbeddings',
		icon: <IconOpenRouter width={14} height={14} />,
		description: 'OpenRouter vector embeddings',
	},
];

const PROVIDERS: ApplicableItem[] = [
	{
		value: 'openrouter',
		label: 'openrouter',
		icon: <IconOpenRouter width={14} height={14} />,
		description: 'OpenRouter unified router',
	},
	{
		value: 'gemini',
		label: 'gemini',
		icon: <IconGoogle width={14} height={14} />,
		description: 'Google Developer Platform',
	},
	{
		value: 'openai',
		label: 'openai',
		icon: <IconOpenAi width={14} height={14} />,
		description: 'OpenAI platform',
	},
	{
		value: 'anthropic',
		label: 'anthropic',
		icon: <IconAnthropic width={14} height={14} />,
		description: 'Anthropic Claude API',
	},
	{
		value: 'deepseek',
		label: 'deepseek',
		icon: <IconDeepSeek width={14} height={14} />,
		description: 'DeepSeek API',
	},
	{
		value: 'mistral',
		label: 'mistral',
		icon: <IconMistral width={14} height={14} />,
		description: 'Mistral AI',
	},
	{
		value: 'local',
		label: 'local',
		icon: <Icon icon={IconServer} size="sm" />,
		description: 'Local Ollama / vLLM runtime',
	},
];

const API_IDS: ApplicableItem[] = [
	{
		value: 'google/gemini-3.8-flash',
		label: 'google/gemini-3.8-flash',
		icon: <IconGoogle width={14} height={14} />,
		description: 'Google Gemini 3.8 Flash',
	},
	{
		value: 'anthropic/claude-opus-5.5',
		label: 'anthropic/claude-opus-5.5',
		icon: <IconAnthropic width={14} height={14} />,
		description: 'Anthropic Claude Opus 5.5',
	},
	{
		value: 'deepseek/deepseek-v4',
		label: 'deepseek/deepseek-v4',
		icon: <IconDeepSeek width={14} height={14} />,
		description: 'DeepSeek V4',
	},
	{
		value: 'openai/gpt-5-turbo',
		label: 'openai/gpt-5-turbo',
		icon: <IconOpenAi width={14} height={14} />,
		description: 'OpenAI GPT-5 Turbo',
	},
];

const KEY_SLOTS: ApplicableItem[] = [
	{
		value: 'openrouter',
		label: 'openrouter',
		icon: <IconOpenRouter width={14} height={14} />,
		description: 'OpenRouter API key slot',
	},
	{
		value: 'gemini',
		label: 'gemini',
		icon: <IconGoogle width={14} height={14} />,
		description: 'Google Gemini API key slot',
	},
	{
		value: 'openai',
		label: 'openai',
		icon: <IconOpenAi width={14} height={14} />,
		description: 'OpenAI API key slot',
	},
	{
		value: 'anthropic',
		label: 'anthropic',
		icon: <IconAnthropic width={14} height={14} />,
		description: 'Anthropic API key slot',
	},
];

const TOOLS: ApplicableItem[] = [
	{
		value: 'convert_units',
		label: 'convert_units',
		icon: <Icon icon={toolTypeIcon('function')} size="sm" />,
		description: 'Function: Math & unit conversion (T0)',
	},
	{
		value: 'wikipedia_summary',
		label: 'wikipedia_summary',
		icon: <Icon icon={toolTypeIcon('http')} size="sm" />,
		description: 'HTTP: Wikipedia encyclopedia search',
	},
	{
		value: 'ask_repo_docs',
		label: 'ask_repo_docs',
		icon: <Icon icon={toolTypeIcon('mcp')} size="sm" />,
		description: 'MCP: Repository documentation lookup',
	},
	{
		value: 'narrate',
		label: 'narrate',
		icon: <Icon icon={toolTypeIcon('agent')} size="sm" />,
		description: 'Agent: Subagent voice speech narrator',
	},
	{
		value: 'search_github',
		label: 'search_github',
		icon: <Icon icon={toolTypeIcon('http')} size="sm" />,
		description: 'HTTP: Public GitHub repository scout',
	},
	{
		value: 'read_arxiv',
		label: 'read_arxiv',
		icon: <Icon icon={toolTypeIcon('http')} size="sm" />,
		description: 'HTTP: Scientific preprint discovery',
	},
];

const MIMES: ApplicableItem[] = [
	{
		value: 'image/*',
		label: 'image/*',
		icon: <Icon icon={IconPhoto} size="sm" />,
		description: 'JPEG, PNG, WebP image attachments',
	},
	{
		value: 'application/pdf',
		label: 'application/pdf',
		icon: <Icon icon={IconFileTypePdf} size="sm" />,
		description: 'PDF documents',
	},
	{
		value: 'text/*',
		label: 'text/*',
		icon: <Icon icon={PROFILE_TYPE_ICON.text} size="sm" />,
		description: 'Plain text & source code files',
	},
	{
		value: 'audio/*',
		label: 'audio/*',
		icon: <Icon icon={IconVolume} size="sm" />,
		description: 'Voice & audio recordings',
	},
];

// ---------------------------------------------------------------------------
// Schema Slot Descriptors
// ---------------------------------------------------------------------------

export interface SlotDescriptor {
	current: string;
	item: ApplicableItem;
	choices: ApplicableItem[];
	isAllowList?: boolean;
}

/** Parses efforts defined under `efforts: { alias: 'level' }` */
function parseEffortsMap(code: string): Record<string, string> {
	const map: Record<string, string> = {};
	const match = code.match(/efforts\s*:\s*\{([^}]+)\}/);
	if (match?.[1]) {
		for (const entry of match[1].matchAll(/([a-zA-Z0-9_]+)\s*:\s*['"]([^'"]+)['"]/g)) {
			const alias = entry[1];
			const level = entry[2];
			if (alias && level) {
				map[alias] = level;
			}
		}
	}
	return map;
}

/** Parses defined models under `models: { modelId: { ... } }` */
function parseDefinedModels(code: string): string[] {
	const modelsMatch = code.match(/models\s*:\s*\{([\s\S]+?)\n\t\}/);
	if (!modelsMatch?.[1]) return ['gemini'];
	const keys: string[] = [];
	for (const match of modelsMatch[1].matchAll(/([a-zA-Z0-9_]+|'[^']+'|"[^"]+")\s*:\s*\{/g)) {
		const rawKey = match[1].replaceAll(/['"]/g, '');
		if (rawKey && rawKey !== 'models') {
			keys.push(rawKey);
		}
	}
	return keys.length > 0 ? keys : ['gemini'];
}

/** A line that sets one field to a string: `key: 'value'`. Its key, or none. */
const FIELD_LINE = /^\s*([a-zA-Z]+)\s*:\s*['"][^'"]+['"]/;

/** Fields whose value is one of a fixed set; an unknown value shows as the first. */
const FIELD_CHOICES: Partial<Record<string, ApplicableItem[]>> = {
	access: TOOL_ACCESS,
	permission: TOOL_PERMISSIONS,
	loadTier: TOOL_LOAD_TIERS,
	method: HTTP_METHODS,
	protocol: PROTOCOLS,
	provider: PROVIDERS,
};

function pickSlot(val: string, choices: ApplicableItem[]): SlotDescriptor {
	return { current: val, item: choices.find((c) => c.value === val) ?? choices[0], choices };
}

const TOOL_TYPE_VALUES = ['http', 'function', 'mcp', 'agent'];
const STREAM_VALUES = ['sse', 'buffered', 'websocket'];

/** A tool's `type`, else a profile's; none when the value is neither. */
function typeSlot(val: string): SlotDescriptor | null {
	if (TOOL_TYPE_VALUES.includes(val)) return pickSlot(val, TOOL_TYPES);
	const item = PROFILE_TYPES.find((p) => p.value === val);
	return item ? { current: val, item, choices: PROFILE_TYPES } : null;
}

/** A free value offered alongside known ones: shown as itself when it is not one of them. */
function openSlot(
	val: string,
	choices: ApplicableItem[],
	fallback: ApplicableItem,
): SlotDescriptor {
	return { current: val, item: choices.find((c) => c.value === val) ?? fallback, choices };
}

function effortAliasSlot(val: string, effortsMap: Record<string, string>): SlotDescriptor {
	const mappedLevel = effortsMap[val] ?? 'medium';
	const aliasIcon = THINKING_LEVEL_ICON[mappedLevel] ?? <Icon icon={IconAntennaBars3} size="sm" />;
	const item: ApplicableItem = {
		value: val,
		label: val,
		icon: aliasIcon,
		description: `Mapped to effort level: ${mappedLevel}`,
	};
	const aliasChoices: ApplicableItem[] = Object.entries(effortsMap).map(([alias, level]) => ({
		value: alias,
		label: alias,
		icon: THINKING_LEVEL_ICON[level] ?? <Icon icon={IconAntennaBars3} size="sm" />,
		description: `Effort level: ${level}`,
	}));
	return { current: val, item, choices: aliasChoices.length > 0 ? aliasChoices : [item] };
}

function defaultModelSlot(val: string, definedModels: string[]): SlotDescriptor {
	const item: ApplicableItem = {
		value: val,
		label: val,
		icon: <IconGemini width={14} height={14} />,
		description: `Default model binding: ${val}`,
	};
	const modelChoices: ApplicableItem[] = definedModels.map((m) => ({
		value: m,
		label: m,
		icon: <IconGemini width={14} height={14} />,
		description: `Model: ${m}`,
	}));
	return { current: val, item, choices: modelChoices };
}

/** The slot a field line's own key decides, or none. */
function fieldSlot(
	key: string,
	val: string,
	effortsMap: Record<string, string>,
	definedModels: string[],
): SlotDescriptor | null {
	const choices = FIELD_CHOICES[key];
	if (choices) return pickSlot(val, choices);
	switch (key) {
		case 'type':
			return typeSlot(val);
		case 'apiId':
			return openSlot(val, API_IDS, {
				value: val,
				label: val,
				icon: <IconGoogle width={14} height={14} />,
				description: val,
			});
		case 'keySlot':
			return openSlot(val, KEY_SLOTS, {
				value: val,
				label: val,
				icon: <Icon icon={IconKey} size="sm" />,
				description: `Key slot: ${val}`,
			});
		case 'defaultEffort':
			return effortSlot(val, effortsMap) ?? effortAliasSlot(val, effortsMap);
		case 'defaultModel':
			return effortSlot(val, effortsMap) ?? defaultModelSlot(val, definedModels);
		default:
			return null;
	}
}

/** A typed ThinkingLevel value, as `efforts: { alias: 'level' }` sets it. */
function effortSlot(val: string, effortsMap: Record<string, string>): SlotDescriptor | null {
	if (!Object.values(effortsMap).includes(val)) return null;
	const item = THINKING_LEVEL_CHOICES.find((c) => c.value === val);
	return item ? { current: val, item, choices: THINKING_LEVEL_CHOICES } : null;
}

/** The slot a line's value fills, or none: a field's own choices first, then the value's kind. */
function resolveLineSlot(
	val: string,
	lineText: string,
	isInsideAllowBlock: boolean,
	effortsMap: Record<string, string>,
	definedModels: string[],
): SlotDescriptor | null {
	const key = FIELD_LINE.exec(lineText)?.[1];
	// A tool's name is its own; it is never a choice.
	if (key === 'name') return null;
	const tool = isInsideAllowBlock ? TOOLS.find((t) => t.value === val) : undefined;
	if (tool) return { current: val, item: tool, choices: TOOLS, isAllowList: true };
	const field = key === undefined ? null : fieldSlot(key, val, effortsMap, definedModels);
	if (field) return field;
	if (/efforts\s*:\s*\{/.test(lineText)) {
		const level = THINKING_LEVEL_CHOICES.find((c) => c.value === val);
		if (level) return { current: val, item: level, choices: THINKING_LEVEL_CHOICES };
	}
	const effort = effortSlot(val, effortsMap);
	if (effort) return effort;
	if (/(streamMode|mode)\s*:\s*['"][^'"]+['"]/.test(lineText) && STREAM_VALUES.includes(val)) {
		return pickSlot(val, STREAMS);
	}
	const mimeLine =
		/attachments|accept/.test(lineText) || val === 'image/*' || val === 'application/pdf';
	const mime = mimeLine ? MIMES.find((m) => m.value === val) : undefined;
	return mime ? { current: val, item: mime, choices: MIMES } : null;
}

interface LineTokenMatch {
	start: number;
	end: number;
	literal: string;
	value: string;
	slot: SlotDescriptor;
}

function findLineSlots(
	lineText: string,
	isInsideAllowBlock: boolean,
	effortsMap: Record<string, string>,
	definedModels: string[],
): LineTokenMatch[] {
	const regex = /'([^']+)'|"([^"]+)"/g;
	const matches: LineTokenMatch[] = [];

	for (const match of lineText.matchAll(regex)) {
		const literal = match[0];
		const val = match.at(1) ?? match.at(2) ?? '';
		const slot = resolveLineSlot(val, lineText, isInsideAllowBlock, effortsMap, definedModels);

		if (slot) {
			matches.push({
				start: match.index,
				end: match.index + literal.length,
				literal,
				value: val,
				slot,
			});
		}
	}

	return matches;
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

/** The known tools the allow array names. */
function allowedTools(lines: string[], flags: boolean[]): Set<string> {
	const allowed = new Set<string>();
	lines.forEach((line, idx) => {
		if (!flags[idx]) return;
		for (const match of line.matchAll(/'([^']+)'|"([^"]+)"/g)) {
			const val = match.at(1) ?? match.at(2);
			if (val && TOOLS.some((t) => t.value === val)) allowed.add(val);
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
		// Defined efforts (e.g. { normal: 'medium', deep: 'high' }) and models
		effortsMap: parseEffortsMap(code),
		definedModels: parseDefinedModels(code),
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

/** A token in the code that opens a menu of choices. */
function TokenMenu({
	label,
	icon,
	items,
}: {
	label: string;
	icon: ReactNode;
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

/** A slot's menu: an allowed tool can be removed or swapped for one not yet allowed; any other slot swaps among its choices. */
function slotMenuItems(
	match: LineTokenMatch,
	unallowed: ApplicableItem[],
	onSwap: (match: LineTokenMatch, newVal: string) => void,
	onRemove: (match: LineTokenMatch) => void,
): DropdownMenuItemData[] {
	const swaps = (match.slot.isAllowList ? unallowed : match.slot.choices).map((choice) => ({
		label: match.slot.isAllowList ? `Swap with ${choice.label}` : choice.label,
		icon: choice.icon,
		description: choice.description,
		onClick: () => {
			onSwap(match, choice.value);
		},
	}));
	if (!match.slot.isAllowList) return swaps;
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
	unallowed: ApplicableItem[];
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
				label={match.slot.item.label}
				icon={match.slot.item.icon}
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
				items={unallowed.map((choice) => ({
					label: choice.label,
					icon: choice.icon,
					description: choice.description,
					onClick: () => {
						onAdd(choice.value);
					},
				}))}
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
}: {
	code: string;
	language?: string;
	seed?: StudioSeedId;
}) {
	const [activeCode, setActiveCode] = useState(initialCode);
	const [view, setView] = useState<CodeViewName>('code');
	// The form stays mounted once opened, so an edit that does not compile yet waits for the reader.
	const hasOpenedForm = useRef(false);
	if (view === 'editor') hasOpenedForm.current = true;

	useInsertionEffect(() => {
		ensureHighlightStyles();
	}, []);

	useEffect(() => {
		setActiveCode(initialCode);
	}, [initialCode]);

	const {
		lines,
		syntaxLines,
		maxDigits,
		effortsMap,
		definedModels,
		allowBlockFlags,
		allowClose,
		currentAllowedTools,
	} = useMemo(() => codeModel(activeCode, language), [activeCode, language]);

	const languageLabel = language === 'plaintext' ? null : language;
	const scrollArea = useScrollableArea({
		axis: 'both',
		keyboardAccess: { owner: 'viewport', role: 'group', label: languageLabel ?? 'Code' },
	});

	const unallowedTools = TOOLS.filter((t) => !currentAllowedTools.has(t.value));
	const slotHandlers = (lineIdx: number) => ({
		onSwap: (match: LineTokenMatch, newVal: string) => {
			const quote = match.literal[0];
			setActiveCode((prev) =>
				spliceLine(prev, lineIdx, match.start, match.end, `${quote}${newVal}${quote}`),
			);
		},
		onRemove: (match: LineTokenMatch) => {
			setActiveCode((prev) => removeAllowed(prev, lineIdx, match));
		},
		onAdd: (tool: string) => {
			if (allowClose) setActiveCode((prev) => addAllowed(prev, allowClose, tool));
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
									slots={findLineSlots(
										lineText,
										allowBlockFlags[lineIdx] ?? false,
										effortsMap,
										definedModels,
									)}
									closesAllow={allowClose?.line === lineIdx}
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
