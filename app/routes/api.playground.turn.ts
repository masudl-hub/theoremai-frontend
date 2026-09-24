import { cloudflareContext } from '../cloudflare';
import { playgroundTurn } from '../lib/.server/api';
import type { Route } from './+types/api.playground.turn';

export function action({ request, context }: Route.ActionArgs) {
	return playgroundTurn(request, context.get(cloudflareContext).env);
}
