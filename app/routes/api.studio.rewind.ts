import { cloudflareContext } from '../cloudflare';
import { studioRewind } from '../lib/.server/api';
import type { Route } from './+types/api.studio.rewind';

export function action({ request, context }: Route.ActionArgs) {
	return studioRewind(request, context.get(cloudflareContext).env);
}
