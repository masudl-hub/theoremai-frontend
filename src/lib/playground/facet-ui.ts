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

/** Compact chip labels for collapsed facet cards on the canvas. */
export function facetChips(data: FacetData, toolChildren: string[] = []): string[] {
	let chips: string[];
	switch (data.kind) {
		case 'identity': {
			chips = [];
			if (data.profileType) chips.push(data.profileType);
			else chips.push('type?');
			if (data.handle.trim()) chips.push(`@${data.handle.trim()}`);
			const sys = clip(data.system, 24);
			if (sys) chips.push(sys);
			break;
		}
		case 'image': {
			chips = [];
			if (data.aspectRatio.trim()) chips.push(data.aspectRatio.trim());
			if (data.size.trim()) chips.push(data.size.trim());
			if (data.mimeType.trim()) chips.push(data.mimeType.trim());
			if (data.includeText) chips.push('text+img');
			if (!chips.length) chips.push('image');
			break;
		}
		case 'speech':
			chips = [...(data.voice.trim() ? [data.voice.trim()] : []), data.format];
			break;
		case 'live': {
			const ingress: string[] = [];
			if (data.ingressAudio) ingress.push('mic');
			if (data.ingressVideo) ingress.push('camera');
			if (data.ingressText) ingress.push('text');
			chips = [
				...(data.voice.trim() ? [data.voice.trim()] : []),
				ingress.length ? `ingress: ${ingress.join('+')}` : 'ingress: none',
				data.sessionResumption ? 'resumption' : 'standard',
				...(data.transcriptionInput ? ['asr in'] : []),
				...(data.transcriptionOutput ? ['asr out'] : []),
			];
			break;
		}
		case 'models':
			chips = [
				data.defaultModel.trim() ? `default: ${data.defaultModel.trim()}` : 'default?',
				...(data.allowModelSelect ? ['selectable'] : []),
				`steps ${String(data.maxSteps)}`,
			];
			break;
		case 'modelBinding': {
			chips = [`${data.provider}/${data.protocol}`, data.apiId || '—'];
			if (data.temperature !== undefined) chips.push(`t=${String(data.temperature)}`);
			if (data.builtInTools.trim()) chips.push(`builtins[${data.builtInTools}]`);
			break;
		}
		case 'tools':
			chips = toolChildren.length ? toolChildren.map((n) => clip(n, 22)) : ['+ tool'];
			break;
		case 'toolSpec':
			chips = [data.toolType, data.loadTier];
			break;
		case 'inputs': {
			chips = [];
			if (data.text) chips.push('text');
			if (data.attachmentsAccept.length)
				chips.push(`attach ×${String(data.attachmentsAccept.length)}`);
			if (data.voiceAccept.length) chips.push(`voice ×${String(data.voiceAccept.length)}`);
			if (!chips.length) chips.push('none');
			break;
		}
		case 'outputs': {
			chips = [
				data.mode === 'structured' ? `schema: ${data.schemaId.trim() || '—'}` : 'text',
				data.streamMode,
			];
			if (data.validationEnabled) chips.push('validated');
			if (data.resumeEnabled) chips.push('resume');
			break;
		}
		case 'guardrails':
			chips = [
				data.canary ? 'canary' : 'no canary',
				data.sanitizeInput ? 'sanitize' : 'raw in',
				`egress ${data.egressMode}`,
			];
			break;
		default:
			chips = [];
	}
	return limitChips(chips);
}
