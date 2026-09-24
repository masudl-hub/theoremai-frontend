import { testConnection } from '$lib/server/test-connection';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request }) => testConnection(request);
