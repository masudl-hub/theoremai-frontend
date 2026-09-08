import { badRequestJson, ndjsonEventStream } from '$lib/server/ndjson-stream';
import { resolvePlaygroundTurnEnv } from '$lib/server/playground-env';
import { streamPlaygroundInvoke } from '$lib/server/playground-turn';
import type { RequestHandler } from './$types';

type InvokeBody = {
	profile: import('theorum').ProfileDefinition;
	customTools?: import('$lib/playground/types').ToolRegistration[];
	structured?: import('$lib/playground/types').StructuredRegistration;
	name: string;
	input: unknown;
	resume?: { value?: unknown; granted?: boolean };
	sessionPermissions?: string[];
	credentials?: import('theorum').TurnRequest['credentials'];
	turnInput?: import('theorum').TurnInput;
	snapshot?: import('theorum/kernel').TurnToolSnapshot;
	promoted?: string[];
	model?: string;
	path?: string;
};

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body = (await request.json()) as InvokeBody;
		const env = resolvePlaygroundTurnEnv(platform?.env);
		return ndjsonEventStream(
			streamPlaygroundInvoke({
				profile: body.profile,
				customTools: body.customTools ?? [],
				structured: body.structured,
				request: {
					name: body.name,
					input: body.input,
					resume: body.resume,
					sessionPermissions: body.sessionPermissions,
					credentials: body.credentials,
					turnInput: body.turnInput,
					model: body.model,
					snapshot: body.snapshot,
					promoted: body.promoted,
					path: body.path,
				},
				env,
			}),
		);
	} catch (err) {
		return badRequestJson(err);
	}
};
