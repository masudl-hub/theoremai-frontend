import { playgroundInvoke } from '$lib/server/api';
import { cloudflareContext } from '../cloudflare';
import type { Route } from './+types/api.playground.invoke';

export function action({ request, context }: Route.ActionArgs) {
	return playgroundInvoke(request, context.get(cloudflareContext).env);
}
