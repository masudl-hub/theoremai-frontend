import { playgroundLiveRegister } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request }) => playgroundLiveRegister(request);
