/**
 * Chapter-row glyphs. Facet-backed chapters take FACET_ICON; the rest take
 * the playground chrome already used for that surface. Headings stay bare.
 */

import {
	IconAdjustmentsHorizontal,
	IconBook,
	IconCode,
	IconLetterT,
	IconListTree,
} from '@tabler/icons-react';
import { FACET_ICON } from '../facet-icons';
import { DOC_SECTIONS, type DocSection } from './schema';

export const CHAPTER_ICON = {
	start: IconBook,
	runner: FACET_ICON.turnBehaviour,
	profiles: FACET_ICON.identity,
	tools: FACET_ICON.tools,
	guardrails: FACET_ICON.guardrails,
	observability: FACET_ICON.observability,
	providers: FACET_ICON.models,
	interface: IconCode,
	ui: IconLetterT,
	playground: IconListTree,
	host: IconAdjustmentsHorizontal,
	cli: FACET_ICON.outputs,
} satisfies Record<DocSection, typeof IconBook>;

export function chapterIcon(id: string) {
	return (DOC_SECTIONS as readonly string[]).includes(id)
		? CHAPTER_ICON[id as DocSection]
		: undefined;
}
