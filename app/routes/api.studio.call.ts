import { cloudflareContext } from '../cloudflare';
import { studioCall } from '../lib/.server/api';
import type { Route } from './+types/api.studio.call';

export function action({ request, context }: Route.ActionArgs) {
	return studioCall(request, context.get(cloudflareContext).env);
}
