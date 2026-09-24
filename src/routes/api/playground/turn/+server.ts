import { playgroundTurn } from '$lib/server/api';
import { resolvePlaygroundTurnEnv } from '$lib/server/playground-env';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request, platform }) =>
	playgroundTurn(request, resolvePlaygroundTurnEnv(platform?.env));
