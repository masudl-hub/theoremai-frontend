import { cloudflareContext } from '../cloudflare';
import { studioServer } from '../lib/.server/studio-server';
import type { Route } from './+types/api.studio.$';

export function action({ request, context }: Route.ActionArgs) {
	const { env, ctx } = context.get(cloudflareContext);
	return studioServer(env)(request, (work) => {
		ctx.waitUntil(work);
	});
}
