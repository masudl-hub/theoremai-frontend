import { json } from '@sveltejs/kit';
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
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				try {
					for await (const event of streamPlaygroundInvoke({
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
