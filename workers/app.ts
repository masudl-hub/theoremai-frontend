import { createRequestHandler, RouterContextProvider } from 'react-router';
import { cloudflareContext, type SiteEnv } from '../app/cloudflare';
import { handleLiveRelay } from '../app/lib/.server/live-relay';

const LIVE_RELAY_PATH = '/api/live/relay';

const requestHandler = createRequestHandler(
	() => import('virtual:react-router/server-build'),
	import.meta.env.MODE,
);

export default {
	fetch(request, env, ctx) {
		// The WebSocket upgrade answers with a 101 + socket pair, which only the
		// Worker can return — hand it over before React Router sees the request.
		if (new URL(request.url).pathname === LIVE_RELAY_PATH) {
			return handleLiveRelay(request, env);
		}
		const context = new RouterContextProvider();
		context.set(cloudflareContext, { env, ctx });
		return requestHandler(request, context);
	},
} satisfies ExportedHandler<SiteEnv>;
