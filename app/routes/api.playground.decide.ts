import { cloudflareContext } from '../cloudflare';
import { playgroundDecide } from '../lib/.server/playground-decide';
import type { Route } from './+types/api.playground.decide';

export function action({ request, context }: Route.ActionArgs) {
	return playgroundDecide(request, context.get(cloudflareContext).env);
}
