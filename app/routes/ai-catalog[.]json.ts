import { aiCatalog, discoveryResponse } from '../lib/.server/docs-mcp';
import type { Route } from './+types/ai-catalog[.]json';

export function loader({ request }: Route.LoaderArgs) {
	return discoveryResponse(aiCatalog(new URL(request.url).origin), 'application/ai-catalog+json');
}
