import { FACET_LABEL, type FacetData } from './types';

export function facetTitle(data: FacetData): string {
	if (data.kind === 'identity') {
		return data.agentId.trim() || FACET_LABEL.identity;
	}
	if (data.kind === 'modelBinding') {
		const mid = data.modelId.trim();
		return mid || FACET_LABEL.modelBinding;
	}
	if (data.kind === 'toolSpec') {
		const name = data.toolName.trim();
		return name || FACET_LABEL.toolSpec;
	}
	return FACET_LABEL[data.kind];
}

function clip(text: string, max = 28): string {
	const t = text.trim();
	if (!t) return '';
	return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** Max chips on a canvas node before summarizing the rest. */
export const FACET_CHIP_LIMIT = 4;

const FACET_SHELL_PADDING_PX = 14;
const FACET_HEAD_PX = 32;
const FACET_CHIP_ROW_PX = 26;
const FACET_CHIP_GAP_PX = 6;
/** Matches `PLAYGROUND_NODE_WIDTH_PX` in layout.ts. */
const FACET_NODE_WIDTH_PX = 240;
const FACET_AVG_CHIP_WIDTH_PX = 108;

/** Estimated rendered height for branch stacking and collision resolution. */
export function estimateFacetNodeHeight(data: FacetData, toolChildren: string[] = []): number {
	const chips = facetChips(data, toolChildren);
	if (!chips.length) return FACET_SHELL_PADDING_PX * 2 + FACET_HEAD_PX;
	const chipsPerRow = Math.max(1, Math.floor(FACET_NODE_WIDTH_PX / FACET_AVG_CHIP_WIDTH_PX));
	const rows = Math.ceil(chips.length / chipsPerRow);
	return FACET_SHELL_PADDING_PX * 2 + FACET_HEAD_PX + FACET_CHIP_GAP_PX + rows * FACET_CHIP_ROW_PX;
}

function limitChips(chips: string[], max = FACET_CHIP_LIMIT): string[] {
	if (chips.length <= max) return chips;
	const kept = chips.slice(0, max).map((c) => clip(c, 22));
	kept.push(`+${String(chips.length - max)} more`);
	return kept;
}

function identityChips(data: Extract<FacetData, { kind: 'identity' }>): string[] {
	const chips: string[] = [];
	chips.push(data.profileType || 'type?');
	if (data.handle.trim()) chips.push(`@${data.handle.trim()}`);
	const sys = clip(data.system, 24);
	if (sys) chips.push(sys);
	return chips;
}

function imageChips(data: Extract<FacetData, { kind: 'image' }>): string[] {
	const chips: string[] = [];
	if (data.aspectRatio.trim()) chips.push(data.aspectRatio.trim());
	if (data.size.trim()) chips.push(data.size.trim());
	if (data.mimeType.trim()) chips.push(data.mimeType.trim());
	if (data.includeText) chips.push('text+img');
	if (!chips.length) chips.push('image');
	return chips;
}

function speechChips(data: Extract<FacetData, { kind: 'speech' }>): string[] {
	return [...(data.voice.trim() ? [data.voice.trim()] : []), data.format];
}

function liveChips(data: Extract<FacetData, { kind: 'live' }>): string[] {
	const ingress: string[] = [];
	if (data.ingressAudio) ingress.push('mic');
	if (data.ingressVideo) ingress.push('camera');
	if (data.ingressText) ingress.push('text');
	return [
		...(data.voice.trim() ? [data.voice.trim()] : []),
		ingress.length ? `ingress: ${ingress.join('+')}` : 'ingress: none',
		data.sessionResumption ? 'resumption' : 'standard',
		...(data.transcriptionInput ? ['asr in'] : []),
		...(data.transcriptionOutput ? ['asr out'] : []),
	];
}

function modelsChips(data: Extract<FacetData, { kind: 'models' }>): string[] {
	return [
		data.defaultModel.trim() ? `default: ${data.defaultModel.trim()}` : 'default?',
		...(data.allowModelSelect ? ['selectable'] : []),
		`steps ${String(data.maxSteps)}`,
	];
}

function modelBindingChips(data: Extract<FacetData, { kind: 'modelBinding' }>): string[] {
	const chips = [`${data.provider}/${data.protocol}`, data.apiId || '—'];
	if (data.temperature !== undefined) chips.push(`t=${String(data.temperature)}`);
	if (data.builtInTools.trim()) chips.push(`builtins[${data.builtInTools}]`);
	return chips;
}

function inputsChips(data: Extract<FacetData, { kind: 'inputs' }>): string[] {
	const chips: string[] = [];
	if (data.text) chips.push('text');
	if (data.attachmentsAccept.length) chips.push(`attach ×${String(data.attachmentsAccept.length)}`);
	if (data.voiceAccept.length) chips.push(`voice ×${String(data.voiceAccept.length)}`);
	if (!chips.length) chips.push('none');
	return chips;
}

function outputsChips(data: Extract<FacetData, { kind: 'outputs' }>): string[] {
	const chips = [
		data.mode === 'structured' ? `schema: ${data.schemaId.trim() || '—'}` : 'text',
		data.streamMode,
	];
	if (data.validationEnabled) chips.push('validated');
	if (data.resumeEnabled) chips.push('resume');
	return chips;
}

function guardrailsChips(data: Extract<FacetData, { kind: 'guardrails' }>): string[] {
	return [
		data.canary ? 'canary' : 'no canary',
		data.sanitizeInput ? 'sanitize' : 'raw in',
		`egress ${data.egressMode}`,
	];
}

/** Compact chip labels for collapsed facet cards on the canvas. */
export function facetChips(data: FacetData, toolChildren: string[] = []): string[] {
	switch (data.kind) {
		case 'identity':
			return limitChips(identityChips(data));
		case 'image':
			return limitChips(imageChips(data));
		case 'speech':
			return limitChips(speechChips(data));
		case 'live':
			return limitChips(liveChips(data));
		case 'models':
			return limitChips(modelsChips(data));
		case 'modelBinding':
			return limitChips(modelBindingChips(data));
		case 'tools':
			return limitChips(toolChildren.length ? toolChildren.map((n) => clip(n, 22)) : ['+ tool']);
		case 'toolSpec':
			return limitChips([data.toolType, data.loadTier]);
		case 'inputs':
			return limitChips(inputsChips(data));
		case 'outputs':
			return limitChips(outputsChips(data));
		case 'guardrails':
			return limitChips(guardrailsChips(data));
		default:
			return limitChips([]);
	}
}
