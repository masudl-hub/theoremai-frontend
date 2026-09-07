import type { ProfileDefinition, TurnEvent } from 'theorum';
import { invokeTool } from 'theorum';
import type { ToolCredential } from 'theorum/kernel';
import {
	type PlaygroundLiveToolResult,
	toolInvokeResultFromEvents,
} from '$lib/interface/playground-tool-result';
import type { ToolRegistration } from '$lib/playground/types';
import { registerPlaygroundProfile } from './playground-register';

export async function executePlaygroundLiveTool(args: {
	profile: ProfileDefinition;
	customTools: readonly ToolRegistration[];
	name: string;
	input: Record<string, unknown>;
	resume?: { value?: unknown; granted?: boolean };
	sessionPermissions?: string[];
	credentials?: Record<string, ToolCredential>;
}): Promise<PlaygroundLiveToolResult> {
	if (args.profile.type !== 'live') {
		throw new Error('Profile is not type live');
	}

	const registered = registerPlaygroundProfile(args.profile, args.customTools);
	const events: TurnEvent[] = [];

	for await (const event of invokeTool({
		profile: registered.id,
		name: args.name,
		input: args.input,
		resume: args.resume,
		sessionPermissions: args.sessionPermissions,
		credentials: args.credentials,
	})) {
		events.push(event);
	}

	return toolInvokeResultFromEvents(events, args.name, args.input);
}
