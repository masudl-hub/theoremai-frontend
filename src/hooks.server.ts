import type { Handle } from '@sveltejs/kit';

/** Live WebSocket upgrade is handled in `/api/live/relay` GET (Cloudflare Pages). */
export const handle: Handle = async ({ event, resolve }) => resolve(event);
