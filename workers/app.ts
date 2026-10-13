import { createRequestHandler, RouterContextProvider } from 'react-router';
import { cloudflareContext, type SiteEnv } from '../app/cloudflare';
import { handleLiveRelay } from '../app/lib/.server/live-relay';
import { withSecurityHeaders } from '../app/lib/.server/security-headers';
import {
	gateStudioRequest,
	LIVE_RELAY_PATH,
	spendAllowance,
} from '../app/lib/.server/studio-allowance';
import { allowanceStore } from '../app/lib/.server/studio-decide-allowance';

export { StudioDecideAllowance } from '../app/lib/.server/studio-decide-allowance';
export { StudioSteerInbox } from '../app/lib/.server/studio-steer';

const requestHandler = createRequestHandler(
	() => import('virtual:react-router/server-build'),
	import.meta.env.MODE,
);

/** The day's counts. The dev server counts nothing: a build never has DEV set, so a deploy always counts. */
function allowances(env: SiteEnv) {
	return env.DECIDE_ALLOWANCE && allowanceStore(env.DECIDE_ALLOWANCE);
}

async function respond(request: Request, env: SiteEnv, ctx: ExecutionContext): Promise<Response> {
	// The WebSocket upgrade answers with a 101 + socket pair, which only the
	// Worker can return — hand it over before React Router sees the request.
	if (new URL(request.url).pathname === LIVE_RELAY_PATH) {
		// A voice call spends one of the day's requests, and one of its calls on the site's keys.
		const admit = async () => {
			await spendAllowance(allowances(env), 'request', request);
			await spendAllowance(allowances(env), 'live', request);
		};
		return handleLiveRelay(request, env, import.meta.env.DEV ? {} : { admit });
	}
	// Every studio API request spends one of the visitor's and the site's day.
	const refused = import.meta.env.DEV ? null : await gateStudioRequest(request, allowances(env));
	if (refused) return refused;
	const context = new RouterContextProvider();
	context.set(cloudflareContext, { env, ctx });
	return requestHandler(request, context);
}

export default {
	async fetch(request, env, ctx) {
		return withSecurityHeaders(await respond(request, env, ctx));
	},
} satisfies ExportedHandler<SiteEnv>;
