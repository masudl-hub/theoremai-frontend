import { cloudflareContext } from '../cloudflare';
import { studioSteer } from '../lib/.server/api';
import type { Route } from './+types/api.studio.turn.steer';

export function action({ request, context }: Route.ActionArgs) {
	return studioSteer(request, context.get(cloudflareContext).env);
}
