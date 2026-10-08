import { cloudflareContext } from '../cloudflare';
import { studioTurn } from '../lib/.server/api';
import type { Route } from './+types/api.studio.turn';

export function action({ request, context }: Route.ActionArgs) {
	return studioTurn(request, context.get(cloudflareContext).env);
}
