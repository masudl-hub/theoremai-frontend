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
