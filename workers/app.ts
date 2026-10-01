import { createRequestHandler, RouterContextProvider } from 'react-router';
import { cloudflareContext, type SiteEnv } from '../app/cloudflare';
import { handleLiveRelay } from '../app/lib/.server/live-relay';
import { gatePlaygroundRequest } from '../app/lib/.server/playground-allowance';
import { allowanceStore } from '../app/lib/.server/playground-decide-allowance';

export { PlaygroundDecideAllowance } from '../app/lib/.server/playground-decide-allowance';
export { PlaygroundSteerInbox } from '../app/lib/.server/playground-steer';

const LIVE_RELAY_PATH = '/api/live/relay';

const requestHandler = createRequestHandler(
	() => import('virtual:react-router/server-build'),
	import.meta.env.MODE,
);

export default {
	async fetch(request, env, ctx) {
		// The WebSocket upgrade answers with a 101 + socket pair, which only the
		// Worker can return — hand it over before React Router sees the request.
		if (new URL(request.url).pathname === LIVE_RELAY_PATH) {
			return handleLiveRelay(request, env);
		}
		// Every playground API request spends one of the visitor's and the site's day.
		const refused = await gatePlaygroundRequest(
			request,
			env.DECIDE_ALLOWANCE && allowanceStore(env.DECIDE_ALLOWANCE),
		);
		if (refused) return refused;
		const context = new RouterContextProvider();
		context.set(cloudflareContext, { env, ctx });
		return requestHandler(request, context);
	},
} satisfies ExportedHandler<SiteEnv>;
