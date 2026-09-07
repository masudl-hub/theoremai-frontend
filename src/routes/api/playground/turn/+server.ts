import { json } from '@sveltejs/kit';
import { resolvePlaygroundTurnEnv } from '$lib/server/playground-env';
import { streamPlaygroundTurn } from '$lib/server/playground-turn';
import type { RequestHandler } from './$types';

type TurnBody = {
	profile: import('theorum').ProfileDefinition;
	customTools?: import('$lib/playground/types').ToolRegistration[];
	structured?: import('$lib/playground/types').StructuredRegistration;
	previousInteractionId?: string;
	sessionPermissions?: string[];
	model?: string;
	effort?: string;
	input: import('theorum').TurnInput;
};

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body = (await request.json()) as TurnBody;
		const env = resolvePlaygroundTurnEnv(platform?.env);
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				try {
					for await (const event of streamPlaygroundTurn({
						profile: body.profile,
						customTools: body.customTools ?? [],
						structured: body.structured,
						input: body.input,
						previousInteractionId: body.previousInteractionId,
						sessionPermissions: body.sessionPermissions,
						model: body.model,
						effort: body.effort,
						env,
					})) {
						controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
					}
					controller.close();
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					controller.enqueue(
						encoder.encode(`${JSON.stringify({ type: 'error', error: message })}\n`),
					);
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				'content-type': 'application/x-ndjson; charset=utf-8',
				'cache-control': 'no-store',
			},
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return json({ error: message }, { status: 400 });
	}
};
