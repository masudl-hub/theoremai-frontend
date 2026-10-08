import { cloudflareContext } from '../cloudflare';
import { studioInvoke } from '../lib/.server/api';
import type { Route } from './+types/api.studio.invoke';

export function action({ request, context }: Route.ActionArgs) {
	return studioInvoke(request, context.get(cloudflareContext).env);
}
