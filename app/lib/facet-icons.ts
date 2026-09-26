/**
 * Playground tree icons for PROFILE_GRAPH facets. Docs chapters reuse this
 * map so a section does not grow a second glyph.
 */

import {
	IconActivity,
	IconBrain,
	IconFileExport,
	IconFileImport,
	IconGitBranch,
	IconId,
	IconMicrophone,
	IconPhoto,
	IconRepeat,
	IconShieldCheck,
	IconStack2,
	IconTool,
	IconVolume,
} from '@tabler/icons-react';
import type { PlaygroundNodeRef } from '@theoremai/playground';

export const FACET_ICON = {
	identity: IconId,
	models: IconStack2,
	modelBinding: IconBrain,
	tools: IconTool,
	inputs: IconFileImport,
	outputs: IconFileExport,
	turnBehaviour: IconRepeat,
	guardrails: IconShieldCheck,
	observability: IconActivity,
	image: IconPhoto,
	speech: IconVolume,
	live: IconMicrophone,
	decision: IconGitBranch,
} satisfies Record<Exclude<PlaygroundNodeRef['facet'], 'toolSpec'>, unknown>;
