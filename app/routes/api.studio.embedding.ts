import { cloudflareContext } from '../cloudflare';
import { studioEmbedding } from '../lib/.server/studio-embedding';
import type { Route } from './+types/api.studio.embedding';

export function action({ request, context }: Route.ActionArgs) {
	return studioEmbedding(request, context.get(cloudflareContext).env);
}
