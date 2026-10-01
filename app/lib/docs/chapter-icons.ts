/**
 * Chapter-row glyphs. Facet-backed chapters take FACET_ICON; the rest take
 * a single chrome icon. Headings stay bare.
 */

import { IconBook, IconCode, IconGitBranch, IconPlayerPlay } from '@tabler/icons-react';
import { FACET_ICON } from '../facet-icons';
import { DOC_SECTIONS, type DocSection } from './schema';

export const CHAPTER_ICON = {
	start: IconBook,
	modalities: IconGitBranch,
	identity: FACET_ICON.identity,
	models: FACET_ICON.models,
	tools: FACET_ICON.tools,
	inputs: FACET_ICON.inputs,
	outputs: FACET_ICON.outputs,
	'turn-behaviour': FACET_ICON.turnBehaviour,
	guardrails: FACET_ICON.guardrails,
	traces: FACET_ICON.observability,
	statuses: FACET_ICON.wording,
	runner: IconPlayerPlay,
	interface: IconCode,
} satisfies Record<DocSection, typeof IconBook>;

export function chapterIcon(id: string) {
	return (DOC_SECTIONS as readonly string[]).includes(id)
		? CHAPTER_ICON[id as DocSection]
		: undefined;
}
