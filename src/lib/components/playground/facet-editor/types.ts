import type { FacetData } from '$lib/playground/types';

export type FacetPatch = (partial: Partial<FacetData>) => void;
