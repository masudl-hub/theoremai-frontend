/**
 * Chapter-row glyphs. Facet-backed chapters take FACET_ICON; the rest take
 * a single chrome icon. Headings stay bare.
 */

import { IconBook, IconCode, IconListSearch, IconPlayerPlay } from '@tabler/icons-react';
import { FACET_ICON } from '@theoremjs/studio/ui/lib/facet-icons.ts';

/** Keyed by top-level chapter; a sub-chapter takes its chapter's icon. */
const CHAPTER_ICON: Partial<Record<string, typeof IconBook>> = {
	start: IconBook,
	profiles: FACET_ICON.identity,
	tools: FACET_ICON.tools,
	guardrails: FACET_ICON.guardrails,
	providers: FACET_ICON.models,
	observability: FACET_ICON.observability,
	web: IconCode,
	studio: IconPlayerPlay,
	glossary: IconListSearch,
};

export function chapterIcon(id: string) {
	const group = id.replace(/^group:/, '').split('/')[0];
	return CHAPTER_ICON[id] ?? CHAPTER_ICON[group] ?? IconBook;
}
