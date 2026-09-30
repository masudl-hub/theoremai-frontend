import { cloudflareContext } from '../cloudflare';
import { playgroundCall } from '../lib/.server/api';
import type { Route } from './+types/api.playground.call';

export function action({ request, context }: Route.ActionArgs) {
	return playgroundCall(request, context.get(cloudflareContext).env);
}
