import { badRequestJson, ndjsonEventStream } from '$lib/server/ndjson-stream';
import { resolvePlaygroundTurnEnv } from '$lib/server/playground-env';
import { streamPlaygroundTurn } from '$lib/server/playground-turn';
import type { RequestHandler } from './$types';

type TurnBody = {
	profile: import('@theoremai/agents').ProfileDefinition;
	customTools?: import('$lib/playground/types').ToolRegistration[];
	structured?: import('$lib/playground/types').StructuredRegistration;
	previousInteractionId?: string;
	sessionPermissions?: string[];
	model?: string;
	effort?: string;
	turnId?: string;
	input: import('@theoremai/agents').TurnInput;
};

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body = (await request.json()) as TurnBody;
		const env = resolvePlaygroundTurnEnv(platform?.env);
		return ndjsonEventStream(
			streamPlaygroundTurn({
				profile: body.profile,
				customTools: body.customTools ?? [],
				structured: body.structured,
				input: body.input,
				previousInteractionId: body.previousInteractionId,
				sessionPermissions: body.sessionPermissions,
				model: body.model,
				effort: body.effort,
				turnId: body.turnId,
				signal: request.signal,
				env,
			}),
		);
	} catch (err) {
		return badRequestJson(err);
	}
};
