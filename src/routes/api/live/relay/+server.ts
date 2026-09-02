import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	return new Response('WebSocket upgrade endpoint for THEORUM Gemini Live relay.', {
		status: 426,
		headers: {
			'content-type': 'text/plain',
			Upgrade: 'websocket',
		},
	});
};
