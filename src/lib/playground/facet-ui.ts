import { FACET_LABEL, type FacetData } from './types';

export function facetTitle(data: FacetData): string {
	if (data.kind === 'identity') {
		return data.agentId.trim() || FACET_LABEL.identity;
	}
	if (data.kind === 'modelSpec') {
		const mid = data.modelId.trim();
		return mid || FACET_LABEL.modelSpec;
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

/** Compact chip labels for collapsed facet cards on the canvas. */
export function facetChips(data: FacetData, toolChildren: string[] = []): string[] {
	switch (data.kind) {
		case 'identity': {
			const chips: string[] = [];
			if (data.profileType) chips.push(data.profileType);
			else chips.push('type?');
			if (data.handle.trim()) chips.push(`@${data.handle.trim()}`);
			const sys = clip(data.system, 24);
			if (sys) chips.push(sys);
			return chips;
		}
		case 'image': {
			const chips: string[] = [];
			if (data.aspectRatio.trim()) chips.push(data.aspectRatio.trim());
			if (data.size.trim()) chips.push(data.size.trim());
			if (data.mimeType.trim()) chips.push(data.mimeType.trim());
			if (data.includeText) chips.push('text+img');
			return chips.length ? chips : ['image'];
		}
		case 'speech':
			return [...(data.voice.trim() ? [data.voice.trim()] : []), data.format];
		case 'live': {
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
		case 'models':
			return [`${data.provider}/${data.protocol}`, `steps ${String(data.maxSteps)}`];
		case 'modelSpec': {
			const chips = [data.apiId || '—', `t=${String(data.temperature)}`];
			if (data.builtInTools.trim()) chips.push(`builtins[${data.builtInTools}]`);
			return chips;
		}
		case 'tools':
			return toolChildren.length ? toolChildren : ['+ tool'];
		case 'toolSpec':
			return [data.toolType, data.loadTier];
		case 'inputs': {
			const chips: string[] = [];
			if (data.text) chips.push('text');
			if (data.attachmentsAccept.length)
				chips.push(`attach ×${String(data.attachmentsAccept.length)}`);
			if (data.voiceAccept.length) chips.push(`voice ×${String(data.voiceAccept.length)}`);
			if (!chips.length) chips.push('none');
			return chips;
		}
		case 'outputs': {
			const chips = [
				data.mode === 'structured' ? `schema: ${data.schemaId.trim() || '—'}` : 'text',
				data.streamMode,
			];
			if (data.validationEnabled) chips.push('validated');
			if (data.resumeEnabled) chips.push('resume');
			return chips;
		}
		case 'guardrails':
			return [
				data.canary ? 'canary' : 'no canary',
				data.sanitizeInput ? 'sanitize' : 'raw in',
				`egress ${data.egressMode}`,
			];
	}
}
