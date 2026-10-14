import { cloudflareContext } from '../cloudflare';
import { homeStart } from '../lib/.server/api';
import type { Route } from './+types/api.home.start';

export function action({ request, context }: Route.ActionArgs) {
	return homeStart(request, context.get(cloudflareContext).env);
}
