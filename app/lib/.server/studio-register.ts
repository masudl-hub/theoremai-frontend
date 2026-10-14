import type { ProfileDefinition } from '@theoremjs/agents';
import type { StructuredRegistration, ToolRegistration } from '@theoremjs/studio';
import { studioScope as sharedScope } from '@theoremjs/studio/runtime';
import { SITE_KEYS } from '../studio-keys';

export function studioScope(
	profile: ProfileDefinition,
	customTools: readonly ToolRegistration[],
	structured: StructuredRegistration | undefined,
) {
	return sharedScope(profile, customTools, structured, { mode: 'demo', keys: SITE_KEYS });
}
