import { cloudflareContext } from '../cloudflare';
import { playgroundSteer } from '../lib/.server/api';
import type { Route } from './+types/api.playground.turn.steer';

export function action({ request, context }: Route.ActionArgs) {
	return playgroundSteer(request, context.get(cloudflareContext).env);
}
