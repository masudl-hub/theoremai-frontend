import type { ProfileDefinition } from '@theoremjs/agents';
import type { StructuredRegistration, ToolRegistration } from '@theoremjs/studio';
import { studioScope as sharedScope } from '@theoremjs/studio/runtime';

export function studioScope(
	profile: ProfileDefinition,
	customTools: readonly ToolRegistration[],
	structured: StructuredRegistration | undefined,
) {
	return sharedScope(profile, customTools, structured, { mode: 'demo' });
}
