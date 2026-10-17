import { cloudflareContext } from '../cloudflare';
import { studioServer } from '../lib/.server/studio-server';
import type { Route } from './+types/api.studio.$';

function serve({ request, context }: Route.ActionArgs | Route.LoaderArgs) {
	const { env, ctx } = context.get(cloudflareContext);
	return studioServer(env)(request, (work) => {
		ctx.waitUntil(work);
	});
}

export const action = serve;
/** Any other method gets the handler's own answer: 405 on a route it serves, 404 elsewhere. */
export const loader = serve;
