import { createRequestHandler, RouterContextProvider } from 'react-router';
import { cloudflareContext, type SiteEnv } from '../app/cloudflare';
import { pruneProbeLog } from '../app/lib/.server/guardrail-probe';
import { handleLiveRelay } from '../app/lib/.server/live-relay';
import { withSecurityHeaders } from '../app/lib/.server/security-headers';
import { gateRequest, LIVE_RELAY_PATH, spendAllowance } from '../app/lib/.server/studio-allowance';
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

/** An agent asked for Markdown by name; a browser's catch-all never does. */
function wantsMarkdown(request: Request): boolean {
	return (
		(request.method === 'GET' || request.method === 'HEAD') &&
		(request.headers.get('accept') ?? '').includes('text/markdown')
	);
}

async function respond(request: Request, env: SiteEnv, ctx: ExecutionContext): Promise<Response> {
	if (wantsMarkdown(request)) {
		const { markdownTwin } = await import('../app/lib/docs/.server/markdown-twin');
		const twin = markdownTwin(new URL(request.url));
		if (twin) return twin;
	}
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
	// Every studio API and docs MCP request spends one of the visitor's and the site's day.
	const refused = import.meta.env.DEV ? null : await gateRequest(request, allowances(env));
	if (refused) return refused;
	const context = new RouterContextProvider();
	context.set(cloudflareContext, { env, ctx });
	return requestHandler(request, context);
}

export default {
	async fetch(request, env, ctx) {
		const response = withSecurityHeaders(await respond(request, env, ctx));
		// The workers.dev address serves the same pages as the site's own domain: only the domain is indexed.
		if (response.status !== 101 && new URL(request.url).hostname.endsWith('.workers.dev')) {
			response.headers.set('X-Robots-Tag', 'noindex');
		}
		// A page answers in HTML or, when asked, Markdown: a cache keeps the two apart.
		if (response.headers.get('content-type')?.startsWith('text/html')) {
			response.headers.append('Vary', 'Accept');
		}
		return response;
	},
	// Once a day (`wrangler.jsonc` `triggers`): no kept probe outlives its days.
	scheduled(_controller, env, ctx) {
		if (env.PROBE_LOG) ctx.waitUntil(pruneProbeLog(env.PROBE_LOG, new Date()));
	},
} satisfies ExportedHandler<SiteEnv>;
