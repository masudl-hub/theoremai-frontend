/**
 * Frontend adapter — demo seeds live in `@theoremai/playground`; this module only
 * adds canvas facet fields (`kind`, `expanded`) required by the graph editor.
 */
import type { PlaygroundInputsSpec, PlaygroundToolSeed } from '@theoremai/playground';
import {
	DEMO_ALLOWED_HOSTS,
	DEMO_CONCIERGE_SYSTEM,
	demoInputsSpec,
	demoToolSpecs,
} from '@theoremai/playground';
import type { InputsData, ToolSpecData } from './types';

export { DEMO_ALLOWED_HOSTS, DEMO_CONCIERGE_SYSTEM };

function inputsFromSpec(spec: PlaygroundInputsSpec): InputsData {
	return {
		kind: 'inputs',
		expanded: false,
		text: spec.text,
		attachmentsAccept: [...spec.attachmentsAccept],
		voiceAccept: [...spec.voiceAccept],
		maxFiles: spec.maxFiles,
		maxBytes: spec.maxBytes,
		maxTurnBytes: spec.maxTurnBytes,
	};
}

function toolSpecFromSeed(seed: PlaygroundToolSeed): { id: string; data: ToolSpecData } {
	return {
		id: seed.id,
		data: { kind: 'toolSpec', expanded: false, ...seed.data },
	};
}

/** Inputs facet seed — text, attachments, voice, and size limits enabled. */
export function demoInputsSeed(): InputsData {
	return inputsFromSpec(demoInputsSpec());
}

/** Tool facet seeds for the travel concierge demo (positions assigned by graph layout). */
export function demoToolSeeds(): { id: string; data: ToolSpecData }[] {
	return demoToolSpecs().map(toolSpecFromSeed);
}
