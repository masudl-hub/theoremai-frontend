import { json } from '@sveltejs/kit';
import { executePlaygroundLiveTool } from '$lib/server/playground-live-tool';
import type { RequestHandler } from './$types';

type LiveToolBody = {
	profile: import('theorum').ProfileDefinition;
	customTools?: import('$lib/playground/types').ToolRegistration[];
	name: string;
	input?: Record<string, unknown>;
	resume?: { value?: unknown; granted?: boolean };
	sessionPermissions?: string[];
	credentials?: import('theorum').TurnRequest['credentials'];
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as LiveToolBody;
		if (!body.name.trim()) {
			return json({ error: 'Tool name is required' }, { status: 400 });
		}

		const result = await executePlaygroundLiveTool({
			profile: body.profile,
			customTools: body.customTools ?? [],
			name: body.name,
			input: body.input ?? {},
			resume: body.resume,
			sessionPermissions: body.sessionPermissions,
			credentials: body.credentials,
		});

		return json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return json({ error: message }, { status: 400 });
	}
};
