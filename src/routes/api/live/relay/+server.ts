import { env as privateEnv } from '$env/dynamic/private';
import { handleLiveRelay } from '$lib/server/live-relay';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, platform }) => {
	if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
		const liveEnv = { ...privateEnv, ...(platform?.env ?? {}) };
		return handleLiveRelay(request, liveEnv);
	}

	return new Response('WebSocket upgrade endpoint for THEORUM Gemini Live relay.', {
		status: 426,
		headers: {
			'content-type': 'text/plain',
			Upgrade: 'websocket',
		},
	});
};
