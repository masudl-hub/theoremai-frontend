import { docIndex } from 'virtual:docs/index';
import type { DocIndex } from '../schema';

/** Server-only door to the composed index, so the client bundle never inlines it. */
export function getDocIndex(): DocIndex {
	return docIndex;
}
