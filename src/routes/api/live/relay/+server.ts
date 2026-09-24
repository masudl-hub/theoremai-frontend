import { env as privateEnv } from '$env/dynamic/private';
import { handleLiveRelay } from '$lib/server/live-relay';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request, platform }) =>
	handleLiveRelay(request, { ...privateEnv, ...(platform?.env ?? {}) });
