import { createRequestHandler, RouterContextProvider } from 'react-router';
import { cloudflareContext, type SiteEnv } from '../app/cloudflare';
import { handleLiveRelay } from '../app/lib/.server/live-relay';
import { gateStudioRequest } from '../app/lib/.server/studio-allowance';
import { allowanceStore } from '../app/lib/.server/studio-decide-allowance';

export { StudioDecideAllowance } from '../app/lib/.server/studio-decide-allowance';
export { StudioSteerInbox } from '../app/lib/.server/studio-steer';

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
		// Every studio API request spends one of the visitor's and the site's day.
		// The dev server counts nothing: a build never has DEV set, so a deploy always counts.
		const refused = import.meta.env.DEV
			? null
			: await gateStudioRequest(
					request,
					env.DECIDE_ALLOWANCE && allowanceStore(env.DECIDE_ALLOWANCE),
				);
		if (refused) return refused;
		const context = new RouterContextProvider();
		context.set(cloudflareContext, { env, ctx });
		return requestHandler(request, context);
	},
} satisfies ExportedHandler<SiteEnv>;
