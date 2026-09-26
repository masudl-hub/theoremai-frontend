import { docIndex } from 'virtual:docs/index';
import type { DocIndex } from '../schema';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function getDocIndex(): DocIndex {
	if (!isRecord(docIndex) || !Array.isArray(docIndex.articles) || !isRecord(docIndex.bySlug)) {
		throw new Error('virtual:docs/index is not a DocIndex');
	}
	return docIndex as DocIndex;
}
