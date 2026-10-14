import { cloudflareContext } from '../cloudflare';
import { studioConversation } from '../lib/.server/api';
import type { Route } from './+types/api.studio.conversation';

export function action({ request, context }: Route.ActionArgs) {
	return studioConversation(request, context.get(cloudflareContext).env);
}
