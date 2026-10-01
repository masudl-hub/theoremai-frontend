import type { ProfileDefinition } from '@theoremjs/agents';
import type { StructuredRegistration, ToolRegistration } from '@theoremjs/playground';
import { playgroundScope as sharedScope } from '@theoremjs/playground/runtime';

export function playgroundScope(
	profile: ProfileDefinition,
	customTools: readonly ToolRegistration[],
	structured: StructuredRegistration | undefined,
) {
	return sharedScope(profile, customTools, structured, { mode: 'demo' });
}
