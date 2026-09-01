import {
	FACET_LABEL,
	type FacetData,
	type IdentityData,
	type ModelSpecData
} from './types';

export function facetTitle(data: FacetData): string {
	if (data.kind === 'identity') {
		return (data as IdentityData).agentId.trim() || FACET_LABEL.identity;
	}
	if (data.kind === 'modelSpec') {
		const mid = (data as ModelSpecData).modelId.trim();
		return mid || FACET_LABEL.modelSpec;
	}
	return FACET_LABEL[data.kind];
}
