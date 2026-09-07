import type { Handle } from '@sveltejs/kit';

/**
 * Live WebSocket upgrades:
 * - Production (Cloudflare Pages): `src/routes/api/live/relay/+server.ts` → `handleLiveRelay`
 * - Local `vite dev`: `scripts/vite-live-relay-plugin.mjs` → `handleNodeLiveRelay`
 */
export const handle: Handle = async ({ event, resolve }) => resolve(event);
