import { cloudflareContext } from '../cloudflare';
import { studioDecide } from '../lib/.server/studio-decide';
import type { Route } from './+types/api.studio.decide';

export function action({ request, context }: Route.ActionArgs) {
	return studioDecide(request, context.get(cloudflareContext).env);
}
