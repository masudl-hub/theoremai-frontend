import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { handleLiveRelay } from '$lib/server/live-relay';

export const handle: Handle = async ({ event, resolve }) => {
	if (
		event.url.pathname === '/api/live/relay' &&
		event.request.headers.get('Upgrade')?.toLowerCase() === 'websocket'
	) {
		const liveEnv = { ...env, ...(event.platform?.env ?? {}) };
		return handleLiveRelay(event.request, liveEnv);
	}

	return resolve(event);
};
