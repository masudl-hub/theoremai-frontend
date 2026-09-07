/**
 * Vite plugin: serve `/api/live/relay` WebSocket upgrades during `vite dev`.
 *
 * SvelteKit + adapter-cloudflare handlers run in Node and do not receive browser
 * WebSocket upgrades (Vite owns the HTTP server; Workers `WebSocketPair` is absent).
 * Production Pages still uses `handleLiveRelay` in `+server.ts`.
 *
 * @module
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RELAY_PATH = '/api/live/relay';

function loadLocalEnv() {
	/** @type {Record<string, string>} */
	const env = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) env[key] = value;
	}
	for (const name of ['.env.local', '.env']) {
		const filePath = path.join(FRONTEND_ROOT, name);
		if (!existsSync(filePath)) continue;
		const raw = readFileSync(filePath, 'utf8');
		for (const line of raw.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const eq = trimmed.indexOf('=');
			if (eq <= 0) continue;
			const key = trimmed.slice(0, eq).trim();
			let value = trimmed.slice(eq + 1).trim();
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			if (env[key] === undefined) env[key] = value;
		}
	}
	return {
		GEMINI_API_KEY: env.GEMINI_API_KEY,
		GEMINI_API_KEY_FREE_A: env.GEMINI_API_KEY_FREE_A,
		GEMINI_API_KEY_FREE_B: env.GEMINI_API_KEY_FREE_B,
		GEMINI_API_KEY_FREE_C: env.GEMINI_API_KEY_FREE_C,
	};
}

/**
 * @returns {import('vite').Plugin}
 */
export function liveRelayDevPlugin() {
	return {
		name: 'theorum-live-relay-dev',
		configureServer(server) {
			const wss = new WebSocketServer({ noServer: true });
			const env = loadLocalEnv();

			server.httpServer?.on('upgrade', (req, socket, head) => {
				const host = req.headers.host || 'localhost';
				const url = new URL(req.url || '/', `http://${host}`);
				if (url.pathname !== RELAY_PATH) return;

				wss.handleUpgrade(req, socket, head, (/** @type {import('ws').WebSocket} */ ws) => {
					void (async () => {
						try {
							const mod = await server.ssrLoadModule('/src/lib/server/live-relay.ts');
							if (typeof mod.handleNodeLiveRelay !== 'function') {
								throw new Error('live-relay module missing handleNodeLiveRelay');
							}
							await mod.handleNodeLiveRelay(ws, url, env);
						} catch (err) {
							const message = err instanceof Error ? err.message : 'Live relay failed';
							try {
								ws.send(JSON.stringify({ type: 'error', error: message }));
							} catch {
								/* ignore */
							}
							try {
								ws.close(1011, 'relay failed');
							} catch {
								/* ignore */
							}
							server.config.logger.error(`[live-relay] ${message}`);
						}
					})();
				});
			});
		},
	};
}
